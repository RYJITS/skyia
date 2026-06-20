# Guide de Maintenance & Debugging

Ce document recense les problèmes connus, comment les surveiller et les procédures à suivre pour la maintenance.

## 🚨 En Cas de Problème Critique (Panic Button)

Si l'application plante ou ne répond plus :

1.  **Vérifiez la Console (F12)** : Regardez s'il y a du texte rouge.
2.  **Vérifiez les Quotas** :
    *   **OpenRouter** : Connectez-vous sur openrouter.ai > Credits. Si 0$, l'IA ne répondra plus (Erreur 402/429).
    *   **Google AI** : Vérifiez la console Google Cloud.
3.  **Vérifiez Firebase** :
    *   Console Firebase > Authentication : Est-ce que les utilisateurs apparaissent ?
    *   Console Firebase > Firestore : Est-ce que la collection `users` est accessible ?

---

## 🛠️ Diagnostics Courants

### 1. L'IA ne répond pas (Message Rouge)
*   **Message :** "System Overheat" ou "Quota Exceeded".
*   **Diagnostic :** Manque de crédits API ou clé API invalide.
*   **Action :** Vérifiez `VITE_OPENROUTER_API_KEY` dans `.env` et le solde du compte.

### 2. Le Paiement tourne en boucle
*   **Symptôme :** Clic sur "Acheter" -> Chargement infini.
*   **Cause 1 :** L'extension Firebase Stripe n'est pas installée.
*   **Cause 2 :** L'utilisateur n'est pas connecté (AuthUID manquant).
*   **Action :** Vérifiez les logs console. Si "Missing or insufficient permissions", c'est une règle Firestore qui bloque.

### 3. "Permission Denied" (Console)
*   **Symptôme :** L'app fonctionne mais la console est rouge.
*   **Cause :** L'application essaie d'écrire dans `users/{uid}` mais les règles de sécurité sont trop strictes ou le document n'existe pas.
*   **Action :** Nous avons ajouté un "Auto-Healing" dans le code. Si l'erreur persiste, ouvrez les règles Firestore (voir document Sécurité).

### 4. Graphique qui ne s'affiche pas
*   **Symptôme :** Zone vide à gauche ou warning "width(-1)".
*   **Cause :** Problème de redimensionnement CSS sur mobile.
*   **Action :** Un correctif est déjà appliqué (`min-w-0`), essayez de rafraîchir la page.

---

## 🧹 Procédures de Nettoyage (Maintenance)

### Nettoyer les Utilisateurs Fantômes
Dans Firestore, vous pouvez avoir des profils créés sans email ou incomplets.
*   **Action :** Allez dans Firestore > `users`. Supprimez manuellement les documents qui ont `created: null` ou pas de stats (sans danger).

### Mettre à jour les Prix (Stripe)
Si vous changez le prix d'un pack :
1.  Créez le nouveau prix dans Stripe Dashboard.
2.  Ouvrez `components/StoreModal.tsx`.
3.  Remplacez l'ID `price_...` par le nouveau.
4.  Redéployez l'application.

---

## 💡 Astuces Développement

*   **Mode Dev Rapide** : Pour tester sans payer, utilisez le modèle **"DeepSeek R1 Free"** ou **"Gemini 2.0 Flash"** (Coût: 0).
*   **Reset App** : Si l'état est incohérent, videz le LocalStorage (F12 > Application > Local Storage > Clear) et recharchez.
*   **Logs** : Le code contient des `console.log('DEBUG AUTH:', ...)` pour suivre la connexion. Ne les supprimez pas, ils sont utiles.
