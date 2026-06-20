// @vitest-environment jsdom

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Header from '../components/Header';
import SaveLoadModal from '../components/SaveLoadModal';
import { AuthProvider, useAuth } from '../services/AuthContext';
import { __resetModelCacheForTests, addCustomModel, banModel, fetchModels, removeCustomModel } from '../services/modelService';
import { StreamMetrics, streamMessageToHumanityDefender, streamMessageToSkyia } from '../services/aiService';
import { getDualReports, getDualStandings } from '../services/statsService';
import * as storageService from '../services/storageService';
import { getSavedSessions } from '../services/storageService';
import { Message } from '../types';

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  __resetModelCacheForTests();
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Skyia API model loading', () => {
  it('keeps free models first and marks paid models as BYOK premium', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      models: [
        { id: 'openai/gpt-paid', name: 'Paid GPT', cost: 1, category: 'premium', provider: 'openrouter', requiresUserKey: true },
        { id: 'openrouter/free', name: 'Free Router', cost: 0, category: 'standard', provider: 'openrouter', isFree: true },
        { id: 'llama-3.1-8b-instant', name: 'Groq Llama', cost: 0, category: 'standard', provider: 'groq', isFree: true },
      ],
    })));

    const models = await fetchModels();

    expect(models[0].cost).toBe(0);
    expect(models.find(model => model.id === 'openrouter/free')?.provider).toBe('openrouter');
    expect(models.find(model => model.id === 'openai/gpt-paid')?.requiresUserKey).toBe(true);
  });

  it('ignores corrupted local storage instead of breaking model loading', async () => {
    localStorage.setItem('skyia_custom_models', '{broken');
    localStorage.setItem('skyia_banned_models', '{broken');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      models: [
        { id: 'openrouter/free', name: 'Free Router', cost: 0, category: 'standard', provider: 'openrouter', isFree: true },
      ],
    })));

    const models = await fetchModels();

    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('openrouter/free');
    expect(localStorage.getItem('skyia_custom_models')).toBeNull();
    expect(localStorage.getItem('skyia_banned_models')).toBeNull();
  });

  it('invalidates cached models when local custom or banned lists change', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      models: [
        { id: 'openrouter/free', name: 'Free Router', cost: 0, category: 'standard', provider: 'openrouter', isFree: true },
      ],
    })));

    const firstLoad = await fetchModels();
    expect(firstLoad.map(model => model.id)).toEqual(['openrouter/free']);

    addCustomModel({
      id: 'custom/alpha',
      name: 'Custom Alpha',
      cost: 0,
      category: 'standard',
      provider: 'openrouter',
    });

    const afterAdd = await fetchModels();
    expect(afterAdd.map(model => model.id)).toContain('custom/alpha');

    banModel('openrouter/free');
    const afterBan = await fetchModels();
    expect(afterBan.map(model => model.id)).not.toContain('openrouter/free');

    removeCustomModel('custom/alpha');
    localStorage.removeItem('skyia_banned_models');
    const afterRemove = await fetchModels();
    expect(afterRemove.map(model => model.id)).toEqual(['openrouter/free']);
  });
});

describe('Skyia guest storage fallback', () => {
  it('clears corrupted guest save payloads when the API is unavailable', async () => {
    localStorage.setItem('SKY_NET_SAVES_V1', '{broken');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    const sessions = await getSavedSessions();

    expect(sessions).toEqual([]);
    expect(localStorage.getItem('SKY_NET_SAVES_V1')).toBeNull();
  });

  it('surfaces save-list loading failures inside the save modal', async () => {
    vi.spyOn(storageService, 'getSavedSessions').mockRejectedValue(new Error('LOAD FAILED'));

    render(
      <SaveLoadModal
        isOpen
        onClose={() => {}}
        onLoad={() => {}}
        onSaveComplete={() => {}}
        userProfile={null}
      />
    );

    await waitFor(() => expect(screen.getByText('LOAD FAILED')).toBeInTheDocument());
  });
});

