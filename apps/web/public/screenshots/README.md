# Screenshots PWA

Ce dossier contient les screenshots de l'application pour le manifest PWA et les app stores.

## Fichiers requis

### 1. Desktop Screenshot
- **Nom:** `desktop.png`
- **Dimensions:** 1920x1080 (16:9)
- **Format:** PNG
- **Description:** Vue du dashboard principal en mode desktop

### 2. Mobile Screenshot
- **Nom:** `mobile.png`
- **Dimensions:** 750x1334 (9:16)
- **Format:** PNG
- **Description:** Vue du dashboard principal en mode mobile

## Comment créer les screenshots

### Méthode 1: Capture d'écran manuelle

1. **Desktop (1920x1080)**
   ```bash
   # Ouvrir le dashboard dans un navigateur
   # Redimensionner la fenêtre à 1920x1080
   # Prendre un screenshot (Cmd+Shift+4 sur Mac, Win+Shift+S sur Windows)
   # Sauvegarder comme desktop.png dans ce dossier
   ```

2. **Mobile (750x1334)**
   ```bash
   # Ouvrir le dashboard dans un navigateur
   # Ouvrir les DevTools (F12)
   # Activer le mode "Device Toolbar" (Cmd+Shift+M / Ctrl+Shift+M)
   # Sélectionner "iPhone 6/7/8" ou "iPhone X/XS" ou définir manuellement 750x1334
   # Note: iPhone 8 Plus = 1080x1920, pas 750x1334
   # Prendre un screenshot
   # Sauvegarder comme mobile.png dans ce dossier
   ```

### Méthode 2: Automatisée avec Playwright

```typescript
// scripts/generate-screenshots.ts
import { chromium } from 'playwright';

async function generateScreenshots() {
  const browser = await chromium.launch();
  
  // Desktop screenshot
  const desktopPage = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });
  await desktopPage.goto('http://localhost:4321/app/dashboard');
  await desktopPage.screenshot({
    path: 'apps/web/public/screenshots/desktop.png',
    fullPage: false
  });
  
  // Mobile screenshot
  const mobilePage = await browser.newPage({
    viewport: { width: 750, height: 1334 }
  });
  await mobilePage.goto('http://localhost:4321/app/dashboard');
  await mobilePage.screenshot({
    path: 'apps/web/public/screenshots/mobile.png',
    fullPage: false
  });
  
  await browser.close();
  console.log('Screenshots generated successfully!');
}

generateScreenshots();
```

### Méthode 3: Avec puppeteer

```bash
npm install --save-dev puppeteer

# Créer et exécuter le script
node scripts/generate-screenshots.js
```

## Optimisation des images

Après création, optimiser les images:

```bash
# Installer ImageMagick ou sharp
npm install sharp

# Optimiser
npx sharp -i desktop.png -o desktop-optimized.png --quality 90
npx sharp -i mobile.png -o mobile-optimized.png --quality 90

# Remplacer les originaux
mv desktop-optimized.png desktop.png
mv mobile-optimized.png mobile.png
```

## Validation

Après ajout des screenshots:

1. Vérifier qu'ils s'affichent dans le manifest:
   ```bash
   curl http://localhost:4321/manifest.json | jq .screenshots
   ```

2. Tester avec Lighthouse:
   ```bash
   lighthouse http://localhost:4321/app/dashboard --view
   ```

3. Tester dans Chrome DevTools:
   - Ouvrir DevTools (F12)
   - Application → Manifest
   - Vérifier la section "Screenshots"

## Conseils pour de bons screenshots

✅ **Faire:**
- Utiliser des données réalistes (pas de lorem ipsum)
- Montrer les fonctionnalités clés
- Avoir une belle UI (pas d'éléments cassés)
- Utiliser le thème par défaut (dark ou light selon config)
- Masquer les données sensibles

❌ **Ne pas faire:**
- Inclure des données personnelles réelles
- Avoir des erreurs/warnings visibles
- Montrer un état de chargement
- Utiliser des images floues ou de mauvaise qualité
- Inclure le curseur de la souris

## Statut

- [ ] desktop.png (1920x1080)
- [ ] mobile.png (750x1334)

Une fois créés, supprimer ce fichier ou le mettre à jour avec ✅.
