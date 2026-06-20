const fs = require('fs');
const path = require('path');

const root = process.cwd();
const source = path.join(root, 'api');
const target = path.join(root, 'dist', 'api');
const centralEnv = 'D:/00_Cerveau_IA/API/env.Local';
const shouldExportRuntimeConfig = ['1', 'true', 'yes']
  .includes(String(process.env.SKYIA_EXPORT_RUNTIME_CONFIG || '').trim().toLowerCase());
const projectEnvMap = {
  SKYIA_APP_URL: ['SKYIA_APP_URL', 'APP_URL'],
  SKYIA_ALLOWED_ORIGINS: ['SKYIA_ALLOWED_ORIGINS', 'ALLOWED_ORIGINS'],
  SKYIA_APP_SECRET: ['SKYIA_APP_SECRET', 'APP_SECRET'],
  SKYIA_DB_HOST: ['SKYIA_DB_HOST', 'DB_HOST', 'MYSQL_HOST'],
  SKYIA_DB_NAME: ['SKYIA_DB_NAME', 'DB_NAME', 'MYSQL_DATABASE'],
  SKYIA_DB_USER: ['SKYIA_DB_USER', 'DB_USER', 'MYSQL_USER'],
  SKYIA_DB_PASS: ['SKYIA_DB_PASS', 'DB_PASS', 'MYSQL_PASSWORD'],
  SKYIA_OPENROUTER_API_KEY: ['SKYIA_OPENROUTER_API_KEY', 'OPENROUTER_API_KEY', 'OPEN_ROUTEUR_API_KEY', 'OPENROUTEUR_API_KEY'],
  SKYIA_GROQ_API_KEY: ['SKYIA_GROQ_API_KEY', 'GROQ_API_KEY'],
  SKYIA_GROQ_FREE_MODELS: ['SKYIA_GROQ_FREE_MODELS', 'GROQ_FREE_MODELS'],
  SKYIA_DISABLED_MODELS: ['SKYIA_DISABLED_MODELS', 'DISABLED_MODELS'],
  SKYIA_STATS_INGEST_TOKEN: ['SKYIA_STATS_INGEST_TOKEN', 'STATS_INGEST_TOKEN'],
  SKYIA_DEBUG_ERRORS: ['SKYIA_DEBUG_ERRORS', 'DEBUG_ERRORS'],
};

if (!fs.existsSync(source)) {
  throw new Error('Missing api directory');
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

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

const phpExport = (value) => {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
};

const envValues = loadEnvFile(centralEnv);
const distilledEnv = Object.entries(projectEnvMap).reduce((acc, [targetKey, candidates]) => {
  const sourceKey = candidates.find((candidate) => {
    const value = envValues[candidate];
    return typeof value === 'string' && value !== '';
  });
  if (sourceKey) {
    acc[targetKey] = envValues[sourceKey];
  }
  return acc;
}, {});

const configTarget = path.join(target, 'config.local.php');

if (shouldExportRuntimeConfig && Object.keys(distilledEnv).length > 0) {
  const sortedEntries = Object.entries(distilledEnv).sort(([a], [b]) => a.localeCompare(b));
  const payload = [
    '<?php',
    '',
    'return [',
    ...sortedEntries.map(([key, value]) => `    ${phpExport(key)} => ${phpExport(value)},`),
    '];',
    '',
  ].join('\n');
  fs.writeFileSync(configTarget, payload, 'utf8');
  console.log('Generated dist/api/config.local.php from allowlisted project env values');
} else {
  fs.rmSync(configTarget, { force: true });
  if (Object.keys(distilledEnv).length > 0) {
    console.log('Skipped dist/api/config.local.php generation; set SKYIA_EXPORT_RUNTIME_CONFIG=1 to export runtime secrets intentionally.');
  }
}

console.log('Copied api/ to dist/api/');
