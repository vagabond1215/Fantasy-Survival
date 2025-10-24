# Contributing to Fantasy Survival

Thank you for your interest in improving **Fantasy Survival**! This document captures the basics required to get up and running with the project and to submit successful pull requests.

## Development workflow

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the development server**
   ```bash
   npm run dev
   ```
   The project uses [Vite](https://vitejs.dev) for the development environment.
3. **Run the tests and quality gates** before pushing your changes:
   ```bash
   npm run lint
   npm test
   npm run check:types
   npm run check:links
   npm run guard:paths
   ```
4. **Format your changes** when necessary with Prettier:
   ```bash
   npm run format
   ```

## Pull request guidelines

- Create focused branches that tackle a single piece of work.
- Update documentation when your change affects the user-facing experience or developer tooling.
- Keep the commit history clear and descriptive.
- Ensure the CI pipeline remains green.

## Reporting issues

If you discover a bug or have a feature request, please [open an issue](https://github.com/) with as much detail as possible. Screenshots, reproduction steps, and environment details help us investigate quickly.

We appreciate your contributions and feedback—thanks for helping make Fantasy Survival better!
