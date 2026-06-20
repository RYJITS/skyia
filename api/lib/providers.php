<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

function get_available_models(): array
{
    $cached = read_model_cache();
    if ($cached !== null) {
        return filter_disabled_models($cached);
    }

    $models = [];
    foreach ([fn() => fetch_openrouter_models(), fn() => fetch_groq_models()] as $fetchModels) {
        try {
            $models = array_merge($models, $fetchModels());
        } catch (Throwable) {
            // A provider catalogue outage should not make the app unusable.
        }
    }

    if (!$models) {
        $models = fallback_models();
    }

    $models = filter_disabled_models($models);

    usort($models, function (array $a, array $b): int {
        if ((int)$a['cost'] !== (int)$b['cost']) {
            return (int)$a['cost'] <=> (int)$b['cost'];
        }
        if (($a['id'] ?? '') === 'openrouter/free') {
            return -1;
        }
        if (($b['id'] ?? '') === 'openrouter/free') {
            return 1;
        }
        return strcmp((string)$a['name'], (string)$b['name']);
    });

    write_model_cache($models);
    return $models;
}

function filter_disabled_models(array $models): array
{
    return array_values(array_filter($models, fn(array $model) => !model_is_disabled((string)($model['id'] ?? ''))));
}

function model_is_disabled(string $id): bool
{
    $defaults = [
        'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
        'google/gemma-4-26b-a4b-it:free',
        'google/lyria-3-clip-preview',
        'google/lyria-3-pro-preview',
        'meta-llama/llama-3.2-3b-instruct:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'moonshotai/kimi-k2.6:free',
        'nousresearch/hermes-3-llama-3.1-405b:free',
        'qwen/qwen3-coder:free',
        'qwen/qwen3-next-80b-a3b-instruct:free',
    ];
    $configured = array_filter(array_map('trim', explode(',', (string)skyia_config('DISABLED_MODELS', ''))));
    $disabled = array_fill_keys(array_merge($defaults, $configured), true);
    return isset($disabled[$id]);
}

function fetch_openrouter_models(): array
{
    $hasServerKey = provider_server_key('openrouter') !== '';
    $data = http_json('https://openrouter.ai/api/v1/models');
    $rows = $data['data'] ?? [];
    if (!is_array($rows)) {
        return [];
    }

    $free = [];
    $paid = [];

    foreach ($rows as $row) {
        if (!is_array($row) || empty($row['id'])) {
            continue;
        }
        if (!model_supports_text_chat($row)) {
            continue;
        }

        $isFree = pricing_is_free($row['pricing'] ?? []);
        $model = [
            'id' => (string)$row['id'],
            'name' => (string)($row['name'] ?? $row['id']),
            'provider' => 'openrouter',
            'sourceProvider' => explode('/', (string)$row['id'])[0] ?? 'unknown',
            'cost' => $isFree ? 0 : 1,
            'category' => $isFree ? 'standard' : 'premium',
            'isFree' => $isFree,
            'requiresUserKey' => !$isFree,
            'contextLength' => (int)($row['context_length'] ?? 0),
        ];

        if ($isFree && $hasServerKey) {
            $free[] = $model;
        } elseif (count($paid) < 80 && premium_model_is_relevant($model['id'], $model['name'])) {
            $paid[] = $model;
        }
    }

    return array_merge(array_slice($free, 0, 80), $paid);
}

function fetch_groq_models(): array
{
    $key = provider_server_key('groq');
    if (!$key) {
        return [];
    }

    $allow = array_filter(array_map('trim', explode(',', (string)skyia_config('GROQ_FREE_MODELS', 'llama-3.1-8b-instant,llama-3.3-70b-versatile,openai/gpt-oss-20b,openai/gpt-oss-120b,qwen/qwen3-32b,meta-llama/llama-4-scout-17b-16e-instruct'))));
    $allowSet = array_fill_keys($allow, true);
    $data = http_json('https://api.groq.com/openai/v1/models', ['Authorization' => 'Bearer ' . $key]);
    $rows = $data['data'] ?? [];
    if (!is_array($rows)) {
        return [];
    }

    $models = [];
    foreach ($rows as $row) {
        $id = (string)($row['id'] ?? '');
        if ($id === '' || !isset($allowSet[$id])) {
            continue;
        }
        $models[] = [
            'id' => $id,
            'name' => 'Groq: ' . strtoupper(str_replace(['-', '/', '_'], ' ', $id)),
            'provider' => 'groq',
            'sourceProvider' => 'groq',
            'cost' => 0,
            'category' => 'standard',
            'isFree' => true,
            'requiresUserKey' => false,
            'contextLength' => (int)($row['context_window'] ?? 0),
        ];
    }

    return $models;
}

