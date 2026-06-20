# Refactorisation: Discovery & Sûreté de Redémarrage

## Objectifs
1.  **Nettoyage de l'interface** : Déplacer l'accès à "Discovery" (Recherche de modèles) dans la séquence de démarrage (Intro / Boot).
2.  **Sûreté des Données** : Empêcher la perte accidentelle de conversation lors d'un rafraîchissement (F5 / Reload).
3.  **Simplification** : Supprimer le bouton "Reboot Home" qui est redondant avec le refresh navigateur.

## Modifications Proposées

### 1. `components/Header.tsx`
*   **[SUPPRESSION]** Bouton "Reboot Home" (icône `RotateCcw`).
*   **[SUPPRESSION]** Bouton "Discovery" (icône `Search`).
*   **Note** : Le header sera plus épuré, ne gardant que les fonctions essentielles en cours de jeu (Store, Save, Profile, Export).

### 2. `App.tsx` (Séquence d'Intro & Logique Principale)
*   **[MODIFICATION]** `IntroSequence` :
    *   Ajouter un bouton "Discovery / Réseau Neural" dans la section "Paramètres Avancés" (au côté de "Load Game" et "Install").
*   **[NOUVEAU]** Gestionnaire `beforeunload` :
    *   Détecter si une conversation est active (longueur messages > 0).
    *   Afficher un message natif du navigateur "Voulez-vous vraiment quitter ?".
    *   *Note technique* : On ne peut pas "rediriger vers la sauvegarde" *pendant* l'événement `beforeunload`, c'est une limitation de sécurité des navigateurs. Ce qu'on peut faire, c'est inciter l'utilisateur à annuler le refresh, puis lui ouvrir la modale de sauvegarde.
    *   Alternative UX : Si l'utilisateur clique sur "Refresh" dans le navigateur, on ne peut pas l'intercepter pour ouvrir une modale *avant*. On ne peut que lui demander confirmation.
*   **[MODIFICATION]** `handleRefresh` : Si on garde une action explicite de "Reset", elle doit être différente. Mais ici l'utilisateur veut utiliser le F5 comme un Reboot.

### 3. Logique de Sauvegarde "Protection"
*   On ne peut pas forcer la sauvegarde *pendant* la fermeture.
*   **Solution** : Afficher un bandeau ou une alerte si l'utilisateur essaie de partir sans sauvegarder (via `window.onbeforeunload`).
*   Si l'utilisateur *annule* le départ, ALORS on ouvre automatiquement la modale de sauvegarde.

## Fichiers Impactés
*   `src/App.tsx`
*   `src/components/Header.tsx`
