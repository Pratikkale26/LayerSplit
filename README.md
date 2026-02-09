# 🧾 LayerSplit

> **Split bills. Earn interest. No awkward chasing.**

[![Sui](https://img.shields.io/badge/Built%20on-Sui-4CA2FF?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzRDQTJGRiIvPjwvc3ZnPg==)](https://sui.io)
[![Move 2024](https://img.shields.io/badge/Move-2024%20Edition-00D4AA?style=flat-square)](https://move-language.github.io/move/)
[![Telegram Mini App](https://img.shields.io/badge/Telegram-Mini%20App-26A5E4?style=flat-square&logo=telegram)](https://core.telegram.org/bots/webapps)

A **Telegram Mini App** for group expense splitting on the Sui blockchain with **365% APR** late payment interest incentive.

---

## � Live Demo

| Component | Link |
|-----------|------|
| 🤖 **Telegram Bot** | [@LayerSplitBot](https://t.me/LayerSplitBot) |
| 🌍 **Web App** | [layersplit.vercel.app](https://layersplit.vercel.app) |
| 📦 **Smart Contract** | [View on Suiscan](https://suiscan.xyz/testnet/object/0x6787acdc7a371186179af5e036558f5e32506ad5a2dbefa79a359b47cfe48983) |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💰 **Bill Splitting** | Equal, custom amounts, or Dutch (itemized) splits |
| 📈 **Interest Incentive** | 1% daily (365% APR) after 3-day grace period |
| 🎫 **Receipt NFTs** | Soul-bound on-chain proof of payment |
| 📱 **Telegram Native** | Seamless Mini App experience |
| 👛 **Wallet Connect** | Slush Wallet integration via @mysten/dapp-kit |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM MINI APP                        │
│                  (Next.js 16 + React 19)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND API                             │
│              (Express 5 + Prisma + Telegraf)                │
│                                                             │
│  • Bill Management    • User Wallets    • Telegram Bot      │
│  • Interest Calc      • PTB Building    • Notifications     │
└─────────────────────────┬───────────────────────────────────┘
                          │ Sui SDK
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUI BLOCKCHAIN                            │
│                  (Move 2024 Edition)                        │
│                                                             │
│  • Bill Objects       • Debt Objects    • Payment Receipts  │
│  • Interest Logic     • Bill Registry   • Access Control    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
layersplit/
├── contract/          # Sui Move smart contracts
│   ├── sources/       # Move modules (bill, payment, types, etc.)
│   ├── Move.toml      # Package config (edition = "2024")
│   └── Published.toml # Deployment info
│
├── api/               # Node.js backend
│   ├── src/
│   │   ├── bot/       # Telegram bot commands
│   │   ├── routes/    # REST API endpoints
│   │   ├── services/  # Sui integration, PTB building
│   │   └── config/    # Environment validation
│   └── prisma/        # Database schema
│
├── web-tma/           # Telegram Mini App
│   ├── app/           # Next.js App Router
│   │   └── app/       # TMA pages (dashboard, pay, sign, etc.)
│   ├── components/    # React components
│   └── lib/           # API client, utilities
│
├── README.md          # This file
└── AI_DISCLOSURE.md   # AI tool usage disclosure
```

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (or Node.js 18+)
- PostgreSQL 15+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- [ngrok](https://ngrok.com) (for local Telegram testing)

### 1. Clone & Install

```bash
git clone https://github.com/Pratikkale26/LayerSplit.git
cd LayerSplit

# Install all dependencies
cd api && bun install && cd ..
cd web-tma && bun install && cd ..
```

### 2. Configure Environment

```bash
# API Configuration
cp api/.env.example api/.env
# Edit api/.env:
#   DATABASE_URL=postgresql://...
#   TELEGRAM_BOT_TOKEN=...
#   TMA_URL=https://your-ngrok-url.ngrok-free.dev

# Frontend Configuration  
cp web-tma/.env.example web-tma/.env
#   NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Setup Database

```bash
cd api
bunx prisma db push    # Create tables
bunx prisma generate   # Generate client
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend API (port 3001)
cd api
bun run dev

# Terminal 2: Frontend TMA (port 3000)
cd web-tma
bun run dev

# Terminal 3: ngrok tunnel (for Telegram)
ngrok http 3000
```

### 5. Test in Telegram

1. Open [@LayerSplitBot](https://t.me/LayerSplitBot) in Telegram
2. Send `/start` to connect your wallet
3. Add bot to a group, use `/split 10 Dinner` to create a bill
4. Members get notified and can sign/pay via the Mini App

---

## � Smart Contract

**Package ID:** `0x6787acdc7a371186179af5e036558f5e32506ad5a2dbefa79a359b47cfe48983`

**Network:** Sui Testnet

### Modules

| Module | Description |
|--------|-------------|
| `layersplit` | Main entry point, re-exports |
| `bill` | Bill creation (equal, custom, Dutch splits) |
| `payment` | Debt payment with interest calculation |
| `types` | Core structs (Bill, Debt, PaymentReceipt) |
| `interest` | 365% APR with 3-day grace period |
| `admin` | Creator authority for bill management |

### Key Functions

```move
// Create equal split bill
bill::create_equal_split(registry, total_amount, debtors, ctx)

// Pay debt in full (includes interest)
layersplit::pay_debt_full(debt, bill, clock, coin, ctx)

// Partial payment (interest-first allocation)  
payment::pay_partial(debt, bill, clock, coin, amount, ctx)
```

---

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome & wallet linking |
| `/split <amount> <description>` | Create bill in group chat |
| `/status` | View your debts & receivables |
| `/pay` | Open Mini App to pay debts |
| `/dashboard` | Open full dashboard |
| `/help` | Show all commands |

---

## �️ Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Smart Contract** | Sui Move | 2024 Edition |
| **Blockchain SDK** | @mysten/sui | ^2.3.1 |
| **Wallet Kit** | @mysten/dapp-kit | ^1.0.1 |
| **Backend** | Express + Prisma | 5.x + 7.x |
| **Bot Framework** | Telegraf | ^4.16 |
| **Frontend** | Next.js + React | 16.x + 19.x |
| **Styling** | Tailwind CSS | 4.x |

---

## 🌐 Deployment

### Frontend (Vercel)

```bash
cd web-tma
vercel --prod
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `BACKEND_URL` - Backend API URL (for rewrites)

### Backend (Render)

1. Create Web Service from GitHub
2. **Build Command:** `bun install && bunx prisma generate`
3. **Start Command:** `bun run start`

**Environment Variables:**
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string
- `TMA_URL` - Frontend Vercel URL
- `API_URL` - This service's URL (for webhook)
- `TELEGRAM_BOT_TOKEN`
- `PACKAGE_ID`, `BILL_REGISTRY_ID`, `SUI_NETWORK`

---

## 🤝 AI Tool Disclosure

See [AI_DISCLOSURE.md](./AI_DISCLOSURE.md) for full transparency on AI-assisted development.

**Summary:** Built with Claude 4.5 Sonnet via Cursor IDE. Core architecture and business logic designed independently; AI assisted with code completion, UI components, and documentation.

---

## 👨‍💻 Developer

**Pratik Kale** - [@pratikkale26](https://x.com/pratikkale26)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <strong>Built for Vibe Sui Spring Fest 2026 🏆</strong>
</p>
