# Audit securite - 05_skyia

- Date: 2026-06-20T21:37:46.199Z
- Projet: `D:\00_Cerveau_IA\Projet\05_skyia`
- Statut: **FAIL_SESSIONS**
- Publication publique: bloquee ou reservee

| Severite | Type | Chemin |
| --- | --- | --- |
| blocker | blocked-file | .env |
| blocker | generic-secret | api/index.php |
| blocker | session-or-auth-path | api/lib/auth.php |
| blocker | generic-secret | api/lib/auth.php |
| blocker | generic-secret | api/lib/config.php |
| blocker | session-or-auth-path | components/AuthModal.tsx |
| blocker | session-or-auth-path | services/AuthContext.tsx |
| blocker | generic-secret | services/AuthContext.tsx |
| blocker | generic-secret | services/userKeysService.ts |

## Regle

Ne pas publier sur GitHub, Hostinger ou le site hub tant que le statut commence par `FAIL`.
