# Venn Intelligence Foundation

Venn Intelligence Foundation funds and publishes early attempts at collective-intelligence infrastructure: systems for identity, coordination, reasoning, and agent-native market work.

The website at [vennai.org](https://vennai.org) is the public surface for that work. It is intentionally small: one landing page, two active project narratives, a consulting entry point, and a bilingual blog.

## Public Narrative

Venn is built around a simple premise: the internet connected people faster than it helped them think together. The foundation explores infrastructure that can make collective reasoning more legible, durable, and economically expressive.

Current focus areas:

- **Project Σ** — infrastructure for human collective intelligence, including proof of humanity, information-theoretic contribution scoring, cognitive topology, and multi-tribe token economics.
- **Project Ω** — documentation for building AI-native trading systems, focused on architecture decisions, failed paths, pivots, and human-agent governance.
- **Consulting** — direct advisory sessions offered under the Taitan Pascal studio name.
- **Blog** — bilingual essays and technical notes that explain the work as it develops.

## Content Principles

- Keep the site public-facing, not internal-facing.
- Avoid publishing personal legal names or private identity details.
- Keep UI copy in `src/config/i18n.js` with English and Chinese variants.
- Use the site to explain the work, not the repository structure.

## Development

```bash
npm install
npm run dev
npm run build
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Vite server |
| `npm run dev:gpu` | Start with the GPU debug panel enabled |
| `npm run build` | Build the production bundle |
| `npm run lint` | Run ESLint |
| `npm run audit` | Run the local project audit |
| `npm run cf:deploy` | Build and deploy to Cloudflare Workers |

## Architecture Notes

The site is a React/Vite single-page app with bilingual copy, WebGL section backgrounds, adaptive GPU quality, and Cloudflare Workers deployment.

Important paths:

| Path | Role |
| --- | --- |
| `src/config/i18n.js` | All English and Chinese UI copy |
| `src/pages/home/` | Landing-page sections |
| `src/styles/sections/` | Section-specific CSS |
| `src/components/UnifiedStage.jsx` | Shared WebGL compositor |
| `src/hooks/useSectionFreeze.js` | Off-screen animation freeze hook |
| `src/hooks/useAdaptiveQuality.js` | Adaptive render quality hook |
| `worker.js` | Cloudflare Worker entry point |

## Deployment

Production builds are served from Cloudflare Workers.

```bash
npm run build
npm run cf:deploy
```

## License

© 2026 Venn Intelligence Foundation LLC. All rights reserved.
