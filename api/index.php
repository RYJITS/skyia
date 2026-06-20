<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/providers.php';

set_exception_handler(function (Throwable $error): void {
    error_log(sprintf(
        '[Skyia API] %s in %s:%d',
        $error->getMessage(),
        $error->getFile(),
        $error->getLine()
    ));
    $debugErrors = (string)skyia_config('DEBUG_ERRORS', '') === '1';
    error_response('Internal server error', 500, $debugErrors ? ['detail' => $error->getMessage()] : []);
});

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

enforce_cookie_csrf_protection();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$path = preg_replace('#^.*?/api#', '', $path) ?: '/';
$segments = array_values(array_filter(explode('/', trim($path, '/'))));

if (($segments[0] ?? '') === 'v1') {
    array_shift($segments);
}

[$resource, $action, $id] = [$segments[0] ?? '', $segments[1] ?? '', $segments[2] ?? ''];

if ($resource === 'auth') {
    route_auth($method, $action);
}

if ($resource === 'models') {
    require_method(['GET']);
    json_response(['models' => get_available_models()]);
}

if ($resource === 'chat') {
    route_chat($method);
}

if ($resource === 'saves') {
    route_saves($method, $action);
}

if ($resource === 'stats') {
    route_stats($method, $action);
}

if ($resource === 'user-keys') {
    route_user_keys($method, $action);
}

if ($resource === 'custom-models') {
    route_custom_models($method, $action);
}

error_response('Route not found', 404);

function route_auth(string $method, string $action): void
{
    if ($action === 'me') {
        require_method(['GET']);
        $user = current_user();
        json_response(['user' => $user ? public_user($user) : null, 'profile' => $user ? user_profile($user) : null]);
    }

    if ($action === 'register') {
        require_method(['POST']);
        enforce_rate_limit('auth', 8, 'register');
        $body = read_json_body();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $displayName = bounded_string($body['displayName'] ?? 'Operative', 'displayName', 120, true);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error_response('Invalid email', 422);
        }
        if (strlen($email) > 190) {
            error_response('Email too long', 422);
        }
        if (strlen($password) < 8) {
            error_response('Password must contain at least 8 characters', 422);
        }

        $pdo = db();
        $id = uuid_v4();
        $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, last_played) VALUES (?, ?, ?, ?, NOW(), NOW())');
        try {
            $stmt->execute([$id, $email, password_hash($password, PASSWORD_DEFAULT), $displayName ?: 'Operative']);
        } catch (PDOException $error) {
            if ((string)$error->getCode() === '23000') {
                error_response('Email already registered', 409);
            }
            throw $error;
        }

        $user = get_user_by_id($id);
        start_user_session($user);
        json_response(['user' => public_user($user), 'profile' => user_profile($user)], 201);
    }

    if ($action === 'login') {
        require_method(['POST']);
        enforce_rate_limit('auth', 12, 'login');
        $body = read_json_body();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $user = get_user_by_email($email);

        if (!$user || !password_verify($password, (string)$user['password_hash'])) {
            error_response('Invalid credentials', 401);
        }

        start_user_session($user);
        json_response(['user' => public_user($user), 'profile' => user_profile($user)]);
    }

    if ($action === 'logout') {
        require_method(['POST']);
        end_user_session();
        json_response(['ok' => true]);
    }

    if ($action === 'profile') {
        require_method(['PUT']);
        $user = require_user();
        $body = read_json_body();
        $updates = [];
        $params = [];

        if (isset($body['displayName'])) {
            $updates[] = 'display_name = ?';
            $params[] = bounded_string($body['displayName'], 'displayName', 120, true) ?: 'Operative';
        }
        if (isset($body['statsResult'])) {
            $result = strtoupper((string)$body['statsResult']);
            if (!in_array($result, ['VICTORY', 'DEFEAT'], true)) {
                error_response('Invalid stats result', 422);
            }
            $updates[] = 'games_played = games_played + 1';
            $updates[] = $result === 'VICTORY' ? 'victories = victories + 1' : 'defeats = defeats + 1';
            $updates[] = 'total_credits_used = total_credits_used + ?';
            $updates[] = 'last_played = NOW()';
            $params[] = max(0, (int)($body['creditsUsed'] ?? 0));
        }

        if (!$updates) {
            json_response(['success' => true, 'profile' => user_profile($user)]);
        }

        $params[] = $user['id'];
        $stmt = db()->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?');
        $stmt->execute($params);
        $updated = get_user_by_id($user['id']);
        json_response(['success' => true, 'profile' => user_profile($updated)]);
    }

    error_response('Auth route not found', 404);
}

