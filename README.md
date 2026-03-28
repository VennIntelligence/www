# Venn Intelligence Foundation — Official Website

> **Venn Intelligence Foundation LLC** — Decentralized Privacy × LLM Infrastructure × Intelligent Trading

Official landing page for Venn Intelligence Foundation, a Wyoming-based LLC specializing in next-generation AI infrastructure, quantitative trading systems, academic donations, and technical consulting.

🌐 **Domain**: [vennai.org](https://vennai.org)

---

## 🏢 Company Profile

| | |
|---|---|
| **Full Name** | Venn Intelligence Foundation LLC |
| **Chinese Name** | 文氏智能基金会有限责任公司 |
| **Type** | LLC (Limited Liability Company) |
| **State** | Wyoming (WY) |
| **Founded** | February 25, 2026 |
| **Registration ID** | 2026-001903366 |
| **Address** | 30 N Gould St Ste N, Sheridan, WY 82801 |
| **Founder & CEO** | Chengzhi Gao |
| **Registered Agent** | Northwest Registered Agent Service Inc |

---

## 🎯 What We Do

### Core Focus Areas
- **Decentralized Privacy** — Building infrastructure for a privacy-first future
- **LLM-Era Infrastructure** — Tools and platforms for the age of large language models
- **Intelligent Trading Systems** — AI-agent-driven quantitative trading infrastructure

### Our Product — VennTriggerTrade
A comprehensive intelligent scheduling infrastructure for strategy generation and execution, powered by large language model agents and featuring a smart hook-based architecture.

→ [Product Details →](/product/venn-trigger-trade)

### Services
- **Academic Donation Program** — Supporting research and education
- **Technical Consulting** — Linux systems, AI agents, prompt engineering, and more

---

## 🛠 Tech Stack

```
Frontend:
  ├── React 19.x
  ├── Vite 8.x
  ├── Vanilla CSS (custom design system)
  └── React Router (client-side routing)

Hosting:
  ├── Cloudflare Workers (GitHub auto deploy)
  └── Custom domain (vennai.org)

Language:
  ├── Default: English
  ├── Supported: Chinese (中文)
  └── Others: via Google Translate
```

---

## 📁 Project Structure

```
Vennai/
├── public/
│   ├── favicon.ico
│   └── assets/                # Static images, icons
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── About.jsx
│   │   ├── Product.jsx
│   │   ├── Services.jsx
│   │   └── Footer.jsx
│   ├── pages/                 # Page-level components
│   │   ├── Home.jsx           # Main landing page
│   │   ├── ProductDetail.jsx  # VennTriggerTrade detail page
│   │   └── NotFound.jsx       # 404
│   ├── i18n/                  # Internationalization
│   │   ├── en.json            # English strings
│   │   └── zh.json            # Chinese strings
│   ├── styles/                # CSS files
│   │   ├── index.css          # Global styles & design tokens
│   │   └── components/        # Component-specific styles
│   ├── App.jsx                # Root component with routing
│   └── main.jsx               # Entry point
├── todos/                     # Development task tracking
│   └── phase1-design-layout.md
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🌐 Deployment

### Cloudflare Workers (Production)

Repository:
- Git provider: GitHub
- Repo: `https://github.com/VeenIntelligence/www`
- Production branch: `main`
- Monorepo: yes (current frontend project root is `/`)

Build config:
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node.js version: `20.19.0+` (Vite 8 requires `^20.19.0 || >=22.12.0`)
- Install command: `npm install` (or `npm ci`)
- Config file: `wrangler.toml`
- Worker entrypoint: `worker.js`

Wrangler config:
- `name = "www"`
- `main = "worker.js"`
- `assets.directory = "./dist"`
- `assets.binding = "ASSETS"`
- `assets.not_found_handling = "single-page-application"`

Cloudflare dashboard checks:
- Service name should be `www`
- Git repo should be `VeenIntelligence/www`
- Automatic deployments should be enabled
- Latest deployment logs should show your repo build output (not default template)

If you still see `Hello World`, open `Workers & Pages -> www -> Deployments` and check logs for missing `wrangler.toml`, wrong root directory, or failed build.

Environment variables:
- Production: none

Routing:
- SPA fallback: enabled at Worker assets level via `not_found_handling = "single-page-application"`
- `public/_redirects` remains compatible for static hosting fallback

#### Setup Steps
1. In Cloudflare dashboard, go to `Workers & Pages` -> `www` -> `Settings` -> `Builds & deployments`.
2. Connect GitHub repo `VeenIntelligence/www` and set production branch to `main`.
3. Set root directory to `/`, build command to `npm run build`, output directory to `dist`.
4. Keep `wrangler.toml` at repo root so Cloudflare can resolve `worker.js` and static asset binding.
5. Redeploy from `Deployments` after saving settings.
6. Bind custom domain `vennai.org` (and optional `www.vennai.org`) to Worker `www`.

#### Domain Status Note
You said the domain is purchased but not bound to any server yet. That is fine.
You only need DNS pointing to Cloudflare (or nameservers switched to Cloudflare) before/while binding `vennai.org` to this Worker service.

#### Manual Trigger Command
Default behavior is auto deploy on push to `main`.
If you want to force a deploy without code changes, run:

```bash
git commit --allow-empty -m "chore: trigger cloudflare workers deploy" && git push origin main
```

---

## 📋 Development Phases

Development is tracked in the [`todos/`](./todos/) directory.

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Page layout & content structure | 🔄 In Progress |
| Phase 2 | Visual polish & animations | ⏳ Pending |
| Phase 3 | Stripe payment + backend integration | ⏳ Pending |
| Phase 4 | Email, analytics, production deploy | ⏳ Pending |

→ See [todos/phase1-design-layout.md](./todos/phase1-design-layout.md) for current tasks.

---

## 📜 License

© 2026 Venn Intelligence Foundation LLC. All rights reserved.
