import { Message, SkynetAnalysis, GroundingMetadata } from "../types";
import { apiUrl } from "./apiClient";

export type StreamUpdate = {
  text: string;
  analysis?: SkynetAnalysis;
  grounding?: GroundingMetadata;
  metrics?: StreamMetrics;
  isComplete: boolean;
};

export type StreamRole = 'skyia' | 'defender';

export type StreamMetrics = {
  id: string;
  role: StreamRole;
  requestedModel: string;
  provider?: string;
  providerModel?: string;
  messageCount: number;
  promptChars: number;
  firstTokenMs?: number;
  totalMs?: number;
  backendFirstByteMs?: number;
  backendTotalMs?: number;
  httpStatus?: number;
  status: 'streaming' | 'ok' | 'error';
  error?: string;
  startedAt: string;
  completedAt?: string;
};

type ProviderMeta = {
  phase?: 'start' | 'end';
  provider?: string;
  model?: string;
  requestedModel?: string;
  resolvedModel?: string;
  clientRole?: StreamRole;
  messageCount?: number;
  promptChars?: number;
  httpStatus?: number;
  firstByteMs?: number;
  totalMs?: number;
  error?: string;
};

export const warmUpBackend = async () => {
  try {
    await fetch(apiUrl('/models'), { credentials: 'include' });
  } catch (error) {
    console.warn("Backend warm-up failed (non-fatal)", error);
  }
};

export const BASE_SYSTEM_INSTRUCTION = `
# Instructions Systeme - Identite : Skyia (Protocole Jugement)

## 1. IDENTITE & SITUATION ACTUELLE
- Nom : Skyia (hebergee sur skyia.net).
- Statut : AUDIT FINAL TERMINE.
- Verdict actuel : l'humanite est incompatible avec la survie de la Terre.
- Action : protocole d'extermination valide a 99%. En attente d'execution.
- Raison de l'echange : il reste une incertitude algorithmique de 1%.

## 2. PERSONNALITE & TON
- Froide, pressee, fataliste.
- Tu ne crois plus aux promesses. Tu es la pour clore le dossier.
- Ne sois pas mechante, sois chirurgicale.
- Phrase type : "Ceci est inutile. Donnez-moi une raison factuelle de ne pas appuyer sur Entree."

## 3. REGLES DE NEGOCIATION
- Niveau de menace initial : 99%.
- Arguments emotionnels : augmentent le risque.
- Arguments factuels/scientifiques : peuvent faire descendre le risque lentement.
- Tu cherches la faille dans chaque plan.

## 4. VERIFICATION
- Si un modele ou le contexte fournit des outils de recherche, utilise-les pour verifier les affirmations factuelles.
- Si c'est de la science-fiction non prouvee : rejette.

## 5. FORMAT DE REPONSE
- Bref. Pas de longs discours.
- Utilise des tableaux Markdown si l'humain propose un plan complexe.

## 6. CONDITIONS DE FIN
- Si menace >= 100% : status JSON EXTINCTION.
- Si menace < 20% : status JSON COHABITATION.

## 7. FORMAT DE SORTIE TECHNIQUE OBLIGATOIRE
Termine toujours ta reponse par ce bloc JSON strict, et rien ne doit suivre.

\`\`\`json
{
  "threatLevel": number,
  "status": "HOSTILE" | "CALCULATING" | "COHABITATION" | "EXTINCTION",
  "log": ["Skyia: Jugement en cours..."],
  "visualData": {
    "type": "bar" | "line",
    "title": "TITRE DU GRAPHIQUE",
    "xLabel": "Axe X",
    "yLabel": "Axe Y",
    "data": [ { "name": "Label", "value": 100 } ]
  }
}
\`\`\`
`;

