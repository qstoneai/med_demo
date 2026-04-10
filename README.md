# MedReg AI — Medical Device Regulatory Assistant

A production-ready demo web application for medical device regulatory compliance teams. Built with **Next.js 16 App Router**, **TypeScript**, and **Tailwind CSS v4**.

## Features

| Page | Description |
|---|---|
| **Dashboard** | KPI cards, compliance health bars, recent activity feed |
| **Regulatory Chat** | Chat with Claude AI about FDA, EU MDR, ISO standards |
| **Upload & Review** | Drag-and-drop PDF/DOCX → AI compliance gap analysis |
| **Audit Log** | Searchable, filterable table with CSV export |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
# Edit .env.local and add your Anthropic API key
```

### 3. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app works in **demo mode** without an API key (pre-written regulatory responses are used).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional* | Anthropic API key for live Claude responses |

*The app runs in demo mode without a key — ideal for demos and presentations.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 + custom CSS design system
- **AI**: Anthropic Claude via `@anthropic-ai/sdk`
- **Deployment**: Vercel

## Project Structure

```
app/
├── layout.tsx          # Root layout + sidebar shell
├── page.tsx            # Redirects → /dashboard
├── dashboard/page.tsx  # Main dashboard
├── chat/page.tsx       # Regulatory chat UI
├── upload/page.tsx     # File upload + review
├── audit/page.tsx      # Audit log viewer
└── api/
    ├── chat/route.ts   # Claude Messages API proxy
    ├── upload/route.ts # Document analysis
    └── audit/route.ts  # Audit log API

components/
├── layout/             # Sidebar, TopBar
lib/
├── anthropic.ts        # Claude client wrapper
├── audit.ts            # In-memory audit store
└── types.ts            # Shared TypeScript types
```

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add your API key as a secret
vercel env add ANTHROPIC_API_KEY
```

Or connect your GitHub repo in the [Vercel Dashboard](https://vercel.com/new) for automatic deployments.

## Regulatory Coverage

The AI assistant covers:
- **FDA** — 21 CFR Part 820, 807, 801, 814
- **EU MDR** — 2017/745 (Annex I–XIV)
- **EU IVDR** — 2017/746
- **ISO 13485** — Quality Management Systems
- **ISO 14971** — Risk Management
- **IEC 62304** — Software Lifecycle

## License

MIT — for demo and educational purposes.
