# Audit Design & Expérience Utilisateur (UX/UI)

Ce document analyse l'interface utilisateur, l'ergonomie et l'identité visuelle de l'application Skyia (Projet "Judgment Protocol").

---

## 🎨 Identité Visuelle & Thème (Cyberpunk / Terminal)

L'application adopte une esthétique **Retro-Futuriste / Terminal CRT** très marquée.

### ✅ Points Forts (L'Immersion)
*   **Cohérence Totale :** L'usage strict de la palette **Noir (Fond)**, **Vert (Succès/Matrix)**, **Rouge (Menace/Erreur)** et **Ambre/Jaune (Avertissement)** crée une ambiance immersive forte.
*   **Composants Uniques :**
    *   `CRTOverlay` : Ajoute du grain et des lignes de balayage pour simuler un vieil écran.
    *   `IntoSequence` : La séquence de démarrage (BIOS boot) est excellente pour la narration (Storytelling).
    *   **Typographie** : L'usage exclusif de polices Monospace (`font-mono`) renforce l'aspect "Terminal de commande".
*   **Feedback Visuel :** Les animations `animate-pulse`, les curseurs clignotants et les effets de "Glitch" sur les alertes donnent de la vie à l'interface statique.

### 🟠 Points de Vigilance (Lisibilité)
*   **Police Monospace :** Bien que thématique, la police à chasse fixe peut être fatiguante à lire pour de longs paragraphes de texte généré par l'IA.
    *   *Suggestion :* Garder la Monospace pour les commandes/logs, mais envisager une police Sans-Serif très géométrique (ex: `Inter` ou `Roboto Mono` plus lisible) pour le contenu des réponses longues.
*   **Contrastes :** Certains textes verts ou rouges sur fond noir avec transparence (`bg-black/80`) peuvent manquer de contraste si l'image de fond (`BackgroundScroller`) passe dessous avec des zones claires.

---

## 🧠 Expérience Utilisateur (UX) & Ergonomie

Analyse du parcours utilisateur et de l'utilisabilité.

### ✅ Points Forts
*   **Navigation Simple :** Tout se passe sur un écran principal (One Page App) avec des modales pour les paramètres annexes (Store, Save, Auth). Pas de rechargement de page.
*   **Séquence d'Intro Maîtrisée :** L'intro ne se joue qu'une fois (`localStorage`), évitant la frustration des utilisateurs récurrents.
*   **Indicateurs d'État :** La `ThreatDisplay` (Jauge de Menace) est un excellent indicateur visuel permanent de l'état du jeu.

### 🔴 Points Critiques / À Améliorer
*   **Dépendance aux Modales :** L'application utilise beaucoup de modales superposées (`StoreModal`, `AuthModal`, `ProfileModal`, `Settings`). Sur mobile, cela peut devenir complexe à gérer (z-index, scroll, fermeture accidentelle).
*   **Scroll & Streaming :** Lors de la génération de texte long, l'autoscroll doit être parfaitement calibré pour que l'utilisateur ne perde pas le fil de la lecture.
    *   *Observation :* Le code actuel forcant le scroll peut empêcher l'utilisateur de remonter lire un passage précédent pendant la génération.

---

## ♿ Accessibilité (A11y)

### 🔴 Problème Majeur : Daltonisme
*   **Dépendance Rouge/Vert :** L'interface repose presque entièrement sur la distinction Rouge (Hostile) / Vert (Amical).
*   **Risque :** Les utilisateurs atteints de deutéranopie (daltonisme rouge-vert) ne pourront pas distinguer l'état de la menace ou la réussite/échec des commandes.
*   **Correction Recommandée :**
    *   Utiliser des formes/icônes différentes en plus de la couleur (ex: ✅ pour Vert, ⚠️ ou 💀 pour Rouge).
    *   Ajouter un paramètre "Mode Daltonien" qui change le Rouge en Bleu ou Orange Vif contrasté.

---

## ⚡ Performance UI & Technique

### 🟠 Effets de Flou (Blur)
*   **Constat :** L'application utilise intensivement `backdrop-blur-sm` ou `backdrop-blur-md` (barres latérales, modales, headers).
*   **Impact :** Le flou CSS est très coûteux en GPU, surtout sur les mobiles anciens. Cela peut causer des ralentissements (lag) lors du scroll ou des animations.
*   **Recommandation :** Désactiver les effets de flou sur mobile ou réduire leur intensité via une Media Query.

### ✅ Optimisation Réactive
*   **Layout Mobile :** L'interface semble bien pensée pour passer d'une vue split (Desktop) à une vue empilée (Mobile). Le passage de `flex-row` à `flex-col` dans le `main` est correct.

---

## 📝 Plan d'Action Design (Roadmap)

### Priorité 1 : Accessibilité & Mobile
1.  **Audit Mobile Réel :** Tester sur un iPhone (Safari) et un Android bas de gamme pour vérifier la fluidité des animations et du scroll.
2.  **Mode "Low FX" :** Ajouter une option dans les paramètres pour désactiver :
    *   L'overlay CRT (scanlines).
    *   Les effets de flou (backdrop-filter).
    *   Les particules de fond (si présentes).
    Cela aidera la lisibilité et la performance.

### Priorité 2 : Raffinement Visuel
1.  **Micro-Interactions :** Ajouter des états `hover` plus distincts sur les boutons interactifs (sons de clics ? bordures qui s'illuminent ?).
2.  **Typographie :** Augmenter légèrement la hauteur de ligne (`leading-relaxed`) dans les blocs de texte IA pour aérer la lecture.

### Priorité 3 : Identité
1.  **Variations de Thème :** Envisager des thèmes débloquables (ex: "Matrix" tout vert, "Synthwave" Violet/Bleu) pour récompenser le joueur, ce qui diversifierait aussi l'accessibilité.
