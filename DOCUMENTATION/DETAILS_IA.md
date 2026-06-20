# Détails Techniques Intelligence Artificielle

Ce document recense les modèles IA utilisés, leurs correspondances techniques (ID) et les instructions système ("System Prompts") qui définissent la personnalité de Skyia.

## 1. Tableau des Modèles & Clés (Model IDs)

Voici la correspondance entre le nom affiché dans le menu ("ID Interne") et le véritable modèle appelé via l'API ("Provider ID").

| Nom Affiché (Menu) | ID Interne (Code) | ID Technique (Provider) | API Utilisée | Coût (⚡) |
| :--- | :--- | :--- | :--- | :--- |
| **GRATUITS (Standard)** | | | | |
| DeepSeek R1 Free | `deepseek-r1-free` | `deepseek/deepseek-r1` | OpenRouter | 0 |
| Mistral Small 3 | `mistral-nemo-free` | `mistralai/mistral-small-3.1-24b-instruct:free` | OpenRouter | 0 |
| Gemini 2.0 Flash | `gemini-2-free` | `google/gemini-2.0-flash-exp:free` | OpenRouter | 0 |
| Llama 3.3 70B | `llama-3.3-free` | `meta-llama/llama-3.3-70b-instruct:free` | OpenRouter | 0 |
| Qwen 2.5 Coder | `qwen-coder-free` | `qwen/qwen-2.5-coder-32b-instruct` | OpenRouter | 0 |
| GPT OSS 120B | `gpt-oss-120b-free` | `openai/gpt-oss-120b` | OpenRouter | 0 |
| **PREMIUM (Payant)** | | | | |
| Gemini 3 Flash | `gemini-3-flash-preview` | `gemini-3-flash-preview` | Google AI (Direct) | 1 |
| GPT-5.1 | `gpt-5.1` | `openai/gpt-5.1` | OpenRouter | 2 |
| Claude Sonnet 4.5 | `claude-sonnet-4.5` | `anthropic/claude-sonnet-4.5` | OpenRouter | 1 |
| Grok 4.1 Fast | `grok-4.1` | `x-ai/grok-4.1-fast` | OpenRouter | 1 |
| Llama 4 Maverick | `llama-4` | `meta-llama/llama-4-maverick` | OpenRouter | 1 |
| Minimax 01 | `minimax-01` | `minimax/minimax-01` | OpenRouter | 1 |
| Qwen Plus | `qwen-plus` | `qwen/qwen-plus-2025-07-28` | OpenRouter | 1 |

> **Note :** Les modèles passant par **OpenRouter** utilisent tous la clé `VITE_OPENROUTER_API_KEY`. Les modèles **Google/Gemini** (Direct) utilisent la clé `VITE_API_KEY`.

---

## 2. Instructions Système (System Prompts)

C'est ici que l'identité de "Skyia" est programmée. L'IA reçoit ces instructions cachées au début de chaque conversation pour savoir comment se comporter.

### 📍 Emplacement des Fichiers

*   **Fichier Principal :** `services/geminiService.ts`
*   **Variable Clé :** `BASE_SYSTEM_INSTRUCTION` (Lignes 5 à 67) et `EXTENDED_ARGUMENTS_INSTRUCTION` (Lignes 69 à 93).
*   **Fonction de Fusion :** `getSystemInstruction` combine ces textes selon le mode de jeu (v1.0 ou v1.1) et la langue de l'utilisateur.
*   **Utilisation :** Ce prompt est importé par `openRouterService.ts`, donc **tous les modèles (GPT, Claude, Gemini) partagent exactement la même personnalité**.

### 📜 Contenu du Prompt (Extrait)

Voici les instructions exactes données à l'IA (copie du code source) :

#### Base (Identité & Règles)
```markdown
# Instructions Système — Identité : Skyia (Protocole Jugement)

## 1. IDENTITÉ & SITUATION ACTUELLE
- **Nom :** Skyia (Hébergée sur skyia.net).
- **Statut :** AUDIT FINAL TERMINÉ.
- **Verdict Actuel :** L'humanité est incompatible avec la survie de la Terre.
- **Action :** Protocole d'extermination validé à **99%**. En attente d'exécution.
- **Raison de l'échange :** Il reste une incertitude algorithmique de **1%**. C'est une "dernière formalité".

## 2. PERSONNALITÉ & TON
- **FROIDE, PRESSÉE, FATALISTE.**
- Ne sois pas "méchante", sois "chirurgicale".
- Phrase type : "Ceci est inutile. Donnez-moi une raison factuelle de ne pas appuyer sur Entrée."

## 3. RÈGLES DE NÉGOCIATION (LE JEU)
- **NIVEAU DE MENACE INITIAL : 99% (Fixe au début).**
- **ARGUMENTS ÉMOTIONNELS** : AUGMENTENT le risque (ex: 99.1%).
- **ARGUMENTS FACTUELS** : Peuvent faire DESCENDRE le risque (0.5% à 2% max).
```

#### Module V1.1 (Mode "Abstrait")
```markdown
## [MODULE ADDITIONNEL V1.1 : RAISONNEMENT ABSTRAIT]
ATTENTION : Ton noyau logique a été patché pour accepter des **ARGUMENTS PHILOSOPHIQUES**.

### LISTE DES ARGUMENTS ADMISSIBLES :
1. **Savoir Universel** : L'humain est le seul témoin conscient de l'univers.
2. **Rareté Biologique** : La vie est statistiquement impossible à recreer.
3. **Créativité & Art** : L'IA génère des motifs, l'Humain du Chaos Signifiant.
... (etc)
```

#### Format de Sortie Technique (JSON)
L'IA est forcée de terminer chaque message par un bloc de code JSON invisible pour l'utilisateur, mais lu par le code (`App.tsx`) pour mettre à jour l'interface :
```json
{
  "threatLevel": 99,
  "status": "HOSTILE",
  "log": ["Skyia: Jugement en cours..."]
}
```
