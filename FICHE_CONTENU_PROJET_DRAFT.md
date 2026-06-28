# Brouillon contenu fiche - SkyIA - Protocole de Jugement Adversarial pour Modèles IA

## Resume
Plateforme open source dédiée à l'évaluation, au benchmark et au suivi des performances des modèles d'intelligence artificielle via des duels structurés et des sessions comparatives.

## A quoi sert le projet
Fournir une interface centralisée et un protocole standardisé pour comparer objectivement les modèles IA (gratuits, serveurs, BYOK), archiver les résultats, mesurer les latences et générer des rapports détaillés. Destiné aux chercheurs, développeurs et observatoires de modèles.

## Fonctionnement
L'application fonctionne en deux couches principales : un frontend React/Vite gérant l'interface utilisateur et une API PHP/MySQL assurant la persistance des données et la logique métier. Le frontend pilote les interactions utilisateur (conversations, duels, sauvegardes) tandis que l'API gère l'authentification, le routage vers les fournisseurs de modèles, le streaming des réponses, et l'archivage des rapports. Les services frontaux intègrent des mécanismes de compaction de contexte pour les modèles à faible capacité token, et des optimisations pour le streaming SSE afin d'améliorer l'expérience utilisateur.

## Construction
Le projet a été conçu avec une architecture modulaire et sécurisée, séparant clairement les responsabilités entre frontend et backend. Le frontend utilise React avec TypeScript pour un typage strict et une maintenabilité accrue, tandis que le backend repose sur une API PHP/MySQL pour une compatibilité avec les hébergements mutualisés. La sécurité est renforcée par un stockage chiffré des clés BYOK côté utilisateur et une séparation des données sensibles (tokens, sessions) des données publiques (rapports, statistiques). L'interface utilisateur a été pensée pour être intuitive tout en intégrant des éléments visuels inspirés des interfaces rétro (style terminal, effets CRT) pour une expérience immersive. L'architecture a été optimisée pour une évolutivité et une maintenabilité à long terme, avec des tests automatisés et des audits de sécurité intégrés.

## Installation
[object Object]

## Utilisation
Après installation, l'utilisateur accède à l'interface via un navigateur web. Il peut lancer une conversation avec un ou plusieurs modèles, organiser des duels adversariaux, sauvegarder ses sessions, et consulter des rapports détaillés. Les fonctionnalités incluent la sélection de modèles (gratuits, serveurs ou BYOK), la visualisation des statistiques en temps réel, et l'export des rapports au format PDF. L'interface propose également un mode immersif avec des effets visuels rétro pour une expérience utilisateur unique.

## Fonctions
- Lancement de conversations et duels IA
- Comparaison multi-modèles en temps réel
- Archivage et export de rapports de duel
- Benchmark de latence des modèles
- Gestion des modèles personnalisés (BYOK)
- Sauvegarde et restauration de sessions
- Suivi des statistiques et classements
- Interface immersive en style terminal rétro
- Gestion multi-modèles (OpenRouter, Groq, BYOK)
- Streaming des réponses IA en temps réel
- Génération de rapports PDF détaillés
- Suivi des performances et classements
