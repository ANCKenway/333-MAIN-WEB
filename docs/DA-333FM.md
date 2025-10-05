# Direction Artistique — 333FM

Objectif: Une vitrine cinématique, futuriste et affirmée, inspirée du visuel principal de 333FM.

## Palette
- Rouge vif: `#C60202` (accent principal; boutons, bordures, prompts)
- Orange doré: `#F67F41` (accent secondaire; titres, numéros, halos chauds)
- Noir texturé: `#0D0D0D` à `#1A1A1A` (fond, avec grain subtil/diagonales)
- Blanc pur: `#FFFFFF` (texte, contrastes)

Variables CSS: `--red`, `--orange`, `--bg`, `--bg-2`, `--fg`, `--accent`, `--accent-2`.

## Typographie
- Titres / Branding: Serif sculptée (ex: Patorce ou similaire). En pratique sur le site: `Cinzel` pour assurer la dispo web.
- Texte courant: Sans-serif moderne (`Inter`).
- Badges / Labels / Terminal: Monospace (`JetBrains Mono`).

## Ambiance
- Cinématique & provocante: badge "RESTRICTED", barres letterbox, flash et scan au démarrage.
- Futurisme sobre: fond noir profond, effets lumineux rouge/orange, parallax et tilt modérés.
- Identité affirmée: gros logo central; blocs avec caractère (affiche/pochette).

## Composants visuels
- Badge RESTRICTED (monospace, rouge, bordure fine, légère ombre).
- Prompt capsule (une ligne): fond sombre translucide, bordure d’accent rouge, glow discret.
- Overlays (Projets, Boot): fond noir translucide, blur léger, bordure d’accent.
- Effets: starfield chaud, nebula/glow rouge-orangé, shards, ring de particules, lens flare léger.

## Boot "Matrix" (DA)
- Overlay opaque sombre.
- Boîte centrale avec bordure d’accent.
- Pluie de caractères (vert) en arrière-plan.
- Journal coloré: `OK` vert, `WARN` jaune, `ERR` rouge, `search` bleu.
- Finir par un ASCII "333FM" (vert), puis fade-out.

## Interactions
- Intro ciné (scan/flash/letterbox) => Boot => Scène.
- Prompt: discret, lisible, non-intrusif.
- A11y: focus management pour overlays; `prefers-reduced-motion` respecté.

## Notes d’implémentation
- Couleurs dynamiques via `assets/js/colorizer.js` (palette PHP => CSS vars).
- Générateurs côté serveur: `api/icon.php`, `api/og.php`, `api/palette.php`.
- Performance: densité adaptée à la taille/ratio; preload/prefetch.
