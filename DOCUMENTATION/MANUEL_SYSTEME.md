# Manuel du Système & Guide de Dépannage

Ce document explique le fonctionnement technique de **Skyia Judgment Protocol**, le flux de données, et comment réagir en cas d'erreur.

---

## 🔄 Flux du Système (System Flow)

### 1. Authentification & Création de Compte
1.  **Action** : L'utilisateur clique sur "Login" (Google/Email).
2.  **Code** : `AuthModal.tsx` appelle `AuthContext.tsx`.
3.  **Firebase** : Création du compte dans **Firebase Auth**.
4.  **Firestore** : Un "listener" (`onAuthStateChanged` dans `AuthContext`) détecte la connexion.
    - Il tente de lire le document `users/{uid}`.
    - S'il n'existe pas, `userService.createUserProfile` le crée avec 20 crédits initiaux.
    - *Point Critique* : Si les règles Firestore bloquent, cela provoque l'erreur "Missing permissions" (voir Dépannage).

### 2. Achat de Crédits (Stripe Flow)
1.  **Sélection** : L'utilisateur choisit un pack dans `StoreModal.tsx`.
2.  **Création Session** : `stripeService.ts` appelle `db.collection('customers').doc(uid).collection('checkout_sessions').add(...)`.
3.  **Extension Firebase** : L'extension "Run Payments with Stripe" installée sur Firebase détecte cet ajout.
4.  **Redirection** : L'extension écrit une URL de paiement dans Firestore. L'app redirige l'utilisateur vers cette URL Stripe.
5.  **Paiement** : L'utilisateur paie sur Stripe (Mode Live ou Test).
6.  **Webhook & Retour** :
    - Stripe envoie un "Webhook" à Firebase.
    - Firebase met jour les crédits de l'utilisateur dans Firestore (`users/{uid}/stats/availableCredits`).
    - L'utilisateur est redirigé vers l'app (`App.tsx` détecte `?session_id=...`).
    - L'utilisateur voit ses crédits augmenter en temps réel grâce au listener Firestore.

### 3. Intelligence Artificielle (Chat)
1.  **Prompt** : L'utilisateur envoie un message.
2.  **Routage** :
    - Si modèle Google (Gemini) : `geminiService.ts` appelle l'API Google AI Studio directement.
    - Si autre (GPT, Claude) : `openRouterService.ts` passe par **OpenRouter**.
3.  **Streaming** : La réponse arrive morceau par morceau pour l'effet "machine à écrire".
4.  **Analyse** : `aiLogic.ts` scanne la réponse pour extraire le JSON caché (Niveau de menace, Status).

---

## 🔑 Clés & Variables d'Environnement (.env)

Ces variables doivent être correctement définies dans `.env` (local) et dans votre plateforme d'hébergement (Vercel/Netlify/Firebase Hosting).

| Variable | Description | Rôle |
| :--- | :--- | :--- |
| `VITE_API_KEY` | Clé Google AI Studio (Gemini) | Permet d'utiliser les modèles Gemini (Flash/Pro) gratuitement ou via quota Google. |
| `VITE_OPENROUTER_API_KEY` | Clé OpenRouter | Permet d'accéder à **tous** les autres modèles (GPT-4, Claude 3.5, Llama 3, DeepSeek). C'est la clé "maître" pour le multi-modèle. |
| **Firebase Config** | | |
| `VITE_FIREBASE_API_KEY` | Clé API Web Firebase | Identifie votre projet Firebase côté client. |
| `VITE_FIREBASE_AUTH_DOMAIN` | `[project].firebaseapp.com` | Domaine pour l'authentification (Google Popup). |
| `VITE_FIREBASE_PROJECT_ID` | `gen-lang-client-...` | ID unique de votre projet Firestore. |
| `VITE_FIREBASE_STORAGE_BUCKET`| `[project].firebasestorage.app` | Stockage fichiers (inutilisé pour l'instant, mais requis). |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Chiffres | ID pour les notifications (inutilisé). |
| `VITE_FIREBASE_APP_ID` | `1:12345...` | ID technique de l'application web. |
| **Stripe (Non-Sensitive)** | | |
| *Note* | Les clés Stripe (`sk_live_...` ou `pk_live_...`) ne sont **PAS** dans le code client `.env` pour la création de session. Elles sont gérées côté serveur par l'Extension Firebase. Seuls les **Prix ID** (`price_...`) sont dans `StoreModal.tsx`. |

---

## 🛠️ Guide de Dépannage (Troubleshooting)

### 🔴 Erreur : "FirebaseError: Missing or insufficient permissions"
*   **Symptôme** : Apparaît souvent lors du chargement du profil ou de la tentative d'achat.
*   **Cause** : Les "Règles de Sécurité" (Firestore Rules) bloquent l'écriture/lecture.
*   **Solution** :
    1.  Allez sur la **Console Firebase** > **Firestore Database** > **Rules**.
    2.  Vérifiez que la règle pour `users` autorise l'écriture si l'utilisateur est authentifié (`allow write: if request.auth != null;`).

### 🔴 Erreur : "Stripe Checkout Redirect Failed"
*   **Symptôme** : Vous cliquez sur un pack, ça charge indéfiniment.
*   **Cause 1** : L'extension Stripe n'est pas installée ou configurée sur Firebase.
*   **Cause 2** : Les "Product IDs" dans `StoreModal.tsx` ne correspondent pas à ceux du tableau de bord Stripe (Mode Test vs Mode Live).
*   **Solution** : Vérifiez que les IDs (`price_1Q...`) dans le code sont bien ceux du mode actif (Live ou Test).

### 🔴 Erreur : "System Overheat / Quota / 429"
*   **Symptôme** : Le chat répond par un message d'erreur rouge.
*   **Cause** : Vous n'avez plus de crédits OpenRouter (si modèle payant) ou Google a temporairement bloqué l'IP (rare).
*   **Solution** : Rechargez des crédits sur OpenRouter.ai ou attendez quelques minutes.

### 🔴 Erreur : Warning graphique "width(-1)" (Console)
*   **Symptôme** : Warning jaune dans la console DevTools.
*   **Cause** : Bug de la librairie `recharts` quand le conteneur est caché ou n'a pas de taille.
*   **Solution** : Ignorez-le. Un correctif CSS (`flex-col`, `min-w-0`) a été appliqué pour minimiser l'impact visuel.

---

## ✅ Checklist Avant Déploiement

- [ ] `.env` contient la clé **VITE_OPENROUTER_API_KEY**.
- [ ] Dans `StoreModal.tsx`, les ID de prix (`price_...`) sont ceux de la **Production** (Live).
- [ ] Sur Firebase Console > Extensions, "Run Payments with Stripe" est configuré avec la clé secrète **Live** (`sk_live_...`).
- [ ] Le Webhook Stripe est configuré en mode **Live** vers l'URL Firebase Function.
