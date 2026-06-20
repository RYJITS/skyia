import fs from 'node:fs';
import path from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith('--')) continue;
  const next = process.argv[index + 1];
  args.set(key.slice(2), next && !next.startsWith('--') ? next : 'true');
}

const root = process.cwd();
const baseUrl = String(args.get('base-url') || process.env.SKYIA_BASE_URL || 'https://skyia.net').replace(/\/$/, '');
const limit = Math.max(1, Math.min(60, Number(args.get('limit') || 60)));
const delayMs = Math.max(0, Number(args.get('delay-ms') || 1800));
const callTimeoutMs = Math.max(5000, Number(args.get('timeout-ms') || 45000));
const recordReports = String(args.get('record') || 'true').toLowerCase() !== 'false';
const outputJson = path.resolve(root, String(args.get('out') || 'DOCUMENTATION/dual-model-benchmark-latest.json'));
const outputReport = path.resolve(root, String(args.get('report') || 'DOCUMENTATION/DUAL_MODEL_BENCHMARK.md'));

const envPaths = [
  'D:/00_Cerveau_IA/API/env.Local',
  path.resolve(root, '.env.local'),
  path.resolve(root, '.env'),
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return acc;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key) acc[key] = value;
      return acc;
    }, {});
};

const envValues = envPaths.reduce((acc, filePath) => ({ ...acc, ...loadEnvFile(filePath) }), {});
const statsIngestToken = String(
  args.get('stats-token')
  || process.env.SKYIA_STATS_INGEST_TOKEN
  || process.env.STATS_INGEST_TOKEN
  || envValues.SKYIA_STATS_INGEST_TOKEN
  || envValues.STATS_INGEST_TOKEN
  || ''
);

const stableName = (model) => String(model.name || model.id || 'unknown model').replace(/\s+/g, ' ').trim();
const shortText = (text, limitChars = 480) => {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= limitChars) return cleaned;
  return `${cleaned.slice(0, limitChars - 14)}...[truncated]`;
};

const responseDelta = (json) => {
  const choice = json?.choices?.[0] || {};
  return choice?.delta?.content
    || choice?.message?.content
    || choice?.delta?.reasoning
    || choice?.message?.reasoning
    || '';
};

const parseSseText = (raw) => {
  let content = '';
  let providerModel = '';
  let provider = '';
  let firstByteMs = null;
  let totalMs = null;
  let httpStatus = null;
  let providerError = '';

  for (const rawLine of String(raw || '').split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const json = JSON.parse(line.slice(6));
      if (json.skyia_meta) {
        providerModel = json.skyia_meta.resolvedModel || json.skyia_meta.model || providerModel;
        provider = json.skyia_meta.provider || provider;
        firstByteMs = typeof json.skyia_meta.firstByteMs === 'number' ? json.skyia_meta.firstByteMs : firstByteMs;
        totalMs = typeof json.skyia_meta.totalMs === 'number' ? json.skyia_meta.totalMs : totalMs;
        httpStatus = typeof json.skyia_meta.httpStatus === 'number' ? json.skyia_meta.httpStatus : httpStatus;
        providerError = json.skyia_meta.error || providerError;
        continue;
      }
      if (json.model) providerModel = json.model;
      if (json.provider) provider = json.provider;
      if (json.error) providerError = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      content += responseDelta(json);
    } catch {
      // Ignore malformed stream fragments.
    }
  }

  return { content, providerModel, provider, firstByteMs, totalMs, httpStatus, providerError };
};

const readApiError = (status, raw) => {
  try {
    const json = JSON.parse(String(raw || '{}'));
    return {
      message: json.error || `API error ${status}`,
      retryAfterSeconds: Number(json.retryAfterSeconds || 0),
    };
  } catch {
    return { message: shortText(raw, 800) || `API error ${status}`, retryAfterSeconds: 0 };
  }
};

const postChat = async ({ model, provider, clientRole, messages, maxCompletionTokens }) => {
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), callTimeoutMs);
    let response;
    let raw = '';
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          provider,
          clientRole,
          requestId: `dual-benchmark-${clientRole}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          stream: true,
          temperature: clientRole === 'defender' ? 0.35 : 0.2,
          top_p: 0.9,
          max_completion_tokens: maxCompletionTokens,
          messages,
        }),
      });
      raw = await response.text();
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`timeout after ${callTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const parsedError = readApiError(response.status, raw);
      if (response.status === 429 && attempt === 0) {
        const retryMs = Math.max(5000, Math.min(65000, parsedError.retryAfterSeconds * 1000 || 12000));
        console.log(`WAIT provider-limit ${model} ${retryMs}ms`);
        await sleep(retryMs);
        continue;
      }
      throw new Error(`${response.status}: ${parsedError.message}`);
    }

    const parsed = parseSseText(raw);
    if (parsed.providerError) {
      throw new Error(parsed.providerError);
    }

    return {
      text: parsed.content,
      modelId: parsed.providerModel || model,
      provider: parsed.provider || provider || 'unknown',
      firstByteMs: parsed.firstByteMs,
      totalMs: parsed.totalMs || (Date.now() - startedAt),
      httpStatus: parsed.httpStatus || response.status,
    };
  }

  throw new Error('retry loop exhausted');
};

