# 333.FM — Vitrine Futuriste

Une vitrine cinématique, logo-centrée, avec:
- intro "letterbox + scan + flash" et impact visuel (WAOUH)
- starfield chaud, shards lumineux, parallax et tilt 3D léger
- terminal navigation ultra-compact (une seule ligne)
- overlay Projets (accessible via commande)
- extracteur de palette (PHP/GD) appliqué dynamiquement aux accents

Stack: HTML/CSS/JS (+ PHP minimal pour l'extractor). Aucune dépendance externe.

## Raccourcis & interactions

- Boot/scan: se lance automatiquement après l'intro (fallback: touche clavier)
- Prompt: focus automatique après le boot
- Pointer: ripple léger à l'impact
- Échap: fermeture d’overlays (ex. Projets)

## Modifier les projets

Éditez `projects.json` et ajoutez vos items:
```
{
  "id": 4,
  "slug": "mon-projet",
  "title": "Mon projet — Tagline",
  "status": "wip",
  "url": "https://..."
}
```
Puis, dans le terminal: `projects`, puis `open 4` ou `open mon-projet`.

## Commandes du terminal (une ligne)
- URL (avec ou sans http): ouvre dans un nouvel onglet
- poster: exporte l’image du canvas en PNG (poster)
- mail | mailto: ouvre le client mail (contact@333fm.fr)
- sc | radio: ouvre SoundCloud
- projects | proj: ouvre l’overlay Projets

## Structure

```
api/
  palette.php            # endpoint extractor
assets/
  css/style.css          # styles (intro, drawer, overlays)
  img/cover.jpg          # logo principal utilisé pour le hero et la palette
  js/
    colorizer.js         # applique la palette extraite (API puis canvas)
    parallax.js          # parallax, starfield et shards + Scene.burst
  terminal.js          # faux terminal minimal (router 1-ligne)
  projects.js          # overlay projets (alimentation via projects.json)
  main.js              # bootstrap UI (intro, boot, toasts, effets)
index.html               # structure principale (hero + overlays)
projects.json            # vos projets
README.md                # ce fichier
```

## Extracteur de palette (PHP)

Endpoint: `/api/palette.php?img=assets/img/cover.jpg&k=5`

Réponse JSON:
```
{
  "main": [r,g,b],
  "secondary": [r,g,b],
  "palette": [[r,g,b], ...]
}
```

Notes:
- `img` est relatif à la racine du site. Fallback prévu sur `cover.jpg` à la racine si le fichier n'est pas trouvé.
- `k` = nombre de couleurs (2..8). Défaut: 5.
- L'entête `Cache-Control` max-age=86400 est activée.

Client: `assets/js/colorizer.js` appelle l'endpoint, applique `--accent` et `--accent-2`, puis retombe sur un sampling canvas si l'API échoue.

## Déploiement
Le dossier est prêt pour WAMP/Apache avec PHP (GD). Placez tout dans `www/333FM SITE PRO`.

Accès local:

```
http://localhost/333FM%20SITE%20PRO/
```

Extractor (palette):

```
http://localhost/333FM%20SITE%20PRO/api/palette.php?img=assets/img/cover.jpg
```

## Personnalisation rapide
- Styles: `assets/css/style.css`
- Parallax/Starfield: `assets/js/parallax.js`
- Terminal/Commandes: `assets/js/terminal.js`

## Direction Artistique (DA)
La DA complète, la palette et les guidelines sont documentées ici:

- `docs/DA-333FM.md`

## Nettoyage / maintenance
- Fonctionnalités UI non utilisées (palette/chips) retirées
- Le logo a été déplacé dans `assets/img/cover.jpg` (toutes les références sont mises à jour).
