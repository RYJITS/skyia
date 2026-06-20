# Index Complet des Fichiers & Dossiers

Ce document sert de "Table des Matières" exhaustive pour le projet **Skyia Judgment Protocol**.

## 📌 Racine (`/`)
| Fichier / Dossier | Rôle |
| :--- | :--- |
| `App.tsx` | **Cœur de l'application**. Contient la logique principale, la gestion d'état (State), et l'assemblage des composants majeurs. |
| `index.tsx` | Point d'entrée React. C'est ici que l'application "démarre" et s'accroche à la page HTML. |
| `index.html` | Squelette de la page web. Contient les méta-données SEO, les polices et le lien vers le script principal. |
| `vite.config.ts` | Configuration de l'outil de build **Vite**. Gère les plugins React et les chemins d'import. |
| `package.json` | "Carte d'identité" du projet Node.js. Liste les dépendances (bibliothèques installées) et les scripts (`npm start`). |
| `.env` | **Fichier Secret**. Contient vos clés API (Stripe, Firebase, OpenRouter). Ne jamais "commiter" sur GitHub. |
| `firebase.json` | Configuration pour le déploiement sur **Firebase Hosting** (règles de redirection, headers). |
| `firestore.rules` | Règles de sécurité de la base de données. Définit qui a le droit de lire ou écrire. |
| `types.ts` | Définitions TypeScript. Assure que le code est structuré rigoureusement (Interfaces `Message`, `User`, `IModel`). |

## 📂 Dossier `components/` (Interface Visuelle)
| Fichier | Description |
| :--- | :--- |
| `Header.tsx` | Barre de navigation supérieure (Logo, Status, Crédits, Hamburger). |
| `ChatInterface.tsx` | Zone de conversation principale. Affiche les messages et gère le scroll automatique. |
| `ThreatDisplay.tsx` | Graphique latéral gauche ("Niveau de Menace"). Courbe rouge dynamique via `Recharts`. |
| `ShowcasePage.tsx` | Page d'accueil visuelle ("Landing Page"). Utilisée pour la présentation marketing avant le lancement. |
| `CRTOverlay.tsx` | Effet visuel "Vieux Moniteur" (lignes de scan, scintillement) par-dessus l'écran. |
| `BackgroundScroller.tsx` | Arrière-plan animé avec du texte défilant (style Matrix / Code). |
| `AuthModal.tsx` | Fenêtre pop-up de connexion (Login Google/Email). |
| `StoreModal.tsx` | **Boutique**. Interface d'achat de packs de crédits (Intégration Stripe). |
| `PaymentProcessor.tsx` | Gère le retour de Stripe (Succès/Échec) et affiche l'animation de confirmation. |
| `ProfileModal.tsx` | Affiche les statistiques du joueur (Historique, Victoires/Défaites). |
| `SaveLoadModal.tsx` | Menu de Sauvegarde et Chargement des parties (JSON Local / Cloud). |
| `EndGameReport.tsx` | Écran de fin de partie (Rapport de mission, Export PDF). |
| `InstallGuideModal.tsx` | Guide visuel pour installer l'application en tant que PWA sur mobile. |

## 📂 Dossier `services/` (Logique Métier)
| Fichier | Ce qu'il fait |
| :--- | :--- |
| `modelService.ts` | **Catalogue IA**. Liste tous les modèles disponibles, leurs prix et leurs ID techniques. |
| `openRouterService.ts` | **Connecteur Universel**. Gère les discussions avec GPT, Claude, Llama via l'API OpenRouter. |
| `geminiService.ts` | **Connecteur Google**. Gère les discussions avec Gemini (API Google directe). Contient les **Prompts Système**. |
| `aiLogic.ts` | Analyseur de réponse. Scanne le texte de l'IA pour trouver le JSON caché (Status du jeu). |
| `firebase.ts` | Initialise la connexion à Firebase (Auth, Firestore) avec les clés de `.env`. |
| `AuthContext.tsx` | **Gardien de Session**. Gère l'utilisateur connecté et écoute les changements de profil en temps réel. |
| `userService.ts` | Gestionnaire de Données Joueur. Lit/Écrit les profils dans Firestore (Ajout crédits, Stats). |
| `stripeService.ts` | Initiateur de Paiement. Crée les sessions de paiement Stripe et redirige l'utilisateur. |
| `pdfService.ts` | Générateur de PDF. Crée le rapport de mission téléchargeable (via `jspdf`). |

## 📂 Dossier `DOCUMENTATION/` (Votre Guide)
| Fichier | Utilité |
| :--- | :--- |
| `DETAILS_IA.md` | Tout sur l'IA : Prompts secrets, correspondance des ID modèles, clés API. |
| `MANUEL_SYSTEME.md` | Guide opérationnel : Comment le paiement fonctionne, clés `.env`, dépannage. |
| `STRUCTURE_PROJET.md` | Version résumée de ce tableau. |
