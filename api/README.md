# LayerSplit API

Express.js backend with Prisma ORM and Telegraf bot for the LayerSplit application.

## 🛠️ Tech Stack

- **Runtime:** Bun / Node.js 18+
- **Framework:** Express 5
- **Database:** PostgreSQL + Prisma 7
- **Bot:** Telegraf 4.16
- **Blockchain:** @mysten/sui SDK v2.3.1

## 📁 Structure

```
src/
├── index.ts          # Server entry point
├── app.ts            # Express app setup
├── config/
│   └── env.ts        # Environment validation (Zod)
├── bot/
│   └── telegram.ts   # Telegram bot commands & handlers
├── routes/
│   ├── users.ts      # User & wallet management
│   ├── bills.ts      # Bill CRUD + signing
│   ├── payments.ts   # Payment processing
│   └── groups.ts     # Group management
├── services/
│   └── sui.ts        # PTB building, interest calculation
├── middleware/
│   └── error.ts      # Error handling
└── db/
    └── client.ts     # Prisma client
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
```env
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
TMA_URL=https://...
PACKAGE_ID=0x...
BILL_REGISTRY_ID=0x...
```

### 3. Setup Database

```bash
bunx prisma db push      # Create tables
bunx prisma generate     # Generate client
```

### 4. Run

```bash
# Development (with hot reload)
bun run dev

# Production
bun run start
```

## 📡 API Endpoints

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:telegramId` | Get user profile |
| POST | `/api/users/link` | Link wallet to Telegram |
| GET | `/api/users/:id/debts` | Get user's debts |
| GET | `/api/users/:id/receivables` | Get debts owed to user |

### Bills
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bills` | Create new bill |
| GET | `/api/bills/:id` | Get bill details |
| GET | `/api/bills/:id/sign` | Get signing transaction |
| POST | `/api/bills/:id/confirm` | Confirm signed bill |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/interest/:debtId` | Calculate current interest |
| POST | `/api/payments/pay` | Get payment transaction |
| POST | `/api/payments/confirm` | Confirm payment |
| GET | `/api/payments/history/:telegramId` | Get payment history |

## 🤖 Bot Commands

| Command | Handler |
|---------|---------|
| `/start` | Welcome, wallet link prompt |
| `/split <amount> <desc>` | Create bill in group |
| `/status` | Show debts & receivables |
| `/pay` | Open TMA to pay |
| `/dashboard` | Open full dashboard |
| `/help` | Show commands |

## 🌐 Deployment (Render)

1. Create Web Service from GitHub
2. **Build Command:** `bun install && bunx prisma generate`
3. **Start Command:** `bun run start`
4. Set environment variables (see `.env.example`)

### Production Mode
- `NODE_ENV=production` enables webhook mode for bot
- Set `API_URL` to your Render service URL

## 📜 License

MIT
