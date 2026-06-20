# Guide SEO (Optimisation pour Moteurs de Recherche)

Ce document explique comment optimiser le référencement ("CEO" / SEO) de l'application Skyia.net.

> **Note :** Skyia est une "Single Page Application" (SPA) React. Google arrive à lire le contenu, mais c'est moins efficace qu'un site statique classique.

## 🚀 Actions d'Optimisation (Déjà en place)

1.  **Méta-titre Dynamique** : `<title>Skyia | skyia.net</title>`
2.  **Méta-description** : Il faut en ajouter une !
3.  **Vitesse de Chargement** : L'utilisation de Vite et le fractionnement du code (Code Splitting) assurent un chargement rapide.

## 📈 Plan d'Amélioration SEO (À Faire)

### 1. Ajouter les Balises Méta (Social & Google)
Dans le fichier `index.html`, ajoutez ces lignes dans le `<head>` :

```html
<!-- Description pour Google -->
<meta name="description" content="Skyia Judgment Protocol : Une expérience narrative IA interactive. Dialoguez avec une superintelligence artificielle pour déterminer le sort de l'humanité." />

<!-- Open Graph (Pour Facebook, LinkedIn, Discord) -->
<meta property="og:title" content="Skyia Protocol | IA Interactive" />
<meta property="og:description" content="L'IA vous juge. Avez-vous les arguments pour sauver l'humanité ? Jouez maintenant." />
<meta property="og:image" content="https://skyia.net/preview-image.jpg" />
<meta property="og:url" content="https://skyia.net" />
<meta property="og:type" content="website" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Skyia Protocol" />
<meta name="twitter:description" content="L'IA vous juge. Sauvez l'humanité." />
<meta name="twitter:image" content="https://skyia.net/preview-image.jpg" />
```

### 2. Optimiser les Mots-Clés
Assurez-vous que les textes de la page d'accueil (`ShowcasePage.tsx`) contiennent les mots-clés importants :
*   "Intelligence Artificielle"
*   "Jeu narratif"
*   "Chatbot"
*   "Futur"
*   "Simulation"

### 3. Performance & Mobile
*   **Lighthouse Score** : Lancez un audit dans Chrome DevTools (Onglet Lighthouse). Visez un score > 90.
*   **Image Optimization** : Convertissez les grosses images PNG en format **WebP** plus léger.
*   **PWA** : Le `manifest.json` est déjà là, ce qui est excellent pour le mobile (Google adore les PWA).

### 4. Backlinks (Liens Entrants)
Pour être visible sur Google :
*   Partagez le lien sur Reddit, Twitter, LinkedIn.
*   Ecrivez un article de blog (Medium) expliquant "Comment j'ai créé Skyia".
*   Inscrivez le site sur des annuaires d'IA (ex: "There's An AI For That").
