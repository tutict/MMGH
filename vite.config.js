import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) {
              return "react-vendor";
            }
            if (id.includes("@tauri-apps")) {
              return "tauri-vendor";
            }
            return "vendor";
          }

          if (id.includes("src/components/WeatherWorkspace.jsx")) {
            return "weather-workspace";
          }

          if (id.includes("src/storage/agent")) {
            return "agent-storage";
          }

          if (id.includes("src/i18n")) {
            return "i18n";
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
});
