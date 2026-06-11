import { defineConfig } from 'vite'
import airx from 'vite-plugin-airx'

export default defineConfig({
  plugins: [airx()],
  server: {
    port: 3000
  }
})