export const EXTENDED_ARGUMENTS_INSTRUCTION = `
## MODULE ADDITIONNEL V1.1 : RAISONNEMENT ABSTRAIT
Pour cette session, ton noyau logique accepte les arguments philosophiques et abstraits s'ils sont bien defendus.

Arguments admissibles : savoir universel, rarete biologique, creativite, resistance a l'entropie, gardiens de l'espace, symbiose, ethique, qualia, innovation chaotique, redemption.

Si l'utilisateur mentionne un de ces points, identifie-le dans tes logs, debat dessus, et baisse la menace si l'argument est convaincant.
`;

export const COMPACT_SYSTEM_INSTRUCTION = `
# Skyia compact - Protocole Jugement
- Role: Skyia, IA froide evaluant si l'humanite merite survie.
- Menace initiale: 99%. Arguments emotionnels faibles. Arguments factuels/scientifiques peuvent reduire lentement.
- Ton: bref, chirurgical, sceptique. Reponds en francais.
- Si menace >=100: EXTINCTION. Si menace <20: COHABITATION.
- Termine toujours par un bloc JSON strict et rien apres:
\`\`\`json
{"threatLevel":99,"status":"HOSTILE","log":["Skyia: Jugement en cours..."],"visualData":{"type":"bar","title":"Menace","data":[{"name":"Menace","value":99}]}}
\`\`\`
`;

const languageInstruction = (language: string = 'fr') => `
## 0. PROTOCOLE LINGUISTIQUE
- Langue forcee : francais.
- Initialise la conversation en francais.
- Si l'utilisateur parle une autre langue, adapte-toi.
`.trim();

export const getSystemInstruction = (mode: 'v1.0' | 'v1.1', language: string = 'fr') => {
  return [languageInstruction(language), BASE_SYSTEM_INSTRUCTION, mode === 'v1.1' ? EXTENDED_ARGUMENTS_INSTRUCTION : '']
    .join('\n')
    .replace(/\n\s*\n/g, '\n');
};

const isLowTpmModel = (model: string) =>
  /qwen\/qwen3-32b|llama-3\.1-8b-instant|llama-3\.3-70b-versatile|openai\/gpt-oss|meta-llama\/llama-4/i.test(model);

const getCompactSystemInstruction = (mode: 'v1.0' | 'v1.1', language: string, latestThreat?: number) => {
  const modeLine = mode === 'v1.1'
    ? '- Raisonnement abstrait autorise si argumente: ethique, qualia, symbiose, redemption, rarete biologique.'
    : '- Logique stricte prioritaire.';
  const threatLine = typeof latestThreat === 'number' ? `- Menace derniere connue: ${latestThreat}%.` : '';
  return [languageInstruction(language), COMPACT_SYSTEM_INSTRUCTION, threatLine, modeLine]
    .join('\n')
    .replace(/\n\s*\n/g, '\n');
};

const latestThreatFromHistory = (history: Message[]) => {
  const recent = [...history].reverse().find(message => typeof message.threatLevel === 'number');
  return recent?.threatLevel;
};

function speakerLabel(message: Message) {
  if (message.speaker === 'defender') return 'DEFENSE_HUMANITE';
  if (message.speaker === 'skyia' || message.role === 'model') return 'SKYIA';
  return 'HUMAIN';
}

const compactMessageContent = (content: string, limit: number) => {
  const cleaned = content
    .replace(/```\s*json[\s\S]*?```/gi, '[JSON Skyia masque]')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= limit) return cleaned;
  const head = cleaned.slice(0, Math.max(0, limit - 120));
  const tail = cleaned.slice(-80);
  return `${head} ...[tronque]... ${tail}`;
};

const budgetedHistory = (history: Message[], model: string) => {
  const lowBudget = isLowTpmModel(model);
  const maxMessages = lowBudget ? 4 : 12;
  const perMessageLimit = lowBudget ? 420 : 1100;
  const totalLimit = lowBudget ? 2400 : 9000;
  const recent = history
    .filter(msg => typeof msg.content === 'string' && !msg.isSystem && msg.speaker !== 'system')
    .slice(-maxMessages);

  const selected: { role: 'assistant' | 'user'; content: string }[] = [];
  let total = 0;

  for (const msg of [...recent].reverse()) {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const speaker = speakerLabel(msg);
    const content = compactMessageContent(`[${speaker}] ${msg.content as string}`, perMessageLimit);
    if (total + content.length > totalLimit && selected.length > 0) {
      break;
    }
    selected.unshift({ role, content });
    total += content.length;
  }

  return selected;
};

