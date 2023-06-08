module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  overrides: [
    { files: ['source/**/*.ts'] }
  ],
  rules: {
  }
}
