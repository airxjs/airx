import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['source/**/*.test.{js,ts}'],
    coverage: {
      include: ['source/**/*.ts'],
      reporter: ['text', 'json', 'html'],
      exclude: ['source/**/*.test.ts', 'source/**/*.d.ts']
    }
  }
})
