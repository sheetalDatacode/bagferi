import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Auto-copy logo to public/ so it's served as favicon
function copyLogoPlugin() {
  return {
    name: "copy-logo-to-public",
    buildStart() {
      const src = path.resolve(__dirname, "data/logos/dealing-india-logo.png");
      const dest = path.resolve(__dirname, "public/dealing-india-logo.png");
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log("[copy-logo] dealing-india-logo.png → public/dealing-india-logo.png");
      }
    },
  };
}


// Inject Firebase config into SW at build time (SW cannot use import.meta.env)
function firebaseSwPlugin() {
  return {
    name: "firebase-sw-inject",
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist/firebase-messaging-sw.js");
      if (!fs.existsSync(swPath)) return;
      const config = {
        apiKey: process.env.VITE_FIREBASE_API_KEY || "",
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "237174767048",
        appId: process.env.VITE_FIREBASE_APP_ID || "",
        measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "",
      };
      let content = fs.readFileSync(swPath, "utf8");
      content = content.replace("self.__FIREBASE_CONFIG__ || null", `self.__FIREBASE_CONFIG__ || ${JSON.stringify(config)}`);
      fs.writeFileSync(swPath, content);
    },
  };
}

export default defineConfig({
  plugins: [react(), copyLogoPlugin(), firebaseSwPlugin()],
  resolve: {
    alias: {
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "recharts", "@headlessui/react"],
    force: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/upload": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