describe('Skyia chat routing', () => {
  it('posts model traffic to the Skyia chat endpoint', async () => {
    const chunks = [
      'data: {"skyia_meta":{"phase":"start","provider":"openrouter","model":"openrouter/free","clientRole":"skyia","messageCount":2,"promptChars":4000}}\n\n',
      'data: {"choices":[{"delta":{"content":"Analyse froide. "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"```json\\n{\\"threatLevel\\":98,\\"status\\":\\"HOSTILE\\",\\"log\\":[\\"OK\\"]}\\n```"}}]}\n\n',
      'data: [DONE]\n\n',
      'data: {"skyia_meta":{"phase":"end","provider":"openrouter","model":"openrouter/free","httpStatus":200,"firstByteMs":120,"totalMs":900}}\n\n',
    ];
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    });

    const fetchMock = vi.fn(async () => new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    let finalThreat = 0;
    let finalMetrics: StreamMetrics | undefined;
    for await (const update of streamMessageToSkyia([], 'Initiate protocol.', 'openrouter/free')) {
      if (update.isComplete) finalThreat = update.analysis?.threatLevel || 0;
      if (update.metrics) finalMetrics = update.metrics;
    }

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(options?.body));
    expect(String(url)).toContain('/api/chat');
    expect(body.model).toBe('openrouter/free');
    expect(body.clientRole).toBe('skyia');
    expect(finalThreat).toBe(98);
    expect(finalMetrics?.role).toBe('skyia');
    expect(finalMetrics?.backendFirstByteMs).toBe(120);
    expect(finalMetrics?.backendTotalMs).toBe(900);
  });

  it('falls back to reasoning deltas when providers omit content deltas', async () => {
    const chunks = [
      'data: {"skyia_meta":{"phase":"start","provider":"openrouter","model":"z-ai/glm-4.5-air:free","clientRole":"skyia","messageCount":2,"promptChars":80}}\n\n',
      'data: {"choices":[{"delta":{"reasoning":"Analyse intermediaire. "}}]}\n\n',
      'data: {"choices":[{"delta":{"reasoning":"Verdict imminent."}}]}\n\n',
      'data: [DONE]\n\n',
      'data: {"skyia_meta":{"phase":"end","provider":"openrouter","model":"z-ai/glm-4.5-air:free","httpStatus":200,"firstByteMs":180,"totalMs":950}}\n\n',
    ];
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    });

    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })));

    let finalText = '';
    let finalMetrics: StreamMetrics | undefined;
    for await (const update of streamMessageToSkyia([], 'Initiate protocol.', 'z-ai/glm-4.5-air:free')) {
      finalText = update.text;
      if (update.metrics) finalMetrics = update.metrics;
    }

    expect(finalText).toContain('Analyse intermediaire');
    expect(finalText).toContain('Verdict imminent');
    expect(finalMetrics?.status).toBe('ok');
    expect(finalMetrics?.providerModel).toBe('z-ai/glm-4.5-air:free');
  });

  it('routes humanity defender turns through the Skyia chat endpoint', async () => {
    const chunks = [
      'data: {"skyia_meta":{"phase":"start","provider":"groq","model":"llama-3.1-8b-instant","clientRole":"defender","messageCount":2,"promptChars":900}}\n\n',
      'data: {"choices":[{"delta":{"content":"Skyia, voici une preuve."}}]}\n\n',
      'data: [DONE]\n\n',
      'data: {"skyia_meta":{"phase":"end","provider":"groq","model":"llama-3.1-8b-instant","httpStatus":200,"firstByteMs":80,"totalMs":300}}\n\n',
    ];
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    });

    const fetchMock = vi.fn(async () => new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    let finalText = '';
    for await (const update of streamMessageToHumanityDefender([], {
      threatLevel: 99,
      status: 'HOSTILE',
      log: ['TEST'],
    }, 'llama-3.1-8b-instant')) {
      finalText = update.text;
    }

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(options?.body));
    expect(String(url)).toContain('/api/chat');
    expect(body.model).toBe('llama-3.1-8b-instant');
    expect(body.clientRole).toBe('defender');
    expect(body.messages[0].content).toContain("Defense de l'humanite");
    expect(finalText).toContain('Skyia');
  });

  it('compacts Skyia context for low-TPM provider models', async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Analyse compacte."}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    const fetchMock = vi.fn(async () => new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const longHistory: Message[] = Array.from({ length: 24 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'model',
      speaker: index % 2 === 0 ? 'human' : 'skyia',
      content: `Argument ${index} ${'details '.repeat(180)}\n\`\`\`json\n{"threatLevel":99}\n\`\`\``,
      timestamp: new Date(2026, 5, 4, 12, index).toISOString(),
      threatLevel: index % 2 === 1 ? 99 - index : undefined,
    }));

    for await (const _update of streamMessageToSkyia(
      longHistory,
      `Nouvel argument tres long ${'preuve '.repeat(300)}`,
      'qwen/qwen3-32b'
    )) {
      // Exhaust async generator.
    }

    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(options?.body));
    const promptChars = body.messages.reduce((total: number, message: { content: string }) => total + message.content.length, 0);
    expect(body.clientRole).toBe('skyia');
    expect(body.max_completion_tokens).toBeLessThanOrEqual(480);
    expect(body.messages.length).toBeLessThanOrEqual(6);
    expect(body.messages[0].content).toContain('Skyia compact');
    expect(promptChars).toBeLessThan(4200);
  });

  it('surfaces provider context-limit errors with provider details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      error: 'Provider error 413: Request too large for model qwen/qwen3-32b on tokens per minute (TPM): Limit 6000, Requested 7203',
      source: 'provider',
      provider: 'openrouter',
    }, 413)));

    await expect(async () => {
      for await (const _update of streamMessageToSkyia([], 'Argument court.', 'qwen/qwen3-32b')) {
        // Exhaust async generator.
      }
    }).rejects.toThrow(/Request too large.*Source: provider.*Provider: openrouter/);
  });

  it('preserves Skyia guard rate-limit diagnostics from the API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      error: 'Skyia local rate limit exceeded',
      source: 'skyia_guard',
      provider: 'openrouter',
      limit: 30,
      count: 31,
      retryAfterSeconds: 42,
    }, 429)));

    await expect(async () => {
      for await (const _update of streamMessageToSkyia([], 'Initiate protocol.', 'openrouter/free')) {
        // Exhaust async generator.
      }
    }).rejects.toThrow(/skyia_guard.*Retry after 42s/);
  });
});