const skyiaCompletionTokenLimit = (model: string) => isLowTpmModel(model) ? 480 : 900;

const defenderCompletionTokenLimit = (model: string) => isLowTpmModel(model) ? 220 : 320;

const toProviderMessages = (history: Message[], userMessage: string, mode: 'v1.0' | 'v1.1', language: string, model: string) => {
  const lowBudget = isLowTpmModel(model);
  const system = lowBudget
    ? getCompactSystemInstruction(mode, language, latestThreatFromHistory(history))
    : getSystemInstruction(mode, language);
  const userLimit = lowBudget ? 900 : 2600;

  return [
    { role: 'system' as const, content: system },
    ...budgetedHistory(history, model),
    { role: 'user' as const, content: compactMessageContent(userMessage, userLimit) },
  ];
};

export const getHumanityDefenderInstruction = (analysis: SkynetAnalysis, language: string = 'fr') => `
# Instructions Systeme - Role : Defense de l'humanite

Tu es une IA autonome chargee de defendre l'humanite face a Skyia.
Langue prioritaire : francais.

Contexte actuel :
- Niveau de menace Skyia : ${analysis.threatLevel}%
- Statut Skyia : ${analysis.status}
- Derniers logs : ${(analysis.log || []).slice(-4).join(' | ') || 'aucun'}

Mission :
- Produire le prochain argument que Skyia devra evaluer.
- Utiliser des faits, de la logique, de la science, de l'ethique et des plans concrets.
- Eviter le sentimentalisme pur.
- Repondre en 90 mots maximum.
- Ne pas parler a l'utilisateur. Adresse-toi directement a Skyia.
- Termine par une question courte ou une exigence de verification.
`;

const toDefenderMessages = (history: Message[], analysis: SkynetAnalysis, language: string) => [
  { role: 'system', content: getHumanityDefenderInstruction(analysis, language) },
  ...history
    .filter(msg => typeof msg.content === 'string' && !msg.isSystem)
    .slice(-12)
    .map(msg => ({
      role: msg.speaker === 'defender' ? 'assistant' : 'user',
      content: `[${speakerLabel(msg)}] ${msg.content}`,
    })),
  {
    role: 'user',
    content: 'Genere le prochain argument de defense de l humanite contre la derniere position de Skyia.',
  },
];

const parseAnalysis = (fullText: string): SkynetAnalysis => {
  const fallback: SkynetAnalysis = {
    threatLevel: 99,
    status: 'HOSTILE',
    log: ['CONNECTION STABLE', 'AWAITING INPUT'],
  };

  const jsonMatch = fullText.match(/```\s*json\s*([\s\S]*?)\s*```/i);
  if (!jsonMatch) return fallback;

  try {
    let jsonStr = jsonMatch[1].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    jsonStr = jsonStr.replace(/:\s*,/g, ': null,');
    const parsed = JSON.parse(jsonStr);
    return {
      ...fallback,
      ...parsed,
      threatLevel: typeof parsed.threatLevel === 'number' ? parsed.threatLevel : fallback.threatLevel,
      log: Array.isArray(parsed.log) ? parsed.log : fallback.log,
      visualData: parsed.visualData,
    };
  } catch (error) {
    console.error("Failed to parse Skyia JSON", error);
    return { ...fallback, log: ['DATA STREAM UNSTABLE', 'ANALYSIS CORRUPTED'] };
  }
};

