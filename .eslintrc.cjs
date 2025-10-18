module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:n/recommended',
    'plugin:promise/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'n/no-missing-import': 'off',
    'n/no-unsupported-features/es-builtins': 'off',
    'n/no-unsupported-features/es-syntax': 'off',
    'no-unused-vars': 'off',
    'promise/catch-or-return': 'off',
    'no-inner-declarations': 'off',
    'no-useless-escape': 'off'
  }
};