function fallback_models(): array
{
    $models = [];
    if (provider_server_key('openrouter') !== '') {
        $models[] = [
            'id' => 'openrouter/free',
            'name' => 'OpenRouter Free',
            'provider' => 'openrouter',
            'sourceProvider' => 'openrouter',
            'cost' => 0,
            'category' => 'standard',
            'isFree' => true,
            'requiresUserKey' => false,
            'contextLength' => 0,
        ];
    }
    if (provider_server_key('groq') !== '') {
        $models[] = [
            'id' => 'llama-3.1-8b-instant',
            'name' => 'Groq: LLAMA 3.1 8B INSTANT',
            'provider' => 'groq',
            'sourceProvider' => 'groq',
            'cost' => 0,
            'category' => 'standard',
            'isFree' => true,
            'requiresUserKey' => false,
            'contextLength' => 131072,
        ];
    }
    return $models;
}

function pricing_is_free(array $pricing): bool
{
    $keys = ['prompt', 'completion', 'request', 'input_cache_read', 'input_cache_write', 'internal_reasoning'];
    $hasKnownPrice = false;
    foreach ($keys as $key) {
        if (!isset($pricing[$key]) || $pricing[$key] === '') {
            continue;
        }
        $hasKnownPrice = true;
        if ((float)$pricing[$key] !== 0.0) {
            return false;
        }
    }
    return $hasKnownPrice;
}

function model_supports_text_chat(array $row): bool
{
    $output = $row['architecture']['output_modalities'] ?? ['text'];
    if (!is_array($output) || count($output) !== 1 || $output[0] !== 'text') {
        return false;
    }

    return true;
}

function premium_model_is_relevant(string $id, string $name): bool
{
    return (bool)preg_match('/gpt|claude|llama|deepseek|qwen|mistral|grok|kimi|sonnet|opus|command|minimax/i', $id . ' ' . $name);
}

function read_model_cache(): ?array
{
    try {
        $stmt = db()->prepare('SELECT payload, updated_at FROM model_cache WHERE cache_key = ? LIMIT 1');
        $stmt->execute(['providers']);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        if (strtotime((string)$row['updated_at']) < time() - 6 * 60 * 60) {
            return null;
        }
        $models = json_decode((string)$row['payload'], true);
        return is_array($models) ? $models : null;
    } catch (Throwable) {
        return null;
    }
}

function write_model_cache(array $models): void
{
    try {
        $stmt = db()->prepare('INSERT INTO model_cache (cache_key, payload, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = NOW()');
        $stmt->execute(['providers', json_encode($models, JSON_UNESCAPED_UNICODE)]);
    } catch (Throwable) {
    }
}

function http_json(string $url, array $headers = []): array
{
    $curl = curl_init($url);
    $headerRows = ['Content-Type: application/json'];
    foreach ($headers as $name => $value) {
        $headerRows[] = "{$name}: {$value}";
    }
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headerRows,
        CURLOPT_TIMEOUT => 30,
    ]);
    $raw = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $error = curl_error($curl);
    curl_close($curl);

    if ($raw === false || $status >= 400) {
        throw new RuntimeException("Provider request failed: {$status} {$error}");
    }

    $data = json_decode((string)$raw, true);
    return is_array($data) ? $data : [];
}