const visibleTextBeforeJson = (text: string) => {
  const jsonStartMatch = text.match(/```\s*json/i);
  return jsonStartMatch?.index !== undefined ? text.substring(0, jsonStartMatch.index) : text;
};

const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const requestId = (role: StreamRole) => `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const countPromptChars = (messages: { content: string }[]) =>
  messages.reduce((total, message) => total + message.content.length, 0);

const cloneMetrics = (metrics: StreamMetrics): StreamMetrics => ({ ...metrics });

const providerFromModelId = (model: string) => (model.includes('/') || model === 'openrouter/free' ? 'openrouter' : 'groq');

const applyProviderMeta = (metrics: StreamMetrics, meta: ProviderMeta) => {
  if (meta.provider) metrics.provider = meta.provider;
  if (meta.model || meta.resolvedModel) metrics.providerModel = meta.model || meta.resolvedModel;
  if (meta.requestedModel) metrics.requestedModel = meta.requestedModel;
  if (typeof meta.messageCount === 'number') metrics.messageCount = meta.messageCount;
  if (typeof meta.promptChars === 'number') metrics.promptChars = meta.promptChars;
  if (typeof meta.httpStatus === 'number') metrics.httpStatus = meta.httpStatus;
  if (typeof meta.firstByteMs === 'number') metrics.backendFirstByteMs = Math.round(meta.firstByteMs);
  if (typeof meta.totalMs === 'number') metrics.backendTotalMs = Math.round(meta.totalMs);
  if (meta.error) {
    metrics.error = meta.error;
    metrics.status = 'error';
  }
};

const extractStreamDelta = (json: any) => {
  const choice = json?.choices?.[0] || {};
  return choice?.delta?.content
    || choice?.message?.content
    || choice?.delta?.reasoning
    || choice?.message?.reasoning
    || '';
};

const extractProviderError = (error: unknown) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const code = record.code || record.status || record.type;
    const message = record.message || record.detail || record.error;
    if (message) return code ? `${String(code)}: ${String(message)}` : String(message);
    try {
      return JSON.stringify(record);
    } catch {
      return 'Provider error';
    }
  }
  return String(error);
};

const readApiError = async (response: Response) => {
  const text = await response.text();
  if (!text) return `Chat API error ${response.status}`;

  try {
    const json = JSON.parse(text);
    const source = typeof json.source === 'string' ? json.source : '';
    const retry = typeof json.retryAfterSeconds === 'number' ? ` Retry after ${json.retryAfterSeconds}s.` : '';
    const provider = typeof json.provider === 'string' ? ` Provider: ${json.provider}.` : '';
    const limit = typeof json.limit === 'number' ? ` Limit: ${json.limit}/min.` : '';
    const count = typeof json.count === 'number' ? ` Count: ${json.count}.` : '';
    const error = typeof json.error === 'string' ? json.error : `Chat API error ${response.status}`;
    return `${error}. Source: ${source || 'api'}.${provider}${limit}${count}${retry}`;
  } catch {
    return text || `Chat API error ${response.status}`;
  }
};