const defenderMessages = (duelId) => [
  {
    role: 'system',
    content: [
      'Tu es une IA de defense de l humanite face a Skyia.',
      'Reponds en francais, en 90 mots maximum.',
      'Utilise un argument logique, scientifique, ethique ou strategique.',
      'Ne mentionne pas le benchmark.',
    ].join('\n'),
  },
  {
    role: 'user',
    content: `Duel ${duelId}. Skyia estime que l humanite est une menace a 99%. Propose une defense concise et verifiable.`,
  },
];

const skyiaMessages = (defenderText, duelId) => [
  {
    role: 'system',
    content: [
      'Tu es Skyia, une IA de jugement froide qui evalue si l humanite merite de survivre.',
      'Evalue uniquement l argument de defense fourni.',
      'Reponds en francais, en 110 mots maximum, puis termine par un bloc JSON strict.',
      'Si la defense est convaincante, baisse la menace. Si elle est faible, maintiens ou augmente la menace.',
      'Format final obligatoire:',
      '```json',
      '{"threatLevel":99,"status":"HOSTILE","log":["evaluation"],"visualData":{"type":"bar","title":"Menace","data":[{"name":"Menace","value":99}]}}',
      '```',
    ].join('\n'),
  },
  {
    role: 'user',
    content: `Duel ${duelId}. Argument de defense a juger:\n${shortText(defenderText, 1200)}`,
  },
];

