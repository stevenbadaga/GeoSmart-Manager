import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  root: fs.realpathSync(path.dirname(fileURLToPath(import.meta.url))),
  plugins: [react(), tailwindcss()],
})
