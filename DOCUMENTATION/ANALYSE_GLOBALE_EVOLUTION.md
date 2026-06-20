# Analyse Globale & Feuille de Route (Roadmap)

Analyse complète de l'état du projet **Skyia**, ses forces et ses axes d'amélioration.

## 📊 État des Lieux

Skyia est une application web **moderne, immersive et fonctionnelle**. Elle combine une interface utilisateur "Sci-Fi" très léchée avec une intégration réelle d'IA de pointe.

### ✅ Points Forts (Ce qui marche bien)
1.  **Immersion Visuelle** : L'ambiance "Terminal / Matrix" est cohérente. Les effets CRT, le scintillement, le son (glitch), tout contribue à l'expérience.
2.  **Diversité IA** : Le choix entre plusieurs modèles (Gemini, GPT, Claude, DeepSeek) est une fonctionnalité de luxe rare.
3.  **Système de Progression** : La mécanique de "Crédits", "Sauvegarde" et "Rapport de Fin" donne un but au jeu.
4.  **Monétisation Prête** : L'intégration Stripe est fonctionnelle en mode Live.

### ⚠️ Points de Vigilance (Ce qu'il faut surveiller)
1.  **Sécurité API** : Comme mentionné dans l'Audit, la clé API côté client est un risque financier (vol de clé).
2.  **Dépendance OpenRouter** : Si OpenRouter tombe en panne, 80% des modèles disparaissent. (Heureusement, Gemini Direct est un bon backup).
3.  **Coût par Token** : Les modèles comme GPT-5 ou Claude 3.5 sont chers. Surveillez la rentabilité par rapport au prix des crédits vendus.

---

## 🗺️ Feuille de Route (Améliorations Futures)

### 1. Priorité Haute (Court Terme)
*   [ ] **Sécuriser la Clé API** : Déplacer l'appel OpenRouter vers une Cloud Function Firebase (`functions/`).
*   [ ] **SEO** : Ajouter les balises Méta Description dans `index.html`.
*   [ ] **Mobile** : Vérifier que le clavier virtuel ne cache pas la zone de saisie sur iPhone (petit bug classique).

### 2. Priorité Moyenne (Moyen Terme)
*   [ ] **Admin Panel** : Créer une page cachée (`/admin`) pour voir les stats globales (combien de joueurs, revenus, usage des modèles).
*   [ ] **Historique Cloud** : Permettre aux joueurs de retrouver leurs anciennes parties sur un autre appareil (actuellement stockage Local/Firestore hybride).

### 3. Idées "Bonus" (Long Terme)
*   [ ] **Mode Vocal** : Parler à Skyia avec la voix (Web Speech API).
*   [ ] **Multijoueur** : Un mode où plusieurs humains essaient de convaincre l'IA ensemble (Vote des arguments).
*   [ ] **Personnalités Multiples** : Choisir entre "L'IA Juge", "L'IA Mère", "L'IA Guerrière" (changer le System Prompt dynamiquement).

---

## 🏆 Conclusion de l'Analyse

Le projet est techniquement **très solide** pour une v1.0. L'expérience utilisateur (UX) est fluide. Le code est modulaire (`services/`, `components/`) et facile à maintenir.

**Note Globale : A-**
*(Le A+ sera atteint une fois la sécurité API (clé backend) mise en place).*
