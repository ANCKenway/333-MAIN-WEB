# Verrou 2FA — Utilisation

Deux modes:

1) Verrou global (tout le site derrière 2FA)
   - Créez un fichier vide `frontgate.lock` à la racine
   - (Optionnel) Dans `api/config.php`, vous pouvez aussi définir `FRONTGATE_LOCK` à true
   - Toutes les requêtes passent alors par `frontgate.php`

2) Verrou admin seulement (défaut)
   - Sans `frontgate.lock`, seuls `admin.html` et `admin-login.html` sont protégés

Configuration:
- `api/config.php` (local, non versionné):
  - `ADMIN_PASSWORD_HASH`: hash bcrypt/argon2 du mot de passe
  - `ADMIN_TOTP_SECRET_HEX`: secret TOTP hex (optionnel ou en plus du MDP)
  - `ADMIN_IPS`: liste blanche d’adresses IP (optionnel)

Bonnes pratiques:
- Utiliser MDP + TOTP
- Activer HTTPS (cookies `Secure`)
- Garder `api/config.php` hors Git (déjà dans `.gitignore`)
- En cas de lock global, tester que CSS/JS/Fonts sont servis (MIME inclus)
