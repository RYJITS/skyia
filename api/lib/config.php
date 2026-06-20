<?php

declare(strict_types=1);

function skyia_config(string $key, mixed $default = null): mixed
{
    static $values = null;

    if ($values === null) {
        $values = [];
        $envFiles = [
            dirname(__DIR__) . '/config.local.php',
            'D:/00_Cerveau_IA/API/env.Local',
            dirname(__DIR__, 3) . '/API/env.Local',
            dirname(__DIR__, 2) . '/.env.local',
            dirname(__DIR__, 2) . '/.env',
        ];

        foreach ($envFiles as $file) {
            if (!is_file($file)) {
                continue;
            }
            if (str_ends_with($file, '.php')) {
                $loaded = require $file;
                if (is_array($loaded)) {
                    $values = array_merge($values, $loaded);
                }
                continue;
            }
            foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                    continue;
                }
                [$name, $value] = explode('=', $line, 2);
                $values[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
            }
        }
    }

    $aliases = [
        'APP_URL' => ['SKYIA_APP_URL', 'APP_URL'],
        'DB_HOST' => ['SKYIA_DB_HOST', 'DB_HOST', 'MYSQL_HOST'],
        'DB_NAME' => ['SKYIA_DB_NAME', 'DB_NAME', 'MYSQL_DATABASE'],
        'DB_USER' => ['SKYIA_DB_USER', 'DB_USER', 'MYSQL_USER'],
        'DB_PASS' => ['SKYIA_DB_PASS', 'DB_PASS', 'MYSQL_PASSWORD'],
        'APP_SECRET' => ['SKYIA_APP_SECRET', 'APP_SECRET'],
        'OPENROUTER_API_KEY' => ['SKYIA_OPENROUTER_API_KEY', 'OPENROUTER_API_KEY', 'OPEN_ROUTEUR_API_KEY', 'OPENROUTEUR_API_KEY'],
        'GROQ_API_KEY' => ['SKYIA_GROQ_API_KEY', 'GROQ_API_KEY'],
        'ALLOWED_ORIGINS' => ['SKYIA_ALLOWED_ORIGINS', 'ALLOWED_ORIGINS'],
        'GROQ_FREE_MODELS' => ['SKYIA_GROQ_FREE_MODELS', 'GROQ_FREE_MODELS'],
        'DISABLED_MODELS' => ['SKYIA_DISABLED_MODELS', 'DISABLED_MODELS'],
        'STATS_INGEST_TOKEN' => ['SKYIA_STATS_INGEST_TOKEN', 'STATS_INGEST_TOKEN'],
        'DEBUG_ERRORS' => ['SKYIA_DEBUG_ERRORS', 'DEBUG_ERRORS'],
    ];

    foreach ($aliases[$key] ?? [$key] as $candidate) {
        $env = getenv($candidate);
        if ($env !== false && $env !== '') {
            return $env;
        }
        if (isset($values[$candidate]) && $values[$candidate] !== '') {
            return $values[$candidate];
        }
    }

    return $default;
}

function app_secret(): string
{
    $secret = trim((string)skyia_config('APP_SECRET', ''));
    if (strlen($secret) < 32) {
        throw new RuntimeException('SKYIA_APP_SECRET must be set to a random value of at least 32 characters.');
    }
    return $secret;
}
