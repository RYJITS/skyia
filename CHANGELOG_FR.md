# Changelog - skyia

## Evolutions documentees

- Correction des erreurs de parsing JSON dans le stockage local (skyia_banned_models, SKY_NET_SAVES_V1)
- Optimisation du build avec copie contrôlée de l'API vers le dossier dist
- Amélioration de la gestion des modèles BYOK avec stockage chiffré
- Ajout de la compaction de contexte pour les modèles à faible capacité token
- Mise à jour des dépendances (React v19, Vite v7, Vitest v4)
- Validation des scripts de test et build (npm run test, npm run build)
- Séparation renforcée des données sensibles et publiques pour évolutivité
- Validation des scripts de build et test (vitest, vite)
- Séparation des données sensibles et publiques pour évolutivité
- Ajout de la gestion des modèles BYOK avec stockage chiffré côté utilisateur
- Optimisation du streaming des réponses IA pour les modèles à faible TPM
