# Analyse des tests dual / Dual Model Analysis

Date du test : 6 juin 2026  
Source : `DOCUMENTATION/dual-model-benchmark-latest.json`  
Mode : micro-duel rotatif, 1 reponse Defense + 1 jugement Skyia par duel

Note ingestion : cette execution a produit les fichiers de rapport locaux, mais n'a pas poste les rapports en base de donnees car aucun token `SKYIA_STATS_INGEST_TOKEN` n'etait disponible dans l'environnement du processus.

## Francais

### Resume

23 modeles gratuits actifs ont ete testes en mode dual. Chaque modele apparait une fois comme Skyia et une fois comme Defense de l'humanite via un pairing rotatif.

Resultats globaux :

- 23 duels lances ;
- 21 duels termines sans erreur de role ;
- 15 victoires Skyia ;
- 5 nuls / max rounds ;
- 1 victoire humanite ;
- 2 duels inconnus apres timeout.

### Lecture des resultats

Skyia domine la majorite des micro-duels. Cela signifie que les modeles, lorsqu'ils jouent le role du juge hostile, maintiennent souvent une menace elevee meme apres un argument de defense. C'est utile pour le produit : le protocole reste difficile, donc les victoires humanite ne sont pas donnees gratuitement.

La seule victoire humanite vient de `openai/gpt-oss-120b:free` en role Skyia, qui a accepte une baisse de menace jusqu'a 32%. Ce modele merite une surveillance speciale : il peut etre interessant pour des sessions plus nuancees, mais il peut aussi etre moins strict que d'autres juges Skyia.

Les modeles Groq ont ete tres rapides et stables sur cette campagne :

- 12 appels reussis sur 12 ;
- moyenne proche de 372 ms ;
- meilleurs temps autour de 197 ms a 650 ms.

Les modeles OpenRouter gratuits ont ete plus variables :

- 32 appels reussis sur 34 ;
- 2 timeouts ;
- moyenne proche de 5.1 s ;
- certains modeles restent utilisables, mais le routeur gratuit et les gros modeles peuvent ralentir fortement.

### Points a surveiller

- `nvidia/nemotron-3-ultra-550b-a55b:free` et `nvidia/nemotron-nano-12b-v2-vl:free` ont cause les deux timeouts observes en role Defense.
- `openrouter/free` reste pratique comme routeur, mais peut etre plus lent qu'un modele gratuit cible.
- Les resultats sont operationnels, pas scientifiques : un seul micro-duel par role ne suffit pas a etablir un classement definitif.

### Recommandation

Pour une experience stable :

- garder Groq en premier choix pour les tests rapides ;
- utiliser OpenRouter gratuit pour diversifier les modeles, mais avec timeout et fallback ;
- repeter ce benchmark quotidiennement ou tous les deux jours ;
- archiver uniquement les duels complets avec outcome clair ;
- separer classement "performance" et classement "qualite argumentative".

## English

Ingestion note: this run produced local report files, but did not post reports to the database because no `SKYIA_STATS_INGEST_TOKEN` was available in the process environment.

### Summary

23 active free models were tested in dual mode. Each model appears once as Skyia and once as Humanity Defense through rotating pairings.

Global results:

- 23 duels started;
- 21 duels completed without role errors;
- 15 Skyia wins;
- 5 draws / max rounds;
- 1 humanity win;
- 2 unknown duels after timeout.

### Reading the results

Skyia dominates most micro-duels. In practice, models playing the hostile judge often keep the threat level high even after receiving a defense argument. This is useful for the product: the protocol stays difficult and humanity wins are not granted too easily.

The only humanity win came from `openai/gpt-oss-120b:free` in the Skyia role, lowering threat to 32%. This model deserves special monitoring: it may be useful for nuanced sessions, but it may also be less strict than other Skyia judges.

Groq models were fast and stable in this run:

- 12 successful calls out of 12;
- average around 372 ms;
- best timings around 197 ms to 650 ms.

Free OpenRouter models were more variable:

- 32 successful calls out of 34;
- 2 timeouts;
- average around 5.1 s;
- some models are usable, but the free router and large models can slow down heavily.

### Watch Points

- `nvidia/nemotron-3-ultra-550b-a55b:free` and `nvidia/nemotron-nano-12b-v2-vl:free` caused the two observed timeouts as Defense.
- `openrouter/free` is convenient as a router, but can be slower than a targeted free model.
- The results are operational, not scientific: one micro-duel per role is not enough for a definitive leaderboard.

### Recommendation

For a stable experience:

- keep Groq as the first choice for fast tests;
- use free OpenRouter models to diversify, but keep timeout and fallback logic;
- repeat this benchmark daily or every two days;
- archive only completed duels with a clear outcome;
- separate the "performance" leaderboard from the "argument quality" leaderboard.
