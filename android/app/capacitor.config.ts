import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cyclecharm.app', // Ensure this matches the package name in google-services.json
  appName: 'Cycle Charm',
  webDir: 'dist',
};

export default config;
