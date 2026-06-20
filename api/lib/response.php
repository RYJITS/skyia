<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function allowed_origins(): array
{
    return array_values(array_filter(array_map('trim', explode(',', (string)skyia_config('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:4173,https://skyia.net')))));
}

function is_allowed_origin(string $origin): bool
{
    return $origin !== '' && in_array($origin, allowed_origins(), true);
}

function request_origin(): string
{
    return trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
}

function is_secure_request(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    $forwardedProto = strtolower(trim((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));
    if ($forwardedProto === 'https') {
        return true;
    }

    $appUrl = trim((string)skyia_config('APP_URL', ''));
    return $appUrl !== '' && str_starts_with(strtolower($appUrl), 'https://');
}

function apply_security_headers(): void
{
    header("Content-Security-Policy: default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-Robots-Tag: noindex, nofollow');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()');
    if (is_secure_request()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function cors_headers(): void
{
    $origin = request_origin();

    apply_security_headers();
    header('Vary: Origin');

    if ($origin !== '' && !is_allowed_origin($origin)) {
        error_response('Origin not allowed', 403);
    }

    if (is_allowed_origin($origin)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Skyia-Ingest-Token');
    header('Access-Control-Max-Age: 600');
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(string $message, int $status = 400, array $extra = []): void
{
    json_response(array_merge(['error' => $message], $extra), $status);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 262144) {
        error_response('JSON body too large', 413);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        error_response('Invalid JSON body', 400);
    }
    return $data;
}

function require_method(array $allowed): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'], $allowed, true)) {
        error_response('Method not allowed', 405);
    }
}

function enforce_cookie_csrf_protection(): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        return;
    }

    if (empty($_COOKIE['skyia_session'])) {
        return;
    }

    $origin = request_origin();
    if (!is_allowed_origin($origin)) {
        error_response('Origin not allowed', 403);
    }
}
