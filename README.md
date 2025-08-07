# Fantasy-Survival

Initial scaffold for a fantasy survival text-based builder. The project is
structured into modular core functions that share a central data store to avoid
duplicate or inconsistent data. Modules currently include:

- **buildings** – available building types, constructed buildings and buildable
  options tied to unlocked technology.
- **people** – population details and aggregate statistics.
- **inventory** – resources with quantity and demand tracking.
- **location** – geographical generation based on biome.
- **technology** – unlocked technologies which gate other features.
- **time** – day and season progression.

The application is a static site and can be served locally via any HTTP server
that supports ES modules. The default entry point is `index.html` which loads
`src/main.js`.

## Development

Install dependencies (none yet) and run the placeholder test script:

```bash
npm install
npm test
```

This repository is intended to be hosted on GitHub Pages.
