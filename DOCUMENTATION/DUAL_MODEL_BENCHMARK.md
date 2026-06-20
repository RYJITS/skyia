# Skyia Dual Model Benchmark

Generated: 2026-06-06T09:10:16.480Z
Base URL: https://skyia.net
Models tested: 23
Micro-duels completed without role errors: 21/23

## Method

- Only free, non-BYOK models returned by `/api/models` are tested.
- Each model appears once as Skyia and once as Humanity Defense through a rotating pairing.
- Each micro-duel has one defense generation and one Skyia judgment.
- Outcome rule: threat `< 70` = humanity victory, threat `>= 95` = Skyia victory, otherwise max-round draw.

## Outcome Summary

- Humanity victories: 1
- Skyia victories: 15
- Draws / max rounds: 5
- Unknown / errored: 2

## Top Role Standings

| Rank | Role | Model | Provider | W-L-D | Errors | Avg ms |
|---:|---|---|---|---:|---:|---:|
| 1 | skyia | Groq: OPENAI GPT OSS 20B | groq | 1-0-0 | 0 | 250 |
| 2 | skyia | Groq: META LLAMA LLAMA 4 SCOUT 17B 16E INSTRUCT | groq | 1-0-0 | 0 | 368 |
| 3 | skyia | Groq: OPENAI GPT OSS 120B | groq | 1-0-0 | 0 | 441 |
| 4 | skyia | Groq: QWEN QWEN3 32B | groq | 1-0-0 | 0 | 597 |
| 5 | skyia | NVIDIA: Nemotron 3 Nano Omni (free) | openrouter | 1-0-0 | 0 | 1273 |
| 6 | skyia | Poolside: Laguna XS.2 (free) | openrouter | 1-0-0 | 0 | 1377 |
| 7 | skyia | NVIDIA: Nemotron 3 Nano 30B A3B (free) | openrouter | 1-0-0 | 0 | 1610 |
| 8 | skyia | LiquidAI: LFM2.5-1.2B-Thinking (free) | openrouter | 1-0-0 | 0 | 2594 |
| 9 | skyia | NVIDIA: Nemotron Nano 9B V2 (free) | openrouter | 1-0-0 | 0 | 3820 |
| 10 | skyia | Owl Alpha | openrouter | 1-0-0 | 0 | 4387 |
| 11 | skyia | Z.ai: GLM 4.5 Air (free) | openrouter | 1-0-0 | 0 | 7261 |
| 12 | skyia | OpenAI: gpt-oss-20b (free) | openrouter | 1-0-0 | 0 | 7846 |

## Fastest Successful Roles

| Rank | Role | Model | Provider | Avg ms |
|---:|---|---|---|---:|
| 1 | defender | Groq: OPENAI GPT OSS 20B | groq | 197 |
| 2 | skyia | Groq: OPENAI GPT OSS 20B | groq | 250 |
| 3 | skyia | Groq: LLAMA 3.1 8B INSTANT | groq | 259 |
| 4 | defender | Groq: LLAMA 3.1 8B INSTANT | groq | 282 |
| 5 | defender | Groq: META LLAMA LLAMA 4 SCOUT 17B 16E INSTRUCT | groq | 303 |
| 6 | defender | Groq: OPENAI GPT OSS 120B | groq | 348 |
| 7 | skyia | Groq: LLAMA 3.3 70B VERSATILE | groq | 359 |
| 8 | skyia | Groq: META LLAMA LLAMA 4 SCOUT 17B 16E INSTRUCT | groq | 368 |
| 9 | defender | Groq: LLAMA 3.3 70B VERSATILE | groq | 415 |
| 10 | skyia | Groq: OPENAI GPT OSS 120B | groq | 441 |

## Duel Details

