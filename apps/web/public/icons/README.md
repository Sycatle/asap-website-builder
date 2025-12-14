# PWA Icons

Ce dossier contient les icônes pour la PWA ASAP.

## Icônes requises

Pour générer les icônes PNG à partir du fichier SVG, vous pouvez utiliser un outil comme:
- [Real Favicon Generator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://github.com/nickytonline/pwa-asset-generator)
- ImageMagick en ligne de commande

### Tailles requises

- `icon-16x16.png`
- `icon-32x32.png`
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `apple-touch-icon.png` (180x180)

### Génération avec ImageMagick

```bash
# Installer ImageMagick si nécessaire
# sudo apt install imagemagick

# Générer toutes les tailles
for size in 16 32 72 96 128 144 152 192 384 512; do
  convert -background none icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done

# Apple Touch Icon
convert -background none icon.svg -resize 180x180 apple-touch-icon.png
```

### Génération avec sharp (Node.js)

```javascript
const sharp = require('sharp');
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  sharp('icon.svg')
    .resize(size, size)
    .png()
    .toFile(`icon-${size}x${size}.png`);
}

// Apple Touch Icon
sharp('icon.svg')
  .resize(180, 180)
  .png()
  .toFile('apple-touch-icon.png');
```