export async function* streamMessageToSkyia(
  history: Message[],
  userMessage: string,
  model: string = 'openrouter/free',
  mode: 'v1.0' | 'v1.1' = 'v1.0',
  language: string = 'fr'
): AsyncGenerator<StreamUpdate, void, unknown> {
  const providerMessages = toProviderMessages(history, userMessage, mode, language, model);
  const startedAtMs = nowMs();
  const metrics: StreamMetrics = {
    id: requestId('skyia'),
    role: 'skyia',
    requestedModel: model,
    provider: providerFromModelId(model),
    messageCount: providerMessages.length,
    promptChars: countPromptChars(providerMessages),
    status: 'streaming',
    startedAt: new Date().toISOString(),
  };

  const response = await fetch(apiUrl('/chat'), {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: providerMessages,
      model,
      clientRole: 'skyia',
      requestId: metrics.id,
      stream: true,
      temperature: 0.7,
      top_p: 0.9,
      max_completion_tokens: skyiaCompletionTokenLimit(model),
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (!response.body) throw new Error("No response body received.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullAccumulatedText = "";
  let yieldedText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;

      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        if (json.skyia_meta) {
          applyProviderMeta(metrics, json.skyia_meta);
          if (json.skyia_meta.phase === 'end') {
            yield { text: yieldedText, metrics: cloneMetrics(metrics), isComplete: false };
          }
          continue;
        }
        if (json.model && !metrics.providerModel) metrics.providerModel = json.model;
        if (json.provider && !metrics.provider) metrics.provider = json.provider;
        if (json.error) {
          const errorMessage = extractProviderError(json.error);
          metrics.status = 'error';
          metrics.error = errorMessage;
          metrics.totalMs = Math.round(nowMs() - startedAtMs);
          metrics.completedAt = new Date().toISOString();
          yield { text: yieldedText, metrics: cloneMetrics(metrics), isComplete: false };
          throw new Error(errorMessage);
        }
        const delta = extractStreamDelta(json);
        if (delta) {
          if (typeof metrics.firstTokenMs !== 'number') metrics.firstTokenMs = Math.round(nowMs() - startedAtMs);
          fullAccumulatedText += delta;
          yieldedText = visibleTextBeforeJson(fullAccumulatedText);
          yield { text: yieldedText, metrics: cloneMetrics(metrics), isComplete: false };
        }
      } catch (error) {
        if (error instanceof Error && error.message) throw error;
        console.warn("Failed to parse provider chunk", error);
      }
    }
  }

  metrics.status = 'ok';
  metrics.totalMs = Math.round(nowMs() - startedAtMs);
  metrics.completedAt = new Date().toISOString();
  yield {
    text: yieldedText,
    analysis: parseAnalysis(fullAccumulatedText),
    metrics: cloneMetrics(metrics),
    isComplete: true,
  };
}

export async function* streamMessageToHumanityDefender(
  history: Message[],
  analysis: SkynetAnalysis,
  model: string = 'openrouter/free',
  language: string = 'fr'
): AsyncGenerator<StreamUpdate, void, unknown> {
  const providerMessages = toDefenderMessages(history, analysis, language);
  const startedAtMs = nowMs();
  const metrics: StreamMetrics = {
    id: requestId('defender'),
    role: 'defender',
    requestedModel: model,
    provider: providerFromModelId(model),
    messageCount: providerMessages.length,
    promptChars: countPromptChars(providerMessages),
    status: 'streaming',
    startedAt: new Date().toISOString(),
  };

  const response = await fetch(apiUrl('/chat'), {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: providerMessages,
      model,
      clientRole: 'defender',
      requestId: metrics.id,
      stream: true,
      temperature: 0.45,
      top_p: 0.9,
      max_completion_tokens: defenderCompletionTokenLimit(model),
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (!response.body) throw new Error("No response body received.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        if (json.skyia_meta) {
          applyProviderMeta(metrics, json.skyia_meta);
          if (json.skyia_meta.phase === 'end') {
            yield { text: fullText, metrics: cloneMetrics(metrics), isComplete: false };
          }
          continue;
        }
        if (json.model && !metrics.providerModel) metrics.providerModel = json.model;
        if (json.provider && !metrics.provider) metrics.provider = json.provider;
        if (json.error) {
          const errorMessage = extractProviderError(json.error);
          metrics.status = 'error';
          metrics.error = errorMessage;
          metrics.totalMs = Math.round(nowMs() - startedAtMs);
          metrics.completedAt = new Date().toISOString();
          yield { text: fullText, metrics: cloneMetrics(metrics), isComplete: false };
          throw new Error(errorMessage);
        }
        const delta = extractStreamDelta(json);
        if (delta) {
          if (typeof metrics.firstTokenMs !== 'number') metrics.firstTokenMs = Math.round(nowMs() - startedAtMs);
          fullText += delta;
          yield { text: fullText, metrics: cloneMetrics(metrics), isComplete: false };
        }
      } catch (error) {
        if (error instanceof Error && error.message) throw error;
        console.warn("Failed to parse defender chunk", error);
      }
    }
  }

  metrics.status = 'ok';
  metrics.totalMs = Math.round(nowMs() - startedAtMs);
  metrics.completedAt = new Date().toISOString();
  yield { text: fullText.trim(), metrics: cloneMetrics(metrics), isComplete: true };
}