function resolve_model(string $model, string $provider = ''): array
{
    if ($model === '') {
        $models = get_available_models();
        $default = array_values(array_filter($models, fn($m) => ($m['id'] ?? '') === 'openrouter/free'))[0] ?? $models[0] ?? null;
        if (!$default) {
            error_response('No model available', 503);
        }
        return $default;
    }

    if (model_is_disabled($model)) {
        error_response('Model disabled by Skyia availability policy', 410, [
            'source' => 'skyia_guard',
            'model' => $model,
        ]);
    }

    foreach (get_available_models() as $known) {
        if (($known['id'] ?? '') === $model) {
            return $known;
        }
    }

    $provider = $provider !== '' ? $provider : (str_contains($model, '/') ? 'openrouter' : 'groq');
    $isFree = str_contains($model, ':free') || $model === 'openrouter/free';
    return [
        'id' => $model,
        'name' => $model,
        'provider' => $provider,
        'cost' => $isFree ? 0 : 1,
        'category' => $isFree ? 'standard' : 'premium',
        'isFree' => $isFree,
        'requiresUserKey' => !$isFree,
    ];
}

function provider_server_key(string $provider): string
{
    return match ($provider) {
        'openrouter' => (string)skyia_config('OPENROUTER_API_KEY', ''),
        'groq' => (string)skyia_config('GROQ_API_KEY', ''),
        default => '',
    };
}

function user_provider_key(?array $user, string $provider): string
{
    if (!$user) {
        return '';
    }
    $stmt = db()->prepare('SELECT key_cipher FROM user_api_keys WHERE user_id = ? AND provider = ? LIMIT 1');
    $stmt->execute([$user['id'], $provider]);
    $row = $stmt->fetch();
    return $row ? decrypt_secret((string)$row['key_cipher']) : '';
}

function enforce_rate_limit(string $provider, int $limit, string $clientRole = ''): void
{
    ensure_rate_limit_table();
    prune_rate_limit_rows();
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', $ip . '|' . $provider . '|' . date('Y-m-d-H-i'));
    $stmt = db()->prepare('INSERT INTO rate_limits (key_hash, provider, window_start, count) VALUES (?, ?, NOW(), 1) ON DUPLICATE KEY UPDATE count = count + 1');
    $stmt->execute([$key, $provider]);
    $read = db()->prepare('SELECT count FROM rate_limits WHERE key_hash = ?');
    $read->execute([$key]);
    $count = (int)$read->fetchColumn();
    if ($count > $limit) {
        $retryAfter = max(1, 60 - (int)date('s'));
        header('Retry-After: ' . $retryAfter);
        error_response('Skyia local rate limit exceeded', 429, [
            'source' => 'skyia_guard',
            'provider' => $provider,
            'clientRole' => $clientRole,
            'limit' => $limit,
            'count' => $count,
            'windowSeconds' => 60,
            'retryAfterSeconds' => $retryAfter,
        ]);
    }
}

function prune_rate_limit_rows(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->exec('DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 2 DAY)');
    } catch (Throwable) {
    }
}

