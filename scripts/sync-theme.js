const fs = require('fs');
const path = require('path');

// Path to your central theme configuration
const themeConfigPath = path.resolve(__dirname, '../theme.config.json');
const themeConfig = require(themeConfigPath);
const colors = themeConfig.colors;

// --- Generate Android colors.xml ---
const androidColorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${Object.entries(colors)
  .map(([name, hex]) => `    <color name="${name}">${hex}</color>`)
  .join('\n')}
</resources>
`;

const androidColorsPath = path.resolve(__dirname, '../android/app/src/main/res/values/colors.xml');
fs.writeFileSync(androidColorsPath, androidColorsXml, 'utf8');
console.log('✅ Android colors.xml generated successfully.');


// --- Generate Web globals.css ---
const webCss = `:root {
  --ion-color-primary: ${colors.primary};
  --ion-color-primary-rgb: ${hexToRgb(colors.primary)};
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255,255,255;
  --ion-color-primary-shade: #b290ac;
  --ion-color-primary-tint: #cfacc9;

  --ion-color-secondary: ${colors.accent};

  /* You can add more CSS variables here */
}

/* If you use Tailwind, you could generate tailwind.config.js colors here instead */
`;

const webCssPath = path.resolve(__dirname, '../src/theme/variables.css'); // Adjust path if needed
fs.writeFileSync(webCssPath, webCss, 'utf8');
console.log('✅ Web CSS variables generated successfully.');

// Helper to convert hex to RGB for Ionic variables
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}
