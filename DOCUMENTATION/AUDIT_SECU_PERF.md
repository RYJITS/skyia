# Audit Sécurité & Performance (Mise à jour Février 2026)

## 🛡️ SÉCURITÉ

### 🟢 Points Forts (Sécurisé)
1.  **Système de Code Promo :**
    *   Règles Firestore strictes mises en place.
    *   **Lecture :** Autorisée (Authentifié).
    *   **Écriture :** Restreinte à l'incrémentation du compteur (+1). Création/Suppression interdite depuis le client.
    *   *Correction appliquée le 12/02/2026.*

2.  **Protection des Clés API :**
    *   Les clés Gemini/OpenAI ne sont PAS dans le code client.
    *   Utilisation d'un Proxy Backend (Cloud Functions) pour toutes les requêtes IA.
    *   Aucun risque de vol de quota.

3.  **Base de Données Utilisateur :**
    *   Isolation stricte des données (`isOwner`). Un utilisateur ne peut lire/écrire que son propre profil.
    *   Protection des données de paiement Stripe (lecture seule).

4.  **Interface Utilisateur :**
    *   Suppression des boutons de débogage "RESET DATABASE" en production.
    *   Réduit le risque de suppression accidentelle ou malveillante par ingénierie sociale (si un attaquant demandait de cliquer).

### 🟠 Points d'Attention (Risque Modéré)
1.  **Statistiques Modèles (`model_stats`) :**
    *   Actuellement : `allow write: if request.auth != null;`
    *   **Risque :** Un utilisateur authentifié peut théoriquement envoyer de fausses statistiques (spam de victoires/défaites) pour fausser le classement global.
    *   **Recommandation :** Déplacer la logique de mise à jour des stats vers une Cloud Function sécurisée (déclenchée par la fin de partie).

---

## ⚡ PERFORMANCE

### 🔴 Problèmes Critiques
1.  **Tailwind via CDN :**
    *   Le fichier `index.html` utilise `<script src="https://cdn.tailwindcss.com"></script>`.
    *   **Impact :** Le navigateur doit télécharger et compiler ~3MB de Javascript avant d'afficher le style. Cela ralentit considérablement le premier chargement (FCP/LCP).
    *   **Solution :** Installer Tailwind en local (`npm install -D tailwindcss postcss autoprefixer`) et générer un fichier CSS optimisé au build.

2.  **Dépendances Lourdes :**
    *   `firebase-admin` est listé dans `dependencies` (Prod) au lieu de `devDependencies` ou d'être réservé au dossier `functions`.
    *   **Risque :** Si Vite ne parvient pas à "tree-shake" (nettoyer) correctement, cela peut ajouter plusieurs Mo inutiles au bundle client.

### 🟢 Points Positifs
1.  **Vite :** Utilisation d'un bundler moderne et rapide.
2.  **Lazy Loading :** Les composants React semblent être chargés efficacement.

---

## 🚀 PLAN D'ACTION RECOMMANDÉ

1.  [PRIORITÉ HAUTE] **Migration Tailwind :** Passer du CDN à une installation locale pour gagner ~1-2 secondes de chargement.
2.  [PRIORITÉ MOYENNE] **Nettoyage Dépendances :** Déplacer `firebase-admin` et vérifier le poids du build.
3.  [PRIORITÉ BASSE] **Sécurisation Stats :** Migrer l'écriture des stats vers le backend.
