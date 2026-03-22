import pkg from './package.json' assert { type: 'json' }
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [dts()],
  build: {
    outDir: resolve(__dirname, 'output'),
    lib: {
      name: pkg.name,
      fileName: 'index',
      entry: resolve(__dirname, 'source/index.ts'),
      formats: ['es'],
    }
  },
})
