# Structure du Projet: Skyia Judgment Protocol

Ce document détaille l'organisation des fichiers et dossiers du projet **Skyia Judgment Protocol**.

## 📂 Racine du Projet

- **ROOT (`/`)**
  - `App.tsx` : **Cerveau de l'application**. Gère l'état global (crédits, modèle IA actuel, historique du chat, modales), l'orchestration des composants (Header, Chat, ThreatDisplay) et la logique du jeu (Victoire/Défaite).
  - `index.tsx` : Point d'entrée React. Monte `App.tsx` dans le DOM.
  - `vite.config.ts` : Configuration du bundler Vite (gestion des ports, plugins React).
  - `package.json` : Liste des dépendances (React, Firebase, Stripe, Lucide-React, etc.) et scripts de lancement (`dev`, `build`).
  - `.env` : **Fichier critique**. Contient les clés API (Firebase, Stripe, OpenRouter, Google AI) et identifiants de projet. **Ne jamais partager.**
  - `firebase.json` : Configuration du déploiement Firebase Hosting et règles de sécurité.
  - `firestore.rules` : Règles de sécurité de la base de données (qui peut lire/écrire quoi).

---

## 📂 Components (`/components`)

Ces fichiers sont les briques visuelles de l'interface.

- **Interface Principale**
  - `Header.tsx` : Barre supérieure (Logo, Status IA, Crédits, Menu Burger).
  - `ChatInterface.tsx` : Zone de discussion. Affiche les bulles de messages (User/IA) et gère le scroll automatique.
  - `ThreatDisplay.tsx` : Graphique de "Niveau de Menace" (courbe rouge) sur la gauche. Utilise `recharts`.
  - `CRTOverlay.tsx` : Effet visuel "rétro" (lignes de scan, vignetage) posé par-dessus tout l'écran.
  - `BackgroundScroller.tsx` : Fond défilant (code Matrix vert/rouge).

- **Système d'Intro & Showcase**
  - `ShowcasePage.tsx` : Page d'accueil visuelle ("Landing Page") avant le lancement du protocole.
  - `InstallGuideModal.tsx` : Guide d'installation de l'application (PWA).

- **Modales & Fonctionnalités**
  - `AuthModal.tsx` : Fenêtre de connexion/inscription (Google & Email).
  - `StoreModal.tsx` : **Boutique**. Affiche les packs de crédits, gère la sélection et redirige vers Stripe.
  - `PaymentProcessor.tsx` : Gère le retour de paiement (succès/échec) et l'animation de confirmation.
  - `ProfileModal.tsx` : Affiche les stats du joueur (victoires, défaites, historique).
  - `SaveLoadModal.tsx` : Système de sauvegarde/chargement des parties (JSON local ou Cloud).
  - `EndGameReport.tsx` : Écran de fin de jeu (Victoire ou Défaite) avec résumés et export PDF.

---

## 📂 Services (`/services`)

Ce dossier contient la logique métier (le "moteur" invisible).

- **Intelligence Artificielle**
  - `modelService.ts` : Gestion des modèles IA (GPT, Gemini, Claude). Définit leurs coûts, noms et ID.
  - `openRouterService.ts` : Connecteur vers **OpenRouter**. Gère l'envoi des prompts et la réception du stream de texte.
  - `geminiService.ts` : Connecteur spécifique pour les modèles Google Gemini (V1.5/2.0).
  - `aiLogic.ts` : Cerveau logique. Analyse la réponse de l'IA pour déterminer le "Niveau de Menace" et détecter la Victoire/Défaite.

- **Backend & Données**
  - `firebase.ts` : Initialisation de la connexion Firebase (Auth, Firestore).
  - `AuthContext.tsx` : **Système d'Authentification**. Gère la session utilisateur et la synchronisation temps réel du profil.
  - `userService.ts` : Fonctions CRUD (Create, Read, Update) pour manipuler les profils joueurs dans Firestore (ajout crédits, stats).
  - `stripeService.ts` : Gestion des paiements. Crée les sessions Stripe Checkout.
  - `pdfService.ts` : Générateur de PDF pour les rapports de fin de mission (utilise `jspdf`).

---

## 📂 Types

- `types.ts` : Définitions TypeScript globales (Interfaces pour `Message`, `UserProfile`, `AIModel`, etc.). Assure la cohérence des données.

---

## 📂 Public (`/public`)

Fichiers statiques accessibles directement.

- `manifest.json` : Configuration PWA (icône, nom, couleur de fond pour installation mobile).
- Images/Sons : Assets graphiques et sonores (non listés exhaustivement ici).