function ensure_rate_limit_table(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    db()->exec(
        "CREATE TABLE IF NOT EXISTS rate_limits (
          key_hash CHAR(64) NOT NULL PRIMARY KEY,
          provider VARCHAR(30) NOT NULL,
          window_start DATETIME NOT NULL,
          count INT NOT NULL DEFAULT 0,
          INDEX idx_rate_limits_window (window_start)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $done = true;
}

function emit_stream_meta(array $meta): void
{
    echo "data: " . json_encode(['skyia_meta' => $meta], JSON_UNESCAPED_UNICODE) . "\n\n";
    flush();
}

function stream_provider_chat(string $provider, string $apiKey, array $body, array $meta = []): void
{
    $url = $provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ];
    if ($provider === 'openrouter') {
        $headers[] = 'HTTP-Referer: https://skyia.net';
        $headers[] = 'X-Title: Skyia Judgment Protocol';
    }

    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Accel-Buffering: no');
    @ini_set('output_buffering', 'off');
    @ini_set('zlib.output_compression', '0');
    while (ob_get_level() > 0) {
        @ob_end_flush();
    }

    $startedAt = microtime(true);
    emit_stream_meta(array_filter([
        'phase' => 'start',
        'provider' => $provider,
        'model' => (string)($body['model'] ?? ''),
        'resolvedModel' => (string)($meta['resolvedModel'] ?? ($body['model'] ?? '')),
        'requestedModel' => (string)($meta['requestedModel'] ?? ''),
        'clientRole' => (string)($meta['clientRole'] ?? ''),
        'requestId' => (string)($meta['requestId'] ?? ''),
        'messageCount' => $meta['messageCount'] ?? null,
        'promptChars' => $meta['promptChars'] ?? null,
        'serverTime' => date(DATE_ATOM),
    ], fn($value) => $value !== null && $value !== ''));

    $curl = curl_init($url);
    $providerResponsePreview = '';
    $providerStatus = 0;
    $shouldForwardChunks = true;
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_HEADERFUNCTION => function ($curl, string $header) use (&$providerStatus, &$shouldForwardChunks): int {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#i', trim($header), $matches)) {
                $providerStatus = (int)$matches[1];
                $shouldForwardChunks = $providerStatus < 400;
            }
            return strlen($header);
        },
        CURLOPT_WRITEFUNCTION => function ($curl, string $chunk) use (&$providerResponsePreview, &$shouldForwardChunks): int {
            if (strlen($providerResponsePreview) < 4096) {
                $providerResponsePreview .= substr($chunk, 0, 4096 - strlen($providerResponsePreview));
            }
            if ($shouldForwardChunks) {
                echo $chunk;
                flush();
            }
            return strlen($chunk);
        },
    ]);

    $ok = curl_exec($curl);
    $status = $providerStatus > 0 ? $providerStatus : curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $firstByteSeconds = curl_getinfo($curl, CURLINFO_STARTTRANSFER_TIME);
    $totalSeconds = curl_getinfo($curl, CURLINFO_TOTAL_TIME);
    $error = curl_error($curl);
    curl_close($curl);
    $providerErrorMessage = $error ?: provider_error_message($providerResponsePreview);

    emit_stream_meta(array_filter([
        'phase' => 'end',
        'source' => 'provider',
        'provider' => $provider,
        'model' => (string)($body['model'] ?? ''),
        'resolvedModel' => (string)($meta['resolvedModel'] ?? ($body['model'] ?? '')),
        'requestedModel' => (string)($meta['requestedModel'] ?? ''),
        'clientRole' => (string)($meta['clientRole'] ?? ''),
        'requestId' => (string)($meta['requestId'] ?? ''),
        'httpStatus' => $status,
        'firstByteMs' => $firstByteSeconds > 0 ? (int)round($firstByteSeconds * 1000) : null,
        'totalMs' => $totalSeconds > 0 ? (int)round($totalSeconds * 1000) : (int)round((microtime(true) - $startedAt) * 1000),
        'error' => ($ok === false || $status >= 400) ? $providerErrorMessage : null,
    ], fn($value) => $value !== null && $value !== ''));

    if ($ok === false || $status >= 400) {
        echo "data: " . json_encode([
            'error' => "Provider error {$status}: {$providerErrorMessage}",
            'source' => 'provider',
            'provider' => $provider,
            'httpStatus' => $status,
        ], JSON_UNESCAPED_UNICODE) . "\n\n";
    }
    exit;
}

function provider_error_message(string $preview): string
{
    $preview = trim($preview);
    if ($preview === '') {
        return 'No provider error body returned';
    }

    $lines = preg_split('/\r?\n/', $preview) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (str_starts_with($line, 'data: ')) {
            $line = trim(substr($line, 6));
        }
        if ($line === '' || $line === '[DONE]' || str_starts_with($line, ':')) {
            continue;
        }
        $decoded = json_decode($line, true);
        if (is_array($decoded)) {
            $message = extract_error_message($decoded);
            if ($message !== '') {
                return $message;
            }
        }
    }

    $decoded = json_decode($preview, true);
    if (is_array($decoded)) {
        $message = extract_error_message($decoded);
        if ($message !== '') {
            return $message;
        }
    }

    $plain = preg_replace('/\s+/', ' ', strip_tags($preview)) ?: 'Provider error';
    return substr($plain, 0, 500);
}

function extract_error_message(array $payload): string
{
    $error = $payload['error'] ?? null;
    if (is_string($error)) {
        return $error;
    }
    if (is_array($error)) {
        foreach (['message', 'detail', 'code', 'type'] as $key) {
            if (!empty($error[$key]) && is_scalar($error[$key])) {
                return (string)$error[$key];
            }
        }
    }
    foreach (['message', 'detail'] as $key) {
        if (!empty($payload[$key]) && is_scalar($payload[$key])) {
            return (string)$payload[$key];
        }
    }
    return '';
}