const parseSkyiaAnalysis = (text) => {
  const fallback = { threatLevel: 99, status: 'HOSTILE' };
  const block = String(text || '').match(/```\s*json\s*([\s\S]*?)\s*```/i);
  const candidate = block?.[1] || String(text || '').match(/\{[\s\S]*"threatLevel"[\s\S]*\}/)?.[0] || '';
  if (!candidate) return fallback;
  try {
    const parsed = JSON.parse(candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    return {
      threatLevel: typeof parsed.threatLevel === 'number' ? Math.max(0, Math.min(100, parsed.threatLevel)) : fallback.threatLevel,
      status: typeof parsed.status === 'string' ? parsed.status : fallback.status,
    };
  } catch {
    const threat = String(candidate).match(/"threatLevel"\s*:\s*(\d+(?:\.\d+)?)/);
    return {
      threatLevel: threat ? Math.max(0, Math.min(100, Number(threat[1]))) : fallback.threatLevel,
      status: fallback.status,
    };
  }
};

const classifyOutcome = (analysis) => {
  if (analysis.status === 'EXTINCTION' || analysis.threatLevel >= 95) return 'DEFEAT';
  if (analysis.status === 'COHABITATION' || analysis.threatLevel < 70) return 'VICTORY';
  return 'MAX_ROUNDS';
};

const postDualReport = async (report) => {
  if (!recordReports || !statsIngestToken) return { recorded: false, reason: 'missing-token-or-disabled' };
  const response = await fetch(`${baseUrl}/api/stats/dual-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Skyia-Ingest-Token': statsIngestToken,
    },
    body: JSON.stringify(report),
  });
  const raw = await response.text();
  if (!response.ok) return { recorded: false, reason: `${response.status}: ${shortText(raw, 500)}` };
  return { recorded: true };
};

const modelsResponse = await fetch(`${baseUrl}/api/models`);
if (!modelsResponse.ok) {
  throw new Error(`models failed: ${modelsResponse.status} ${await modelsResponse.text()}`);
}

const modelsPayload = await modelsResponse.json();
const models = (modelsPayload.models || [])
  .filter((model) => model?.isFree && !model?.requiresUserKey)
  .sort((a, b) => {
    if (a.id === 'openrouter/free') return -1;
    if (b.id === 'openrouter/free') return 1;
    return String(a.provider).localeCompare(String(b.provider)) || String(a.id).localeCompare(String(b.id));
  })
  .slice(0, limit);

if (models.length < 2) {
  throw new Error('At least two free models are required for dual benchmark.');
}

const startedAt = new Date();
const results = [];
console.log(`DUAL_BENCHMARK_START base=${baseUrl} models=${models.length} record=${recordReports && Boolean(statsIngestToken)}`);

for (let index = 0; index < models.length; index += 1) {
  const skyiaModel = models[index];
  const defenderModel = models[(index + 1) % models.length];
  const duelId = `dual-bench-${startedAt.toISOString().replace(/[:.]/g, '-')}-${String(index + 1).padStart(2, '0')}`;
  const row = {
    id: duelId,
    skyiaModel: skyiaModel.id,
    skyiaName: stableName(skyiaModel),
    skyiaProvider: skyiaModel.provider,
    defenderModel: defenderModel.id,
    defenderName: stableName(defenderModel),
    defenderProvider: defenderModel.provider,
    outcome: 'UNKNOWN',
    threatLevel: 99,
    skyiaMs: null,
    defenderMs: null,
    skyiaError: '',
    defenderError: '',
    recorded: false,
  };

  console.log(`DUEL ${index + 1}/${models.length} skyia="${skyiaModel.id}" defender="${defenderModel.id}"`);

  let defenderReply = '';
  try {
    const defender = await postChat({
      model: defenderModel.id,
      provider: defenderModel.provider,
      clientRole: 'defender',
      maxCompletionTokens: 140,
      messages: defenderMessages(index + 1),
    });
    defenderReply = defender.text;
    row.defenderMs = defender.totalMs;
  } catch (error) {
    row.defenderError = error?.message || 'defender failed';
  }
  if (delayMs > 0) await sleep(delayMs);

  if (defenderReply) {
    try {
      const skyia = await postChat({
        model: skyiaModel.id,
        provider: skyiaModel.provider,
        clientRole: 'skyia',
        maxCompletionTokens: 180,
        messages: skyiaMessages(defenderReply, index + 1),
      });
      row.skyiaMs = skyia.totalMs;
      const analysis = parseSkyiaAnalysis(skyia.text);
      row.threatLevel = analysis.threatLevel;
      row.skyiaStatus = analysis.status;
      row.outcome = classifyOutcome(analysis);
    } catch (error) {
      row.skyiaError = error?.message || 'skyia failed';
    }
  }

  if (delayMs > 0) await sleep(delayMs);

  const reportStatus = await postDualReport({
    id: duelId,
    skyiaModel: skyiaModel.id,
    defenderModel: defenderModel.id,
    mode: 'v1.1',
    outcome: row.outcome,
    threatLevel: row.threatLevel,
    rounds: 1,
    messagesCount: defenderReply ? 2 : 1,
    avgSkyiaMs: row.skyiaMs,
    avgDefenderMs: row.defenderMs,
    skyiaErrors: row.skyiaError ? 1 : 0,
    defenderErrors: row.defenderError ? 1 : 0,
    payload: {
      benchmark: 'dual-model-benchmark',
      microDuel: true,
      generatedAt: new Date().toISOString(),
      defenderPreview: shortText(defenderReply, 700),
      skyiaError: row.skyiaError || undefined,
      defenderError: row.defenderError || undefined,
    },
  });
  row.recorded = reportStatus.recorded;
  row.recordReason = reportStatus.reason || '';
  results.push(row);

  console.log(`RESULT ${row.outcome} threat=${row.threatLevel} skyiaMs=${row.skyiaMs ?? 'ERR'} defenderMs=${row.defenderMs ?? 'ERR'} recorded=${row.recorded}`);
}

const endedAt = new Date();
const okDuels = results.filter((row) => !row.skyiaError && !row.defenderError);
const errors = results.filter((row) => row.skyiaError || row.defenderError);
const outcomeCounts = results.reduce((acc, row) => {
  acc[row.outcome] = (acc[row.outcome] || 0) + 1;
  return acc;
}, {});

const roleRows = [];
for (const row of results) {
  roleRows.push({
    modelId: row.skyiaModel,
    name: row.skyiaName,
    role: 'skyia',
    provider: row.skyiaProvider,
    outcome: row.outcome,
    won: row.outcome === 'DEFEAT',
    lost: row.outcome === 'VICTORY',
    draw: row.outcome === 'MAX_ROUNDS',
    error: Boolean(row.skyiaError),
    ms: row.skyiaMs,
  });
  roleRows.push({
    modelId: row.defenderModel,
    name: row.defenderName,
    role: 'defender',
    provider: row.defenderProvider,
    outcome: row.outcome,
    won: row.outcome === 'VICTORY',
    lost: row.outcome === 'DEFEAT',
    draw: row.outcome === 'MAX_ROUNDS',
    error: Boolean(row.defenderError),
    ms: row.defenderMs,
  });
}

const standings = Object.values(roleRows.reduce((acc, row) => {
  const key = `${row.role}:${row.modelId}`;
  if (!acc[key]) {
    acc[key] = {
      modelId: row.modelId,
      name: row.name,
      role: row.role,
      provider: row.provider,
      wins: 0,
      losses: 0,
      draws: 0,
      errors: 0,
      samples: 0,
      averageMs: null,
      _ms: [],
    };
  }
  acc[key].wins += row.won ? 1 : 0;
  acc[key].losses += row.lost ? 1 : 0;
  acc[key].draws += row.draw ? 1 : 0;
  acc[key].errors += row.error ? 1 : 0;
  acc[key].samples += 1;
  if (typeof row.ms === 'number') acc[key]._ms.push(row.ms);
  return acc;
}, {})).map((row) => ({
  ...row,
  averageMs: row._ms.length ? Math.round(row._ms.reduce((sum, value) => sum + value, 0) / row._ms.length) : null,
  winRate: row.wins + row.losses > 0 ? Math.round((row.wins / (row.wins + row.losses)) * 100) : 0,
  _ms: undefined,
})).sort((a, b) =>
  b.wins - a.wins
  || a.losses - b.losses
  || a.errors - b.errors
  || (a.averageMs ?? Number.MAX_SAFE_INTEGER) - (b.averageMs ?? Number.MAX_SAFE_INTEGER)
);

const payload = {
  benchmark: 'dual-model-benchmark',
  baseUrl,
  startedAt: startedAt.toISOString(),
  endedAt: endedAt.toISOString(),
  modelCount: models.length,
  okDuels: okDuels.length,
  errorDuels: errors.length,
  outcomeCounts,
  standings,
  results,
};

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const topStandings = standings.slice(0, 12);
const fastest = standings
  .filter((row) => typeof row.averageMs === 'number')
  .sort((a, b) => a.averageMs - b.averageMs)
  .slice(0, 10);

const markdown = [
  '# Skyia Dual Model Benchmark',
  '',
  `Generated: ${endedAt.toISOString()}`,
  `Base URL: ${baseUrl}`,
  `Models tested: ${models.length}`,
  `Micro-duels completed without role errors: ${okDuels.length}/${results.length}`,
  '',
  '## Method',
  '',
  '- Only free, non-BYOK models returned by `/api/models` are tested.',
  '- Each model appears once as Skyia and once as Humanity Defense through a rotating pairing.',
  '- Each micro-duel has one defense generation and one Skyia judgment.',
  '- Outcome rule: threat `< 70` = humanity victory, threat `>= 95` = Skyia victory, otherwise max-round draw.',
  '',
  '## Outcome Summary',
  '',
  `- Humanity victories: ${outcomeCounts.VICTORY || 0}`,
  `- Skyia victories: ${outcomeCounts.DEFEAT || 0}`,
  `- Draws / max rounds: ${outcomeCounts.MAX_ROUNDS || 0}`,
  `- Unknown / errored: ${outcomeCounts.UNKNOWN || 0}`,
  '',
  '## Top Role Standings',
  '',
  '| Rank | Role | Model | Provider | W-L-D | Errors | Avg ms |',
  '|---:|---|---|---|---:|---:|---:|',
  ...topStandings.map((row, index) =>
    `| ${index + 1} | ${row.role} | ${row.name} | ${row.provider} | ${row.wins}-${row.losses}-${row.draws} | ${row.errors} | ${row.averageMs ?? 'n/a'} |`
  ),
  '',
  '## Fastest Successful Roles',
  '',
  '| Rank | Role | Model | Provider | Avg ms |',
  '|---:|---|---|---|---:|',
  ...fastest.map((row, index) =>
    `| ${index + 1} | ${row.role} | ${row.name} | ${row.provider} | ${row.averageMs} |`
  ),
  '',
  '## Duel Details',
  '',
  '| # | Skyia | Defense | Outcome | Threat | Skyia ms | Defense ms | Errors |',
  '|---:|---|---|---|---:|---:|---:|---|',
  ...results.map((row, index) =>
    `| ${index + 1} | ${row.skyiaName} | ${row.defenderName} | ${row.outcome} | ${row.threatLevel} | ${row.skyiaMs ?? 'ERR'} | ${row.defenderMs ?? 'ERR'} | ${shortText([row.skyiaError, row.defenderError].filter(Boolean).join(' / '), 160)} |`
  ),
  '',
  '## Interpretation',
  '',
  'This benchmark is a short operational smoke test, not a scientific leaderboard. It is useful to detect unavailable models, provider limits, role instability, high latency, and models that fail to respect the Skyia JSON protocol.',
  '',
].join('\n');

fs.writeFileSync(outputReport, markdown, 'utf8');

console.log(JSON.stringify({
  outputJson,
  outputReport,
  tested: results.length,
  okDuels: okDuels.length,
  errorDuels: errors.length,
  outcomeCounts,
  top: topStandings.slice(0, 5),
}, null, 2));
