import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.stemgame.app',
  appName: 'STEM Problem Game',
  webDir: 'dist',
  server: {
    // On Android, HTTPS scheme avoids mixed-content warnings when calling the
    // production API. On iOS the default 'capacitor://' scheme is used.
    androidScheme: 'https',
    // Uncomment during development with live reload (replace with your LAN IP):
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#2E75B6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosSpinnerStyle: 'large',
      spinnerColor: '#FFFFFF',
      showSpinnerOnlyOnFirstLoad: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#2E75B6',
    },
  },
};

export default config;
