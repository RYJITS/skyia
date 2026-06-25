# SkyIA

Application principale de jugement IA adversarial. Elle compare des modeles, orchestre des duels, archive les rapports et suit les performances.

## Objectif

Donner une interface claire a un protocole IA de jugement, benchmark et suivi de modeles.

## Fonctions principales

- Organise des conversations et duels IA.
- Compare les modeles gratuits, serveur et BYOK.
- Archive les resultats, statistiques, latences et rapports.
- Expose un lien public connu tout en gardant un statut securite separe.

## Installation locale

```powershell
npm install
```

## Lancement

```powershell
npm run dev
npm run build
```

## Variables d'environnement

Copier `.env.example` vers `.env` en local puis remplir les valeurs privees.

## Securite

Ne jamais publier `.env`, tokens, sessions, logs sensibles, cles privees ou donnees personnelles.