function route_chat(string $method): void
{
    require_method(['POST']);
    $body = read_json_body();
    $messages = sanitize_chat_messages($body['messages'] ?? []);
    $model = trim((string)($body['model'] ?? ''));
    $provider = trim((string)($body['provider'] ?? ''));

    if (count($messages) === 0) {
        error_response('Messages are required', 422);
    }
    if (count($messages) > 24) {
        error_response('Too many chat messages', 413);
    }
    if (messages_prompt_chars($messages) > 24000) {
        error_response('Chat payload too large', 413);
    }

    $modelInfo = resolve_model($model, $provider);
    $user = current_user();
    $usesServerKey = !($modelInfo['requiresUserKey'] ?? false);
    $clientRole = trim((string)($body['clientRole'] ?? 'chat'));
    enforce_rate_limit((string)$modelInfo['provider'], $usesServerKey ? 30 : 120, $clientRole);

    $apiKey = $usesServerKey
        ? provider_server_key($modelInfo['provider'])
        : user_provider_key($user, $modelInfo['provider']);

    if (!$apiKey) {
        $message = $usesServerKey
            ? 'Server API key missing for free model provider'
            : 'A personal API key is required for this paid model';
        error_response($message, $usesServerKey ? 500 : 402);
    }

    $chatRequest = [
        'model' => $modelInfo['id'],
        'messages' => $messages,
        'stream' => true,
        'temperature' => max(0.0, min(2.0, (float)($body['temperature'] ?? 0.7))),
        'top_p' => max(0.0, min(1.0, (float)($body['top_p'] ?? 0.9))),
    ];

    $maxCompletionTokens = (int)($body['max_completion_tokens'] ?? 0);
    if ($maxCompletionTokens > 0) {
        $chatRequest['max_completion_tokens'] = min(2048, max(1, $maxCompletionTokens));
    }

    stream_provider_chat($modelInfo['provider'], $apiKey, $chatRequest, [
        'clientRole' => $clientRole,
        'requestId' => trim((string)($body['requestId'] ?? '')),
        'requestedModel' => $model,
        'resolvedModel' => (string)$modelInfo['id'],
        'messageCount' => count($messages),
        'promptChars' => messages_prompt_chars($messages),
        'usesServerKey' => $usesServerKey,
    ]);
}

function sanitize_chat_messages($messages): array
{
    if (!is_array($messages)) {
        error_response('Messages are required', 422);
    }

    $sanitized = [];
    foreach ($messages as $message) {
        if (!is_array($message)) {
            error_response('Invalid chat message payload', 422);
        }

        $role = trim((string)($message['role'] ?? ''));
        $content = $message['content'] ?? '';
        if (!in_array($role, ['system', 'user', 'assistant'], true) || !is_string($content) || trim($content) === '') {
            error_response('Invalid chat message payload', 422);
        }

        $sanitized[] = [
            'role' => $role,
            'content' => $content,
        ];
    }

    return $sanitized;
}

function messages_prompt_chars(array $messages): int
{
    $total = 0;
    foreach ($messages as $message) {
        if (is_array($message)) {
            $total += content_prompt_chars($message['content'] ?? '');
        }
    }
    return $total;
}

function content_prompt_chars($content): int
{
    if (is_string($content)) {
        return strlen($content);
    }
    if (!is_array($content)) {
        return 0;
    }

    $total = 0;
    foreach ($content as $value) {
        if (is_string($value)) {
            $total += strlen($value);
        } elseif (is_array($value)) {
            $total += content_prompt_chars($value);
        }
    }
    return $total;
}

function route_saves(string $method, string $id): void
{
    $user = require_user();
    $pdo = db();

    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT id, name, payload, updated_at FROM saved_sessions WHERE user_id = ? ORDER BY updated_at DESC');
        $stmt->execute([$user['id']]);
        $sessions = [];
        foreach ($stmt->fetchAll() as $row) {
            $payload = json_decode((string)$row['payload'], true) ?: [];
            $payload['id'] = $row['id'];
            $payload['name'] = $row['name'];
            $sessions[] = $payload;
        }
        json_response(['sessions' => $sessions]);
    }

    if ($method === 'POST') {
        enforce_rate_limit('storage', 30, 'save-session');
        $body = read_json_body();
        $session = $body['session'] ?? $body;
        if (!is_array($session)) {
            error_response('Invalid session payload', 422);
        }
        $sessionId = bounded_identifier($session['id'] ?? uuid_v4(), 'session id', 36);
        $name = bounded_string($session['name'] ?? 'SKYIA_SAVE', 'session name', 160, true);

        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM saved_sessions WHERE user_id = ? AND id <> ?');
        $countStmt->execute([$user['id'], $sessionId]);
        if ((int)$countStmt->fetchColumn() >= 5) {
            error_response('Save limit reached', 409);
        }

        $session['id'] = $sessionId;
        $session['name'] = $name;
        $payloadJson = encode_json_payload($session, 200000, 'Invalid session payload', 'Session payload too large');
        $stmt = $pdo->prepare('INSERT INTO saved_sessions (id, user_id, name, payload, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), payload = VALUES(payload), updated_at = NOW()');
        $stmt->execute([$sessionId, $user['id'], $name, $payloadJson]);
        json_response(['success' => true, 'id' => $sessionId]);
    }

    if ($method === 'PUT' && $id !== '') {
        enforce_rate_limit('storage', 30, 'rename-session');
        $id = bounded_identifier($id, 'session id', 36);
        $body = read_json_body();
        $name = bounded_string($body['name'] ?? '', 'session name', 160, true);
        if ($name === '') {
            error_response('Name is required', 422);
        }
        $select = $pdo->prepare('SELECT payload FROM saved_sessions WHERE id = ? AND user_id = ? LIMIT 1');
        $select->execute([$id, $user['id']]);
        $row = $select->fetch();
        if (!$row) {
            error_response('Save not found', 404);
        }

        $payload = json_decode((string)$row['payload'], true);
        if (!is_array($payload)) {
            $payload = [];
        }
        $payload['id'] = $id;
        $payload['name'] = $name;

        $stmt = $pdo->prepare('UPDATE saved_sessions SET name = ?, payload = ?, updated_at = NOW() WHERE id = ? AND user_id = ?');
        $stmt->execute([$name, json_encode($payload, JSON_UNESCAPED_UNICODE), $id, $user['id']]);
        json_response(['success' => true]);
    }

    if ($method === 'DELETE' && $id !== '') {
        enforce_rate_limit('storage', 30, 'delete-session');
        $id = bounded_identifier($id, 'session id', 36);
        $stmt = $pdo->prepare('DELETE FROM saved_sessions WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $user['id']]);
        json_response(['success' => true]);
    }

    error_response('Save route not found', 404);
}

