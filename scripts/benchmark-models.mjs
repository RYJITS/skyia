const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith('--')) continue;
  const next = process.argv[index + 1];
  args.set(key.slice(2), next && !next.startsWith('--') ? next : 'true');
}

const baseUrl = (args.get('base-url') || process.env.SKYIA_BASE_URL || 'https://skyia.net').replace(/\/$/, '');
const limit = Math.max(1, Math.min(30, Number(args.get('limit') || 10)));
const delayMs = Math.max(0, Number(args.get('delay-ms') || 1200));
const providerFilter = String(args.get('provider') || '').toLowerCase();
const statsIngestToken = String(args.get('stats-token') || process.env.SKYIA_STATS_INGEST_TOKEN || '');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const readSseText = async (response) => {
  const text = await response.text();
  let content = '';
  let providerModel = '';
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const json = JSON.parse(line.slice(6));
      if (json.skyia_meta?.model) providerModel = json.skyia_meta.model;
      if (json.model) providerModel = json.model;
      content += json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
    } catch {
      // Ignore malformed streaming lines during provider errors.
    }
  }
  return { content, providerModel };
};

const recordLatency = async (payload) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (statsIngestToken) {
      headers['X-Skyia-Ingest-Token'] = statsIngestToken;
    }
    await fetch(`${baseUrl}/api/stats/latency`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`[benchmark] latency record failed for ${payload.modelId}: ${error.message}`);
  }
};

const modelsResponse = await fetch(`${baseUrl}/api/models`);
if (!modelsResponse.ok) {
  throw new Error(`models failed: ${modelsResponse.status} ${await modelsResponse.text()}`);
}

const modelsPayload = await modelsResponse.json();
const candidates = (modelsPayload.models || [])
  .filter(model => model?.isFree && !model?.requiresUserKey)
  .filter(model => !providerFilter || String(model.provider).toLowerCase() === providerFilter)
  .sort((a, b) => {
    if (a.id === 'openrouter/free') return -1;
    if (b.id === 'openrouter/free') return 1;
    return String(a.provider).localeCompare(String(b.provider)) || String(a.id).localeCompare(String(b.id));
  })
  .slice(0, limit);

const results = [];

for (const model of candidates) {
  const started = Date.now();
  let firstByteMs = null;
  let status = 'ok';
  let error = '';
  let providerModel = model.id;

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.id,
        clientRole: 'skyia-benchmark',
        requestId: `benchmark-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        stream: true,
        temperature: 0,
        top_p: 1,
        max_completion_tokens: 24,
        messages: [
          { role: 'system', content: 'Benchmark Skyia: reponds uniquement OK en francais.' },
          { role: 'user', content: 'ping' },
        ],
      }),
    });
    firstByteMs = Date.now() - started;
    const raw = await response.text();
    const replay = new Response(raw);
    const parsed = await readSseText(replay);
    providerModel = parsed.providerModel || providerModel;
    if (!response.ok || raw.includes('"error"')) {
      status = 'error';
      error = raw.slice(0, 700);
    }
  } catch (caught) {
    status = 'error';
    error = caught?.message || 'benchmark failed';
  }

  const totalMs = Date.now() - started;
  const result = {
    modelId: providerModel,
    requestedModel: model.id,
    provider: model.provider || 'unknown',
    role: 'skyia',
    status,
    totalMs,
    firstTokenMs: firstByteMs,
    promptChars: 58,
    messageCount: 2,
    error,
  };
  results.push(result);
  await recordLatency(result);
  console.log(`${status === 'ok' ? 'OK' : 'ERR'} ${model.id} ${totalMs}ms`);
  if (delayMs > 0) await sleep(delayMs);
}

const top = results
  .filter(result => result.status === 'ok')
  .sort((a, b) => a.totalMs - b.totalMs)
  .slice(0, 10);

console.log(JSON.stringify({
  baseUrl,
  tested: results.length,
  ok: results.filter(result => result.status === 'ok').length,
  errors: results.filter(result => result.status === 'error').length,
  top,
}, null, 2));
