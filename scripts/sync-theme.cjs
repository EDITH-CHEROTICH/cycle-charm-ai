const fs = require('fs');
const path = require('path');

// Path to your central theme configuration
const themeConfigPath = path.resolve(__dirname, '../theme.config.json');
if (!fs.existsSync(themeConfigPath)) {
    console.error('❌ theme.config.json not found!');
    process.exit(1);
}
const themeConfig = require(themeConfigPath);
const colors = themeConfig.colors;

// --- Generate Android colors.xml ---
const androidColorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${Object.entries(colors)
  .map(([name, hex]) => `    <color name="${name.replace(/([A-Z])/g, '_$1').toLowerCase()}">${hex}</color>`)
  .join('\n')}
</resources>
`;
const androidColorsPath = path.resolve(__dirname, '../android/app/src/main/res/values/colors.xml');
try {
    fs.writeFileSync(androidColorsPath, androidColorsXml, 'utf8');
    console.log('✅ Android colors.xml generated successfully.');
} catch (error) {
    console.error('❌ Failed to write Android colors.xml:', error);
}

// --- Generate Web globals.css for shadcn/tailwind ---

function hexToHSL(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
    }
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin,
        h = 0, s = 0, l = 0;

    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return `${h} ${s}% ${l}%`;
}

const webCssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: ${hexToHSL(colors.primary)};
    --primary-foreground: 0 0% 100%; /* White text on mauve */
    --secondary: ${hexToHSL(colors.accent)};
    --secondary-foreground: 0 0% 0%; /* Black text on pink */
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: ${hexToHSL(colors.primary)};
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: ${hexToHSL(colors.primaryDark)};
    --primary-foreground: 0 0% 100%;
    --secondary: ${hexToHSL(colors.accent)};
    --secondary-foreground: 0 0% 0%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: ${hexToHSL(colors.primaryDark)};
  }
}
`;

const webCssPath = path.resolve(__dirname, '../src/globals.css');
try {
    fs.writeFileSync(webCssPath, webCssContent, 'utf8');
    console.log('✅ Web globals.css generated successfully.');
} catch (error) {
    console.error('❌ Failed to write Web globals.css:', error);
    if (error.code === 'ENOENT') {
        console.error('Hint: The file was not found. Is your main CSS file at a different location than src/globals.css?');
    }
}