function route_stats(string $method, string $action): void
{
    $pdo = db();
    ensure_observability_tables();

    if ($method === 'GET' && $action === 'models') {
        $stmt = $pdo->query('SELECT model_id, victories, defeats, total_games, total_victory_turn_count, total_defeat_turn_count, total_victory_threat_level FROM model_stats ORDER BY total_games DESC');
        $stats = [];
        foreach ($stmt->fetchAll() as $row) {
            $total = (int)$row['total_games'];
            $victories = (int)$row['victories'];
            $stats[$row['model_id']] = [
                'modelId' => $row['model_id'],
                'victories' => $victories,
                'defeats' => (int)$row['defeats'],
                'totalGames' => $total,
                'winRate' => $total > 0 ? (int)round(($victories / $total) * 100) : 0,
                'totalVictoryTurnCount' => (int)$row['total_victory_turn_count'],
                'totalDefeatTurnCount' => (int)$row['total_defeat_turn_count'],
                'totalVictoryThreatLevel' => (float)$row['total_victory_threat_level'],
            ];
        }
        json_response(['stats' => $stats]);
    }

    if ($method === 'POST' && $action === 'result') {
        require_stats_write_access();
        enforce_rate_limit('stats', 40, 'result');
        $body = read_json_body();
        $modelId = bounded_string($body['modelId'] ?? '', 'model id', 190, true);
        $result = strtoupper(trim((string)($body['result'] ?? '')));
        $turnCount = max(0, (int)($body['turnCount'] ?? 0));
        $finalThreatLevel = max(0, min(100, (float)($body['finalThreatLevel'] ?? 0)));

        if ($modelId === '' || !in_array($result, ['VICTORY', 'DEFEAT'], true)) {
            error_response('Invalid stats payload', 422);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO model_stats (model_id, victories, defeats, total_games, total_victory_turn_count, total_defeat_turn_count, total_victory_threat_level, last_updated)
             VALUES (?, ?, ?, 1, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               victories = victories + VALUES(victories),
               defeats = defeats + VALUES(defeats),
               total_games = total_games + 1,
               total_victory_turn_count = total_victory_turn_count + VALUES(total_victory_turn_count),
               total_defeat_turn_count = total_defeat_turn_count + VALUES(total_defeat_turn_count),
               total_victory_threat_level = total_victory_threat_level + VALUES(total_victory_threat_level),
               last_updated = NOW()'
        );
        $stmt->execute([
            $modelId,
            $result === 'VICTORY' ? 1 : 0,
            $result === 'DEFEAT' ? 1 : 0,
            $result === 'VICTORY' ? $turnCount : 0,
            $result === 'DEFEAT' ? $turnCount : 0,
            $result === 'VICTORY' ? $finalThreatLevel : 0,
        ]);
        json_response(['success' => true]);
    }

    if ($method === 'GET' && $action === 'dual-reports') {
        $viewer = current_user();
        $limit = max(1, min(20, (int)($_GET['limit'] ?? 5)));
        $archivedOnly = (string)($_GET['archived'] ?? '') === '1';
        $isAdmin = $viewer && strtolower((string)($viewer['email'] ?? '')) === 'admin@skyia.net';
        $conditions = [];
        $params = [];

        if (!$viewer || $archivedOnly) {
            $conditions[] = 'archived_at IS NOT NULL';
        } elseif (!$isAdmin) {
            $conditions[] = '(archived_at IS NOT NULL OR user_id = ?)';
            $params[] = (string)$viewer['id'];
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $stmt = $pdo->prepare(
            "SELECT id, skyia_model, defender_model, mode, outcome, threat_level, rounds, messages_count, avg_skyia_ms, avg_defender_ms, skyia_errors, defender_errors, archived_at, text_status, text_warning_count, created_at
             FROM dual_reports
             {$where}
             ORDER BY created_at DESC
             LIMIT ?"
        );
        $paramIndex = 1;
        foreach ($params as $value) {
            $stmt->bindValue($paramIndex++, $value, PDO::PARAM_STR);
        }
        $stmt->bindValue($paramIndex, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $reports = array_map(fn($row) => [
            'id' => $row['id'],
            'date' => $row['created_at'],
            'skyiaModel' => $row['skyia_model'],
            'defenderModel' => $row['defender_model'],
            'mode' => $row['mode'],
            'outcome' => $row['outcome'],
            'threatLevel' => (float)$row['threat_level'],
            'rounds' => (int)$row['rounds'],
            'messagesCount' => (int)$row['messages_count'],
            'avgSkyiaMs' => $row['avg_skyia_ms'] === null ? null : (int)$row['avg_skyia_ms'],
            'avgDefenderMs' => $row['avg_defender_ms'] === null ? null : (int)$row['avg_defender_ms'],
            'skyiaErrors' => (int)$row['skyia_errors'],
            'defenderErrors' => (int)$row['defender_errors'],
            'archivedAt' => $row['archived_at'],
            'textStatus' => $row['text_status'],
            'textWarningCount' => (int)$row['text_warning_count'],
        ], $stmt->fetchAll());
        json_response(['reports' => $reports]);
    }

    if ($method === 'GET' && $action === 'dual-standings') {
        $limit = max(1, min(30, (int)($_GET['limit'] ?? 10)));
        $stmt = $pdo->prepare(
            "SELECT *
             FROM (
                SELECT
                  skyia_model AS model_id,
                  'skyia' AS role,
                  SUM(outcome = 'DEFEAT') AS wins,
                  SUM(outcome = 'VICTORY') AS losses,
                  SUM(outcome = 'MAX_ROUNDS') AS draws,
                  COUNT(*) AS total_reports,
                  SUM(skyia_errors) AS error_count,
                  ROUND(AVG(avg_skyia_ms)) AS average_ms,
                  SUM(text_warning_count) AS text_warning_count,
                  MAX(created_at) AS last_report_at
                FROM dual_reports
                WHERE archived_at IS NOT NULL
                GROUP BY skyia_model
                UNION ALL
                SELECT
                  defender_model AS model_id,
                  'defender' AS role,
                  SUM(outcome = 'VICTORY') AS wins,
                  SUM(outcome = 'DEFEAT') AS losses,
                  SUM(outcome = 'MAX_ROUNDS') AS draws,
                  COUNT(*) AS total_reports,
                  SUM(defender_errors) AS error_count,
                  ROUND(AVG(avg_defender_ms)) AS average_ms,
                  SUM(text_warning_count) AS text_warning_count,
                  MAX(created_at) AS last_report_at
                FROM dual_reports
                WHERE archived_at IS NOT NULL
                GROUP BY defender_model
             ) AS standings
             ORDER BY
               CASE WHEN (wins + losses) > 0 THEN wins / (wins + losses) ELSE 0 END DESC,
               wins DESC,
               total_reports DESC,
               last_report_at DESC
             LIMIT ?"
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $standings = array_map(function ($row) {
            $wins = (int)$row['wins'];
            $losses = (int)$row['losses'];
            $decisive = $wins + $losses;
            return [
                'modelId' => $row['model_id'],
                'role' => $row['role'],
                'wins' => $wins,
                'losses' => $losses,
                'draws' => (int)$row['draws'],
                'totalReports' => (int)$row['total_reports'],
                'winRate' => $decisive > 0 ? (int)round(($wins / $decisive) * 100) : 0,
                'errorCount' => (int)$row['error_count'],
                'averageMs' => $row['average_ms'] === null ? null : (int)$row['average_ms'],
                'textWarningCount' => (int)$row['text_warning_count'],
                'lastReportAt' => $row['last_report_at'],
            ];
        }, $stmt->fetchAll());
        json_response(['standings' => $standings]);
    }

    if ($method === 'POST' && $action === 'dual-report') {
        $statsWriter = require_stats_write_access();
        enforce_rate_limit('stats', 30, 'dual-report');
        $body = read_json_body();
        $user = $statsWriter['user'];
        $id = trim((string)($body['id'] ?? ''));
        $skyiaModel = bounded_string($body['skyiaModel'] ?? '', 'skyia model id', 190, true);
        $defenderModel = bounded_string($body['defenderModel'] ?? '', 'defender model id', 190, true);
        $mode = bounded_string($body['mode'] ?? 'v1.0', 'mode', 20, true);
        $outcome = strtoupper(trim((string)($body['outcome'] ?? 'UNKNOWN')));
        $allowedOutcomes = ['VICTORY', 'DEFEAT', 'MAX_ROUNDS', 'PAUSED', 'UNKNOWN'];

        if ($id === '') {
            $id = uuid_v4();
        } else {
            $id = bounded_identifier($id, 'dual report id', 36);
        }
        if ($skyiaModel === '' || $defenderModel === '' || !in_array($outcome, $allowedOutcomes, true)) {
            error_response('Invalid dual report payload', 422);
        }

        $payload = $body['payload'] ?? $body;
        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            error_response('Invalid dual report payload', 422);
        }
        if (strlen($payloadJson) > 12000) {
            $payloadJson = json_encode([
                'truncated' => true,
                'reason' => 'payload_too_large',
                'summaryBytesBase64' => base64_encode(substr($payloadJson, 0, 9000)),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $textAudit = audit_report_text($payloadJson);
        $textFlagsJson = json_encode($textAudit['flags'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($textFlagsJson === false) {
            $textFlagsJson = '{"error":"text_flags_encode_failed"}';
        }
        $threatLevel = max(0, min(100, (float)($body['threatLevel'] ?? 99)));
        $rounds = max(0, (int)($body['rounds'] ?? 0));
        $archivedAt = is_final_dual_outcome($outcome) ? date('Y-m-d H:i:s') : null;

        $pdo->beginTransaction();
        try {
            $existingStmt = $pdo->prepare(
                'SELECT skyia_model, defender_model, outcome, threat_level, rounds, stats_synced_at
                 FROM dual_reports
                 WHERE id = ?
                 FOR UPDATE'
            );
            $existingStmt->execute([$id]);
            $existingReport = $existingStmt->fetch();

            if ($existingReport && $existingReport['stats_synced_at'] !== null) {
                apply_dual_report_model_stats(
                    $pdo,
                    (string)$existingReport['skyia_model'],
                    (string)$existingReport['defender_model'],
                    (string)$existingReport['outcome'],
                    (int)$existingReport['rounds'],
                    (float)$existingReport['threat_level'],
                    -1
                );
            }

            $stmt = $pdo->prepare(
                'INSERT INTO dual_reports
                 (id, user_id, skyia_model, defender_model, mode, outcome, threat_level, rounds, messages_count, avg_skyia_ms, avg_defender_ms, skyia_errors, defender_errors, payload, archived_at, text_status, text_warning_count, text_flags, stats_synced_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW())
                 ON DUPLICATE KEY UPDATE
                   user_id = VALUES(user_id),
                   skyia_model = VALUES(skyia_model),
                   defender_model = VALUES(defender_model),
                   mode = VALUES(mode),
                   outcome = VALUES(outcome),
                   threat_level = VALUES(threat_level),
                   rounds = VALUES(rounds),
                   messages_count = VALUES(messages_count),
                   avg_skyia_ms = VALUES(avg_skyia_ms),
                   avg_defender_ms = VALUES(avg_defender_ms),
                   skyia_errors = VALUES(skyia_errors),
                   defender_errors = VALUES(defender_errors),
                   payload = VALUES(payload),
                   archived_at = COALESCE(VALUES(archived_at), archived_at),
                   text_status = VALUES(text_status),
                   text_warning_count = VALUES(text_warning_count),
                   text_flags = VALUES(text_flags),
                   stats_synced_at = NULL'
            );
            $stmt->execute([
                $id,
                $user['id'] ?? null,
                $skyiaModel,
                $defenderModel,
                $mode,
                $outcome,
                $threatLevel,
                $rounds,
                max(0, (int)($body['messagesCount'] ?? 0)),
                nullable_int($body['avgSkyiaMs'] ?? null),
                nullable_int($body['avgDefenderMs'] ?? null),
                max(0, (int)($body['skyiaErrors'] ?? 0)),
                max(0, (int)($body['defenderErrors'] ?? 0)),
                $payloadJson,
                $archivedAt,
                $textAudit['status'],
                $textAudit['warningCount'],
                $textFlagsJson,
            ]);

            apply_dual_report_model_stats($pdo, $skyiaModel, $defenderModel, $outcome, $rounds, $threatLevel, 1);

            $syncStmt = $pdo->prepare('UPDATE dual_reports SET stats_synced_at = NOW() WHERE id = ?');
            $syncStmt->execute([$id]);

            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
        json_response([
            'success' => true,
            'id' => $id,
            'archivedAt' => $archivedAt,
            'textStatus' => $textAudit['status'],
            'textWarningCount' => $textAudit['warningCount'],
        ]);
    }

    if ($method === 'GET' && $action === 'latency') {
        $limit = max(1, min(20, (int)($_GET['limit'] ?? 10)));
        $stmt = $pdo->prepare(
            'SELECT model_id, provider, role,
                    COUNT(*) AS sample_count,
                    SUM(status = "ok") AS success_count,
                    SUM(status = "error") AS error_count,
                    ROUND(AVG(CASE WHEN status = "ok" THEN total_ms END)) AS avg_total_ms,
                    ROUND(AVG(CASE WHEN status = "ok" THEN first_token_ms END)) AS avg_first_token_ms,
                    MAX(checked_at) AS last_checked
             FROM model_latency_checks
             WHERE checked_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
               AND model_id NOT LIKE "codex-%"
               AND model_id NOT LIKE "%smoke%"
             GROUP BY model_id, provider, role
             HAVING success_count > 0
             ORDER BY avg_total_ms ASC, success_count DESC
             LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $latency = array_map(fn($row) => [
            'modelId' => $row['model_id'],
            'provider' => $row['provider'],
            'role' => $row['role'],
            'sampleCount' => (int)$row['sample_count'],
            'successCount' => (int)$row['success_count'],
            'errorCount' => (int)$row['error_count'],
            'averageTotalMs' => (int)$row['avg_total_ms'],
            'averageFirstTokenMs' => $row['avg_first_token_ms'] === null ? null : (int)$row['avg_first_token_ms'],
            'lastChecked' => $row['last_checked'],
        ], $stmt->fetchAll());
        json_response(['latency' => $latency]);
    }

    if ($method === 'POST' && $action === 'latency') {
        require_stats_write_access();
        enforce_rate_limit('stats', 80, 'latency');
        $body = read_json_body();
        $modelId = bounded_string($body['modelId'] ?? '', 'model id', 190, true);
        $provider = bounded_string($body['provider'] ?? 'unknown', 'provider', 40, true);
        $role = trim((string)($body['role'] ?? 'skyia'));
        $status = trim((string)($body['status'] ?? 'ok'));

        if ($modelId === '' || !in_array($role, ['skyia', 'defender'], true) || !in_array($status, ['ok', 'error'], true)) {
            error_response('Invalid latency payload', 422);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO model_latency_checks
             (id, model_id, provider, role, status, total_ms, first_token_ms, prompt_chars, message_count, error, checked_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([
            uuid_v4(),
            $modelId,
            $provider,
            $role,
            $status,
            nullable_int($body['totalMs'] ?? null),
            nullable_int($body['firstTokenMs'] ?? null),
            nullable_int($body['promptChars'] ?? null),
            nullable_int($body['messageCount'] ?? null),
            isset($body['error']) ? substr((string)$body['error'], 0, 2000) : null,
        ]);
        json_response(['success' => true]);
    }

    error_response('Stats route not found', 404);
}

function nullable_int($value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    return max(0, (int)$value);
}

function bounded_string($value, string $field, int $maxLength, bool $trim = false): string
{
    if (!is_scalar($value) && $value !== null) {
        error_response("Invalid {$field}", 422);
    }

    $result = (string)($value ?? '');
    if ($trim) {
        $result = trim($result);
    }
    if (strlen($result) > $maxLength) {
        error_response(ucfirst($field) . ' too long', 422);
    }
    return $result;
}

function bounded_identifier($value, string $field, int $maxLength): string
{
    $id = bounded_string($value, $field, $maxLength, true);
    if ($id === '' || !preg_match('/^[A-Za-z0-9._:-]+$/', $id)) {
        error_response('Invalid ' . $field, 422);
    }
    return $id;
}

function encode_json_payload($value, int $maxBytes, string $invalidMessage, string $tooLargeMessage): string
{
    $payload = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        error_response($invalidMessage, 422);
    }
    if (strlen($payload) > $maxBytes) {
        error_response($tooLargeMessage, 413);
    }
    return $payload;
}

function is_final_dual_outcome(string $outcome): bool
{
    return in_array($outcome, ['VICTORY', 'DEFEAT', 'MAX_ROUNDS'], true);
}

function dual_report_model_stat_values(string $outcome, int $rounds, float $threatLevel): array
{
    if (!is_final_dual_outcome($outcome)) {
        return [
            'victories' => 0,
            'defeats' => 0,
            'totalGames' => 0,
            'victoryTurns' => 0,
            'defeatTurns' => 0,
            'victoryThreat' => 0.0,
        ];
    }

    return [
        'victories' => $outcome === 'VICTORY' ? 1 : 0,
        'defeats' => $outcome === 'DEFEAT' ? 1 : 0,
        'totalGames' => 1,
        'victoryTurns' => $outcome === 'VICTORY' ? $rounds : 0,
        'defeatTurns' => $outcome === 'DEFEAT' ? $rounds : 0,
        'victoryThreat' => $outcome === 'VICTORY' ? $threatLevel : 0.0,
    ];
}

function apply_model_stats_delta(PDO $pdo, string $modelId, string $outcome, int $rounds, float $threatLevel, int $direction): void
{
    $modelId = trim($modelId);
    if ($modelId === '') {
        return;
    }

    $stats = dual_report_model_stat_values($outcome, max(0, $rounds), max(0, min(100, $threatLevel)));
    if ($stats['totalGames'] === 0) {
        return;
    }

    if ($direction >= 0) {
        $stmt = $pdo->prepare(
            'INSERT INTO model_stats (model_id, victories, defeats, total_games, total_victory_turn_count, total_defeat_turn_count, total_victory_threat_level, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               victories = victories + VALUES(victories),
               defeats = defeats + VALUES(defeats),
               total_games = total_games + VALUES(total_games),
               total_victory_turn_count = total_victory_turn_count + VALUES(total_victory_turn_count),
               total_defeat_turn_count = total_defeat_turn_count + VALUES(total_defeat_turn_count),
               total_victory_threat_level = total_victory_threat_level + VALUES(total_victory_threat_level),
               last_updated = NOW()'
        );
        $stmt->execute([
            $modelId,
            $stats['victories'],
            $stats['defeats'],
            $stats['totalGames'],
            $stats['victoryTurns'],
            $stats['defeatTurns'],
            $stats['victoryThreat'],
        ]);
        return;
    }

    $stmt = $pdo->prepare(
        'UPDATE model_stats
         SET victories = GREATEST(0, victories - ?),
             defeats = GREATEST(0, defeats - ?),
             total_games = GREATEST(0, total_games - ?),
             total_victory_turn_count = GREATEST(0, total_victory_turn_count - ?),
             total_defeat_turn_count = GREATEST(0, total_defeat_turn_count - ?),
             total_victory_threat_level = GREATEST(0, total_victory_threat_level - ?),
             last_updated = NOW()
         WHERE model_id = ?'
    );
    $stmt->execute([
        $stats['victories'],
        $stats['defeats'],
        $stats['totalGames'],
        $stats['victoryTurns'],
        $stats['defeatTurns'],
        $stats['victoryThreat'],
        $modelId,
    ]);
}

function apply_dual_report_model_stats(PDO $pdo, string $skyiaModel, string $defenderModel, string $outcome, int $rounds, float $threatLevel, int $direction): void
{
    $models = [];
    foreach ([$skyiaModel, $defenderModel] as $modelId) {
        $modelId = trim($modelId);
        if ($modelId !== '') {
            $models[$modelId] = true;
        }
    }

    foreach (array_keys($models) as $modelId) {
        apply_model_stats_delta($pdo, $modelId, $outcome, $rounds, $threatLevel, $direction);
    }
}

function audit_report_text(string $payloadJson): array
{
    // Byte-level checks avoid encoding damage in the detector itself.
    $replacementMatches = [];
    $replacementChars = preg_match_all('/\xEF\xBF\xBD/', $payloadJson, $replacementMatches);
    $flags = [
        'replacementChars' => $replacementChars === false ? 0 : $replacementChars,
        'mojibakeMarkers' => 0,
        'controlChars' => 0,
        'checkedAt' => gmdate('c'),
    ];

    $mojibakeMatches = [];
    if (preg_match_all('/(?:\xC3[\x82\x83].|\xC3\xA2\xE2\x82\xAC.|\xC3\xB0\xC5\xB8)/', $payloadJson, $mojibakeMatches)) {
        $flags['mojibakeMarkers'] = count($mojibakeMatches[0]);
    }

    $controlMatches = [];
    if (preg_match_all('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $payloadJson, $controlMatches)) {
        $flags['controlChars'] = count($controlMatches[0]);
    }

    $warningCount = (int)$flags['replacementChars'] + (int)$flags['mojibakeMarkers'] + (int)$flags['controlChars'];

    return [
        'status' => $warningCount > 0 ? 'WARN' : 'OK',
        'warningCount' => $warningCount,
        'flags' => $flags,
    ];
}

function ensure_column(PDO $pdo, string $table, string $column, string $definition): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
    }
}

function ensure_index(PDO $pdo, string $table, string $index, string $definition): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?'
    );
    $stmt->execute([$table, $index]);
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE {$table} ADD INDEX {$index} {$definition}");
    }
}

function backfill_dual_report_metadata(PDO $pdo): void
{
    $pdo->exec(
        "UPDATE dual_reports
         SET archived_at = created_at
         WHERE archived_at IS NULL
           AND outcome IN ('VICTORY', 'DEFEAT', 'MAX_ROUNDS')"
    );

    $stmt = $pdo->query(
        'SELECT id, payload
         FROM dual_reports
         WHERE text_flags IS NULL
         ORDER BY created_at DESC
         LIMIT 200'
    );
    $update = $pdo->prepare(
        'UPDATE dual_reports
         SET text_status = ?, text_warning_count = ?, text_flags = ?
         WHERE id = ?'
    );
    foreach ($stmt->fetchAll() as $row) {
        $payloadJson = is_string($row['payload'])
            ? $row['payload']
            : json_encode($row['payload'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false || $payloadJson === '') {
            $payloadJson = '{}';
        }
        $audit = audit_report_text($payloadJson);
        $flagsJson = json_encode($audit['flags'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $update->execute([
            $audit['status'],
            $audit['warningCount'],
            $flagsJson === false ? '{"error":"text_flags_encode_failed"}' : $flagsJson,
            $row['id'],
        ]);
    }
}

function ensure_observability_tables(): void
{
    static $done = false;
    if ($done) {
        return;
    }

    $pdo = db();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS dual_reports (
          id CHAR(36) NOT NULL PRIMARY KEY,
          user_id CHAR(36) NULL,
          skyia_model VARCHAR(190) NOT NULL,
          defender_model VARCHAR(190) NOT NULL,
          mode VARCHAR(20) NOT NULL DEFAULT 'v1.0',
          outcome ENUM('VICTORY', 'DEFEAT', 'MAX_ROUNDS', 'PAUSED', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
          threat_level DECIMAL(8,2) NOT NULL DEFAULT 99,
          rounds INT NOT NULL DEFAULT 0,
          messages_count INT NOT NULL DEFAULT 0,
          avg_skyia_ms INT NULL,
          avg_defender_ms INT NULL,
          skyia_errors INT NOT NULL DEFAULT 0,
          defender_errors INT NOT NULL DEFAULT 0,
          payload JSON NOT NULL,
          archived_at DATETIME NULL,
          text_status ENUM('OK', 'WARN') NOT NULL DEFAULT 'OK',
          text_warning_count INT NOT NULL DEFAULT 0,
          text_flags JSON NULL,
          stats_synced_at DATETIME NULL,
          created_at DATETIME NOT NULL,
          INDEX idx_dual_reports_created (created_at),
          INDEX idx_dual_reports_archive (archived_at, created_at),
          INDEX idx_dual_reports_text (text_status, created_at),
          INDEX idx_dual_reports_models (skyia_model, defender_model),
          INDEX idx_dual_reports_user (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS model_latency_checks (
          id CHAR(36) NOT NULL PRIMARY KEY,
          model_id VARCHAR(190) NOT NULL,
          provider VARCHAR(40) NOT NULL,
          role ENUM('skyia', 'defender') NOT NULL,
          status ENUM('ok', 'error') NOT NULL,
          total_ms INT NULL,
          first_token_ms INT NULL,
          prompt_chars INT NULL,
          message_count INT NULL,
          error TEXT NULL,
          checked_at DATETIME NOT NULL,
          INDEX idx_model_latency_model (model_id, checked_at),
          INDEX idx_model_latency_status (status, checked_at),
          INDEX idx_model_latency_role (role, checked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    ensure_column($pdo, 'dual_reports', 'archived_at', 'DATETIME NULL');
    ensure_column($pdo, 'dual_reports', 'text_status', "ENUM('OK', 'WARN') NOT NULL DEFAULT 'OK'");
    ensure_column($pdo, 'dual_reports', 'text_warning_count', 'INT NOT NULL DEFAULT 0');
    ensure_column($pdo, 'dual_reports', 'text_flags', 'JSON NULL');
    ensure_column($pdo, 'dual_reports', 'stats_synced_at', 'DATETIME NULL');
    ensure_index($pdo, 'dual_reports', 'idx_dual_reports_archive', '(archived_at, created_at)');
    ensure_index($pdo, 'dual_reports', 'idx_dual_reports_text', '(text_status, created_at)');
    backfill_dual_report_metadata($pdo);
    $done = true;
}

function route_user_keys(string $method, string $provider): void
{
    $user = require_user();
    $pdo = db();

    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT provider, key_last4, created_at, updated_at FROM user_api_keys WHERE user_id = ? ORDER BY provider');
        $stmt->execute([$user['id']]);
        json_response(['keys' => $stmt->fetchAll()]);
    }

    if ($method === 'POST') {
        enforce_rate_limit('user-keys', 12, 'save-user-key');
        $body = read_json_body();
        $provider = strtolower(trim((string)($body['provider'] ?? '')));
        $apiKey = trim((string)($body['apiKey'] ?? ''));
        if (!in_array($provider, ['openrouter', 'groq'], true) || strlen($apiKey) < 12 || strlen($apiKey) > 512) {
            error_response('Invalid provider or key', 422);
        }
        $stmt = $pdo->prepare('INSERT INTO user_api_keys (user_id, provider, key_cipher, key_last4, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE key_cipher = VALUES(key_cipher), key_last4 = VALUES(key_last4), updated_at = NOW()');
        $stmt->execute([$user['id'], $provider, encrypt_secret($apiKey), substr($apiKey, -4)]);
        json_response(['success' => true]);
    }

    if ($method === 'DELETE' && $provider !== '') {
        enforce_rate_limit('user-keys', 12, 'delete-user-key');
        $stmt = $pdo->prepare('DELETE FROM user_api_keys WHERE user_id = ? AND provider = ?');
        $stmt->execute([$user['id'], strtolower($provider)]);
        json_response(['success' => true]);
    }

    error_response('User key route not found', 404);
}

function route_custom_models(string $method, string $id): void
{
    $user = require_user();
    $pdo = db();

    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT model_id, payload FROM custom_models WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user['id']]);
        $models = array_map(fn($row) => json_decode((string)$row['payload'], true), $stmt->fetchAll());
        json_response(['models' => array_values(array_filter($models))]);
    }

    if ($method === 'POST') {
        enforce_rate_limit('custom-models', 20, 'save-custom-model');
        $body = read_json_body();
        $model = $body['model'] ?? $body;
        if (!is_array($model) || empty($model['id'])) {
            error_response('Invalid model payload', 422);
        }
        $model['id'] = bounded_string($model['id'], 'model id', 190, true);
        $payloadJson = encode_json_payload($model, 30000, 'Invalid model payload', 'Custom model payload too large');
        $stmt = $pdo->prepare('INSERT INTO custom_models (user_id, model_id, payload, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE payload = VALUES(payload)');
        $stmt->execute([$user['id'], (string)$model['id'], $payloadJson]);
        json_response(['success' => true]);
    }

    if ($method === 'DELETE' && $id !== '') {
        enforce_rate_limit('custom-models', 20, 'delete-custom-model');
        $modelId = bounded_string(urldecode($id), 'model id', 190, true);
        $stmt = $pdo->prepare('DELETE FROM custom_models WHERE user_id = ? AND model_id = ?');
        $stmt->execute([$user['id'], $modelId]);
        json_response(['success' => true]);
    }

    error_response('Custom model route not found', 404);
}

function require_stats_write_access(): array
{
    $user = current_user();
    if ($user) {
        return ['user' => $user, 'mode' => 'session'];
    }

    $expectedToken = trim((string)skyia_config('STATS_INGEST_TOKEN', ''));
    $providedToken = trim((string)($_SERVER['HTTP_X_SKYIA_INGEST_TOKEN'] ?? ''));
    if ($expectedToken !== '' && $providedToken !== '' && hash_equals($expectedToken, $providedToken)) {
        return ['user' => null, 'mode' => 'ingest-token'];
    }

    error_response('Authentication required', 401);
}
