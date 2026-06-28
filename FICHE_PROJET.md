# SkyIA - Protocole de Jugement Adversarial pour Modèles IA

## Liens vers l'application
- Lien public: [https://skyia.net](https://skyia.net)
- GitHub: [https://github.com/RYJITS/skyia](https://github.com/RYJITS/skyia)

## A quoi sert le projet
SkyIA est une plateforme full-stack conçue pour évaluer et comparer les modèles d'IA via des duels adversariaux. Elle permet aux utilisateurs de lancer des conversations avec un ou plusieurs modèles, d'organiser des duels structurés, et de sauvegarder leurs sessions. Les résultats sont archivés et exportables sous forme de rapports détaillés, incluant des métriques de performance comme la latence et la qualité des réponses. L'application intègre également un système de gestion des crédits et des modèles personnalisés (BYOK), ainsi qu'une interface immersive inspirée des terminaux rétro pour une expérience utilisateur unique.

## Fonctionnement de l'application ou du projet
L'application fonctionne en deux couches principales : un frontend React/Vite gérant l'interface utilisateur et une API PHP/MySQL assurant la persistance des données et la logique métier. Le frontend pilote les interactions utilisateur (conversations, duels, sauvegardes) tandis que l'API gère l'authentification, le routage vers les fournisseurs de modèles, le streaming des réponses, et l'archivage des rapports. Les services frontaux intègrent des mécanismes de compaction de contexte pour les modèles à faible capacité token, et des optimisations pour le streaming SSE afin d'améliorer l'expérience utilisateur.

## Comment le projet a ete construit
Le projet a été conçu avec une architecture modulaire et sécurisée, séparant clairement les responsabilités entre frontend et backend. Le frontend utilise React avec TypeScript pour un typage strict et une maintenabilité accrue, tandis que le backend repose sur une API PHP/MySQL pour une compatibilité avec les hébergements mutualisés. La sécurité est renforcée par un stockage chiffré des clés BYOK côté utilisateur et une séparation des données sensibles (tokens, sessions) des données publiques (rapports, statistiques). L'interface utilisateur a été pensée pour être intuitive tout en intégrant des éléments visuels inspirés des interfaces rétro (style terminal, effets CRT) pour une expérience immersive. L'architecture a été optimisée pour une évolutivité et une maintenabilité à long terme, avec des tests automatisés et des audits de sécurité intégrés.

## Installation et utilisation
### Installation
[object Object]

### Utilisation
Après installation, l'utilisateur accède à l'interface via un navigateur web. Il peut lancer une conversation avec un ou plusieurs modèles, organiser des duels adversariaux, sauvegarder ses sessions, et consulter des rapports détaillés. Les fonctionnalités incluent la sélection de modèles (gratuits, serveurs ou BYOK), la visualisation des statistiques en temps réel, et l'export des rapports au format PDF. L'interface propose également un mode immersif avec des effets visuels rétro pour une expérience utilisateur unique.

## Fonctions disponibles dans l'application
- Lancement de duels IA en temps réel
- Comparaison multi-modèles avec streaming des réponses
- Archivage et export de rapports de duel (PDF)
- Benchmark de latence et qualité des réponses
- Gestion des modèles personnalisés (BYOK) avec stockage chiffré
- Sauvegarde et restauration de sessions locales ou cloud
- Interface responsive adaptée aux mobiles et desktop
- Effets visuels immersifs (style terminal rétro)
- Gestion des utilisateurs et des crédits (via Firebase Auth et Stripe)
- Suivi des performances et classements
- Compaction automatique du contexte pour les modèles à faible TPM
- Gestion des erreurs et fallback pour les modèles indisponibles

## Outils, IA et moteurs en arriere-plan
- React (v19+) avec TypeScript pour le frontend
- Vite (v7+) comme outil de build et serveur de développement
- PHP (v8+) et MySQL (v8+) pour le backend et la persistance
- Firebase Auth pour l'authentification utilisateur
- Stripe pour la gestion des paiements et crédits
- OpenRouter et Groq comme fournisseurs de modèles IA gratuits
- Recharts pour la visualisation des données
- html2canvas et jspdf pour l'export PDF
- TailwindCSS pour le styling
- Vitest pour les tests unitaires

## Automatisations integrees
- Warm-up automatique du backend au démarrage
- Routage dynamique des requêtes vers les fournisseurs de modèles
- Compaction automatique du contexte pour les modèles à faible TPM
- Migrations automatiques de la base de données (via scripts PHP)
- Backfill des rapports archivés lors des mises à jour
- Tests automatisés des endpoints et fonctionnalités critiques
- Génération automatique des rapports PDF après un duel

## Captures d'ecran
![Capture 1 - skyia](docs/captures/05-skyia-2026-06-21_23-37-02-desktop.png)

![Capture 2 - skyia](docs/captures/05-skyia-2026-06-21_23-37-02-mobile.png)

## Mises a jour
- Correction des erreurs de parsing JSON dans le stockage local (skyia_banned_models, SKY_NET_SAVES_V1)
- Optimisation du build avec copie contrôlée de l'API vers le dossier dist
- Amélioration de la gestion des modèles BYOK avec stockage chiffré
- Ajout de la compaction de contexte pour les modèles à faible capacité token
- Mise à jour des dépendances (React v19, Vite v7, Vitest v4)
- Validation des scripts de test et build (npm run test, npm run build)
- Séparation renforcée des données sensibles et publiques pour évolutivité
- Statut public : PUBLIC_READY avec sécurité OK_PUBLIC
- Validation des scripts de build et test (vitest, vite)
- Séparation des données sensibles et publiques pour évolutivité
- Ajout de la gestion des modèles BYOK avec stockage chiffré côté utilisateur
- Optimisation du streaming des réponses IA pour les modèles à faible TPM
- Correction des erreurs de parsing JSON dans le stockage local (skyia_banned_models, SKY_NET_SAVES_V1)
- Optimisation du build avec copie contrôlée de l'API vers le dossier dist
- Amélioration de la gestion des modèles BYOK avec stockage chiffré
- Ajout de la compaction de contexte pour les modèles à faible capacité token
- Mise à jour des dépendances (React v19, Vite v7, Vitest v4)

> Fichier genere par l'orchestrateur pour le hub Site Ma Methode.
