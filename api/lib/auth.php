<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

function get_user_by_id(string $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function get_user_by_email(string $email): ?array
{
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function public_user(array $user): array
{
    return [
        'uid' => $user['id'],
        'email' => $user['email'],
        'displayName' => $user['display_name'],
        'isAnonymous' => false,
    ];
}

function user_profile(array $user): array
{
    return [
        'uid' => $user['id'],
        'email' => $user['email'],
        'displayName' => $user['display_name'],
        'createdAt' => $user['created_at'],
        'stats' => [
            'gamesPlayed' => (int)$user['games_played'],
            'victories' => (int)$user['victories'],
            'defeats' => (int)$user['defeats'],
            'totalCreditsUsed' => (int)$user['total_credits_used'],
            'availableCredits' => (int)$user['available_credits'],
            'lastPlayed' => $user['last_played'],
        ],
        'customModels' => get_custom_models_for_user($user['id']),
    ];
}

function get_custom_models_for_user(string $userId): array
{
    $stmt = db()->prepare('SELECT payload FROM custom_models WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $models = [];
    foreach ($stmt->fetchAll() as $row) {
        $model = json_decode((string)$row['payload'], true);
        if (is_array($model)) {
            $models[] = $model;
        }
    }
    return $models;
}

function start_user_session(array $user): void
{
    prune_expired_sessions();
    prune_excess_user_sessions((string)$user['id']);
    $token = bin2hex(random_bytes(32));
    $hash = hash('sha256', $token);
    $expires = (new DateTimeImmutable('+30 days'))->format('Y-m-d H:i:s');
    $stmt = db()->prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, NOW())');
    $stmt->execute([$hash, $user['id'], $expires]);

    setcookie('skyia_session', $token, session_cookie_options(time() + 60 * 60 * 24 * 30));
}

function session_token(): ?string
{
    if (!empty($_COOKIE['skyia_session'])) {
        return (string)$_COOKIE['skyia_session'];
    }

    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($auth, 'Bearer ')) {
        return trim(substr($auth, 7));
    }

    return null;
}

function current_user(): ?array
{
    prune_expired_sessions();
    $token = session_token();
    if (!$token) {
        return null;
    }

    $hash = hash('sha256', $token);
    $stmt = db()->prepare('SELECT u.* FROM auth_sessions s INNER JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > NOW() LIMIT 1');
    $stmt->execute([$hash]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        error_response('Authentication required', 401);
    }
    return $user;
}

function end_user_session(): void
{
    $token = session_token();
    if ($token) {
        $stmt = db()->prepare('DELETE FROM auth_sessions WHERE token_hash = ?');
        $stmt->execute([hash('sha256', $token)]);
    }
    setcookie('skyia_session', '', session_cookie_options(time() - 3600));
}

function session_cookie_options(int $expires): array
{
    return [
        'expires' => $expires,
        'path' => '/',
        'secure' => is_secure_request(),
        'httponly' => true,
        'samesite' => 'Strict',
    ];
}

function prune_expired_sessions(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->exec('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
    } catch (Throwable) {
    }
}

function prune_excess_user_sessions(string $userId): void
{
    if ($userId === '') {
        return;
    }

    try {
        $stmt = db()->prepare(
            'DELETE FROM auth_sessions
             WHERE user_id = ?
               AND token_hash NOT IN (
                   SELECT token_hash
                   FROM (
                       SELECT token_hash
                       FROM auth_sessions
                       WHERE user_id = ?
                       ORDER BY created_at DESC
                       LIMIT 4
                   ) AS recent_sessions
               )'
        );
        $stmt->execute([$userId, $userId]);
    } catch (Throwable) {
    }
}

function encrypt_secret(string $plain): string
{
    $key = hash('sha256', app_secret(), true);
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipher === false) {
        throw new RuntimeException('Secret encryption failed');
    }
    return base64_encode(json_encode([
        'iv' => base64_encode($iv),
        'tag' => base64_encode($tag),
        'cipher' => base64_encode($cipher),
    ]));
}

function decrypt_secret(string $payload): string
{
    $data = json_decode(base64_decode($payload, true) ?: '', true);
    if (!is_array($data)) {
        return '';
    }
    $key = hash('sha256', app_secret(), true);
    $plain = openssl_decrypt(
        base64_decode((string)$data['cipher'], true) ?: '',
        'aes-256-gcm',
        $key,
        OPENSSL_RAW_DATA,
        base64_decode((string)$data['iv'], true) ?: '',
        base64_decode((string)$data['tag'], true) ?: ''
    );
    return $plain === false ? '' : $plain;
}