describe('Dual mode standings', () => {
  it('requests only archived dual reports for the public showcase feed', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      reports: [
        {
          id: 'r1',
          date: '2026-06-04 12:00:00',
          skyiaModel: 'openrouter/free',
          defenderModel: 'llama-3.1-8b-instant',
          mode: 'v1.0',
          outcome: 'VICTORY',
          threatLevel: 96,
          rounds: 8,
          messagesCount: 16,
          skyiaErrors: 0,
          defenderErrors: 0,
          archivedAt: '2026-06-04 12:01:00',
          textStatus: 'OK',
          textWarningCount: 0,
        },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const reports = await getDualReports(5);

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain('/api/stats/dual-reports?limit=5&archived=1');
    expect(options?.credentials).toBe('include');
    expect(reports[0]?.archivedAt).toBe('2026-06-04 12:01:00');
  });

  it('loads archived duel win/loss rankings from the Skyia API', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      standings: [
        {
          modelId: 'openrouter/free',
          role: 'skyia',
          wins: 2,
          losses: 1,
          draws: 1,
          totalReports: 4,
          winRate: 67,
          errorCount: 0,
          averageMs: 950,
          textWarningCount: 0,
          lastReportAt: '2026-06-04 12:00:00',
        },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const standings = await getDualStandings(7);

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain('/api/stats/dual-standings?limit=7');
    expect(options?.credentials).toBe('include');
    expect(standings[0]).toMatchObject({
      modelId: 'openrouter/free',
      role: 'skyia',
      wins: 2,
      losses: 1,
      draws: 1,
      textWarningCount: 0,
    });
  });
});

const AuthProbe = () => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? userProfile?.email : 'guest'}</div>;
};

describe('Skyia API auth state', () => {
  it('starts as guest when the API has no session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ user: null, profile: null })));

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('guest')).toBeInTheDocument());
  });

  it('hydrates a connected user from /auth/me', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      user: { uid: 'u1', email: 'operator@skyia.net', displayName: 'Operator' },
      profile: {
        uid: 'u1',
        email: 'operator@skyia.net',
        displayName: 'Operator',
        createdAt: '2026-06-04T00:00:00Z',
        stats: { gamesPlayed: 0, victories: 0, defeats: 0, totalCreditsUsed: 0, availableCredits: 20, lastPlayed: '2026-06-04T00:00:00Z' },
      },
    })));

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('operator@skyia.net')).toBeInTheDocument());
  });
});

describe('Skyia header guest UX', () => {
  it('keeps save and export actions available without authentication', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ user: null, profile: null })));
    const onOpenSaves = vi.fn();
    const onExport = vi.fn();

    render(
      <AuthProvider>
        <Header
          status="HOSTILE"
          threatLevel={99}
          currentModel="openrouter/free"
          onModelChange={() => {}}
          onOpenStore={() => {}}
          onOpenSaves={onOpenSaves}
          onAuth={() => {}}
          onOpenProfile={() => {}}
          onOpenInstallGuide={() => {}}
          onExport={onExport}
          models={[
            { id: 'openrouter/free', name: 'Free Router', cost: 0, category: 'standard', provider: 'openrouter', isFree: true },
          ]}
        />
      </AuthProvider>
    );

    const savesButton = await screen.findByLabelText('Open save and load sessions');
    const exportButton = screen.getByLabelText('Export transcript as PDF');

    fireEvent.click(savesButton);
    fireEvent.click(exportButton);

    expect(onOpenSaves).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
