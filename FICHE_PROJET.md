# SkyIA

## Explication de l'application
SkyIA est l'application principale de jugement IA adversarial. Elle met en face un humain ou une IA defensive avec un juge hostile, compare les modeles, archive les duels et transforme les resultats en observatoire de performance.

## Fonctionnement de l'application
Le frontend React pilote les conversations, les modeles, les sessions et les rapports. L'API PHP gere l'authentification, les modeles, le chat stream, les sauvegardes, les statistiques, les rapports de duel, les latences, les cles utilisateur et les modeles personnalises. Les services front choisissent le fournisseur, compactent le contexte quand le modele a peu de tokens, streament les reponses et extraient les metriques utiles.

## Comment l'application a ete concue
SkyIA a ete concu en deux couches: une interface de jeu/benchmark pour l'utilisateur et une API serveur qui conserve les donnees importantes. Le projet separe les modeles gratuits serveur, les modeles BYOK, les statistiques, les rapports publics et les donnees sensibles pour pouvoir evoluer vers une publication plus propre.

## Fonctions disponibles dans l'application
- Lancer une conversation avec SkyIA
- Comparer plusieurs modeles IA
- Jouer un duel juge IA contre defenseur IA
- Utiliser des modeles serveur gratuits ou des cles BYOK
- Sauvegarder des sessions
- Archiver les rapports de duel
- Suivre les statistiques et classements
- Mesurer la latence des modeles
- Gerer des modeles personnalises

## Outils, IA et moteurs en arriere-plan
- OpenRouter
- Groq
- Modeles serveur gratuits
- BYOK chiffre cote utilisateur
- API PHP/MySQL
- Streaming chat
- Base rapports dual_reports
- Benchmark de latence
- Benchmark duel multi-modeles
- Audit qualite texte

## Automatisations integrees
- Warm-up backend
- Routage automatique provider/modeles
- Compaction de contexte pour modeles low TPM
- Migrations et creation de tables API
- Backfill de rapports archives
- Ingestion de resultats de parties
- Benchmark de latence des modeles
- Benchmark duel multi-modeles
- Copie controlee de l'API vers dist
- Tests endpoints, modeles, stockage et exports

## Captures d'ecran
- Aucune capture validee pour cette fiche.

## Liens utiles
- Chemin local: `D:\00_Cerveau_IA\Projet\05_skyia`
- Hostinger: lien detecte mais masque par securite orchestrateur
- GitHub: non detecte

## Resume court
Application principale de jugement IA adversarial. Elle compare des modeles, orchestre des duels, archive les rapports et suit les performances.

## Pour qui
Projet IA principal, demonstration, experimentation et observatoire de modeles.

## Statut actuel
Le projet est reference dans le hub avec le statut **SENSITIVE_BLOCKED**.
La securite est indiquee separement pour eviter de confondre un lien public existant avec une autorisation de publication.

## Suivi orchestrateur
- Securite: FAIL_SESSIONS
- Fonctionnement: FONCTIONNEL_AVEC_ALERTES
- Publication: SENSITIVE_BLOCKED

## Derniere mise a jour
2026-06-20T18:19:00.198Z

> Fichier genere par l'orchestrateur pour le hub Site Ma Methode.
