import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // BASE_PATH is set only by the GitHub Pages workflow; everything else serves from /.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
