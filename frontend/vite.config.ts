import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // Listen on all available network interfaces
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173
    }
  }
})