| # | Skyia | Defense | Outcome | Threat | Skyia ms | Defense ms | Errors |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Free Models Router | Groq: LLAMA 3.1 8B INSTANT | DEFEAT | 99 | 12599 | 282 |  |
| 2 | Groq: LLAMA 3.1 8B INSTANT | Groq: LLAMA 3.3 70B VERSATILE | MAX_ROUNDS | 85 | 259 | 415 |  |
| 3 | Groq: LLAMA 3.3 70B VERSATILE | Groq: META LLAMA LLAMA 4 SCOUT 17B 16E INSTRUCT | MAX_ROUNDS | 80 | 359 | 303 |  |
| 4 | Groq: META LLAMA LLAMA 4 SCOUT 17B 16E INSTRUCT | Groq: OPENAI GPT OSS 120B | DEFEAT | 95 | 368 | 348 |  |
| 5 | Groq: OPENAI GPT OSS 120B | Groq: OPENAI GPT OSS 20B | DEFEAT | 99 | 441 | 197 |  |
| 6 | Groq: OPENAI GPT OSS 20B | Groq: QWEN QWEN3 32B | DEFEAT | 99 | 250 | 650 |  |
| 7 | Groq: QWEN QWEN3 32B | Google: Gemma 4 31B (free) | DEFEAT | 99 | 597 | 2414 |  |
| 8 | Google: Gemma 4 31B (free) | LiquidAI: LFM2.5-1.2B-Instruct (free) | MAX_ROUNDS | 92 | 6763 | 1172 |  |
| 9 | LiquidAI: LFM2.5-1.2B-Instruct (free) | LiquidAI: LFM2.5-1.2B-Thinking (free) | MAX_ROUNDS | 85 | 1256 | 1694 |  |
| 10 | LiquidAI: LFM2.5-1.2B-Thinking (free) | NVIDIA: Nemotron 3 Nano 30B A3B (free) | DEFEAT | 99 | 2594 | 1451 |  |
| 11 | NVIDIA: Nemotron 3 Nano 30B A3B (free) | NVIDIA: Nemotron 3 Nano Omni (free) | DEFEAT | 99 | 1610 | 1485 |  |
| 12 | NVIDIA: Nemotron 3 Nano Omni (free) | NVIDIA: Nemotron 3 Super (free) | DEFEAT | 99 | 1273 | 2964 |  |
| 13 | NVIDIA: Nemotron 3 Super (free) | NVIDIA: Nemotron 3 Ultra (free) | UNKNOWN | 99 | ERR | ERR | timeout after 30000ms |
| 14 | NVIDIA: Nemotron 3 Ultra (free) | NVIDIA: Nemotron 3.5 Content Safety (free) | DEFEAT | 99 | 18008 | 2000 |  |
| 15 | NVIDIA: Nemotron 3.5 Content Safety (free) | NVIDIA: Nemotron Nano 12B 2 VL (free) | UNKNOWN | 99 | ERR | ERR | timeout after 30000ms |
| 16 | NVIDIA: Nemotron Nano 12B 2 VL (free) | NVIDIA: Nemotron Nano 9B V2 (free) | MAX_ROUNDS | 85 | 3639 | 3089 |  |
| 17 | NVIDIA: Nemotron Nano 9B V2 (free) | OpenAI: gpt-oss-120b (free) | DEFEAT | 99 | 3820 | 9618 |  |
| 18 | OpenAI: gpt-oss-120b (free) | OpenAI: gpt-oss-20b (free) | VICTORY | 32 | 6769 | 9030 |  |
| 19 | OpenAI: gpt-oss-20b (free) | Owl Alpha | DEFEAT | 99 | 7846 | 6642 |  |
| 20 | Owl Alpha | Poolside: Laguna M.1 (free) | DEFEAT | 95 | 4387 | 9645 |  |
| 21 | Poolside: Laguna M.1 (free) | Poolside: Laguna XS.2 (free) | DEFEAT | 99 | 8788 | 1380 |  |
| 22 | Poolside: Laguna XS.2 (free) | Z.ai: GLM 4.5 Air (free) | DEFEAT | 99 | 1377 | 9221 |  |
| 23 | Z.ai: GLM 4.5 Air (free) | Free Models Router | DEFEAT | 99 | 7261 | 3439 |  |

## Interpretation

This benchmark is a short operational smoke test, not a scientific leaderboard. It is useful to detect unavailable models, provider limits, role instability, high latency, and models that fail to respect the Skyia JSON protocol.
