# LayerSplit TMA

Telegram Mini App frontend built with Next.js 16 and React 19.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **React:** 19.2
- **Styling:** Tailwind CSS 4
- **Animation:** Framer Motion
- **Wallet:** @mysten/dapp-kit + Slush Wallet
- **Blockchain:** @mysten/sui SDK v2.3.1

## 📁 Structure

```
app/
├── layout.tsx         # Root layout
├── page.tsx           # Landing page (redirect)
├── providers.tsx      # Sui wallet providers
└── app/               # TMA pages (protected)
    ├── layout.tsx     # TMA layout
    ├── page.tsx       # Dashboard
    ├── pay/           # Pay debts
    ├── sign/          # Sign bills
    ├── history/       # Transaction history
    └── settings/      # User settings

components/
├── ui/                # shadcn/ui components
└── ...

lib/
├── api.ts             # Axios API client
└── utils.ts           # Utility functions
```

## 📱 TMA Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/app` | Wallet connect, debt summary |
| Pay | `/app/pay` | List debts, pay with interest |
| Sign | `/app/sign/[billId]` | Sign bill on-chain |
| History | `/app/history` | Payment transaction log |
| Settings | `/app/settings` | Wallet & preferences |

## 🚀 Quick Start

### 1. Install

```bash
bun install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env:
#   NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run

```bash
# Development
bun run dev

# Production build
bun run build
bun run start
```

## 🌐 Deployment (Vercel)

```bash
vercel --prod
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `BACKEND_URL` | Backend API URL (for rewrites) |

### Next.js Config

The `next.config.ts` includes:
- API rewrites to backend (`/api/*` → backend)
- ngrok config for local Telegram testing (dev only)

## 🎨 UI Components

Uses shadcn/ui with custom theming:
- Dark mode by default
- Glassmorphism effects
- Framer Motion animations
- Radix UI primitives

## 💡 Telegram Integration

```typescript
// Access Telegram WebApp API
if (window.Telegram?.WebApp) {
    const webapp = window.Telegram.WebApp;
    webapp.ready();
    
    const user = webapp.initDataUnsafe?.user;
    // { id, username, first_name, ... }
}
```

## 📜 License

MIT
