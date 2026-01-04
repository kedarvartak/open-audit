import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Inject Firebase config for service worker at build time
      '__FIREBASE_API_KEY__': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      '__FIREBASE_AUTH_DOMAIN__': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      '__FIREBASE_PROJECT_ID__': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      '__FIREBASE_STORAGE_BUCKET__': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      '__FIREBASE_MESSAGING_SENDER_ID__': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      '__FIREBASE_APP_ID__': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
    },
  }
})
