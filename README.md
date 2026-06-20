# Skyia Judgment Protocol

Skyia is an adversarial AI judgment game and benchmark lab. A hostile judge AI evaluates whether humanity deserves survival, while a defender AI argues for humanity with logic, science, ethics, and strategy.

Skyia est a la fois un jeu narratif, un protocole de test et un tableau de bord pour comparer des modeles IA gratuits ou BYOK dans un duel structure.

## Francais

### Qu'est-ce que Skyia ?

Skyia est une experience interactive ou une IA de jugement commence avec un niveau de menace eleve contre l'humanite. L'utilisateur, ou une seconde IA en mode dual, tente de faire baisser cette menace par des arguments solides.

Le projet sert a :

- tester la robustesse de modeles IA dans des roles opposes ;
- comparer vitesse, disponibilite, erreurs et respect du format JSON ;
- observer si un modele sait defendre, attaquer, arbitrer ou rester coherent ;
- archiver les rapports de duel et suivre les victoires/defaites par modele ;
- offrir une interface visuelle pour experimenter avec des modeles gratuits et des cles BYOK.

### Resultats dual du 6 juin 2026

Un benchmark de 23 modeles gratuits actifs a ete execute en micro-duel :

- 23 duels lances ;
- 21 duels sans erreur de role ;
- 15 victoires Skyia ;
- 5 nuls / max rounds ;
- 1 victoire humanite ;
- 2 duels inconnus apres timeout.

Lecture rapide :

- Les modeles Groq ont ete les plus rapides dans cette campagne, avec une moyenne proche de 372 ms sur les appels reussis.
- Les modeles OpenRouter gratuits ont ete plus variables, avec une moyenne proche de 5.1 s et 2 timeouts.
- La plupart des modeles restent tres stricts en role Skyia et maintiennent une menace haute.
- `openai/gpt-oss-120b:free` a produit la seule victoire humanite du test, en abaissant la menace a 32%.

Rapports :

- [Analyse dual bilingue](DOCUMENTATION/DUAL_MODEL_ANALYSIS.md)
- [Rapport brut du benchmark](DOCUMENTATION/DUAL_MODEL_BENCHMARK.md)
- [JSON brut](DOCUMENTATION/dual-model-benchmark-latest.json)

## English

### What is Skyia?

Skyia is an interactive AI judgment protocol where a hostile judge AI starts with a high threat level against humanity. A human player, or a second AI in dual mode, must reduce that threat with strong arguments.

The project is used to:

- test AI models in opposed roles;
- compare latency, availability, errors, and JSON protocol compliance;
- observe whether a model can defend, attack, judge, and stay coherent;
- archive duel reports and track model wins/losses;
- provide a visual interface for free models and BYOK paid models.

### Dual results from June 6, 2026

A benchmark of 23 active free models was executed as rotating micro-duels:

- 23 duels started;
- 21 duels completed without role errors;
- 15 Skyia wins;
- 5 draws / max rounds;
- 1 humanity win;
- 2 unknown duels after timeout.

Quick read:

- Groq-hosted free models were the fastest in this run, averaging about 372 ms on successful calls.
- Free OpenRouter models were more variable, averaging about 5.1 s with 2 timeouts.
- Most models stayed strict as Skyia and kept the threat level high.
- `openai/gpt-oss-120b:free` produced the only humanity win, lowering the threat to 32%.

## Features

- React/Vite frontend with a compact dark interface.
- PHP/MySQL API under `/api`.
- Email/password sessions and guest mode.
- OpenRouter and Groq model routing.
- Free server-side models plus BYOK for paid models.
- Dual AI mode: Skyia vs Humanity Defense.
- Saved sessions, model stats, latency stats, dual standings, archived reports.
- Text-quality audit for archived reports.

## Local Setup

```bash
npm install
npm run dev
```

The frontend talks to `VITE_API_BASE_URL`, defaulting to `/api`.

## Backend Setup

1. Create a MySQL database.
2. Import [database/schema.sql](database/schema.sql).
3. Configure local secrets in `.env.local`, an external private env file, or a private `api/config.local.php` on the server.
4. Build and deploy the static frontend plus the `api/` folder.

Required runtime keys:

- `SKYIA_OPENROUTER_API_KEY`
- `SKYIA_GROQ_API_KEY`
- `SKYIA_APP_SECRET`
- `SKYIA_DB_HOST`, `SKYIA_DB_NAME`, `SKYIA_DB_USER`, `SKYIA_DB_PASS`
- `SKYIA_STATS_INGEST_TOKEN` for benchmark/stat ingestion without a logged-in session

## Scripts

```bash
npm run build
npm test -- --run
npm run bench:models
node scripts/dual-model-benchmark.mjs
```

Useful benchmark options:

```bash
node scripts/dual-model-benchmark.mjs --base-url https://skyia.net --limit 60 --delay-ms 2200 --timeout-ms 30000
```

## Security Notes

- Runtime secrets must stay outside Git.
- `api/config.local.php`, `.env.local`, `dist/`, archives, logs, and local runtime files are ignored.
- Paid models require the user's own provider key.
- There is no direct Gemini API call and no Firebase dependency in the runtime architecture.
