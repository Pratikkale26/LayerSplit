# LayerSplit 🧾

> **Split bills. Earn interest. No awkward chasing.**

A Telegram Mini App for group expense splitting on Sui blockchain with 365% APR late payment interest.

## 🌟 Features

- **Bill Splitting**: Equal, custom, or Dutch split options
- **Interest on Late Payments**: 1% daily (365% APR) after 3-day grace period  
- **Receipt NFTs**: On-chain proof of payment
- **Telegram Integration**: Native Mini App experience
- **Multi-token Support**: Pay in any Sui token

## 📂 Project Structure

```
layersplit/
├── contract/     # Sui Move smart contracts (deployed)
├── api/          # Express + Prisma + Telegraf backend
└── web-tma/      # Next.js Telegram Mini App
```

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) or Node.js 18+
- PostgreSQL database
- Telegram Bot Token (from @BotFather)

### 1. Setup Environment

```bash
# API
cp api/.env.example api/.env
# Edit api/.env with your DATABASE_URL and TELEGRAM_BOT_TOKEN

# TMA
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > web-tma/.env.local
```

### 2. Install & Run

```bash
# Terminal 1: Database
cd api
bun install
bunx prisma db push    # Create tables
bun run dev            # Starts on :3000

# Terminal 2: TMA
cd web-tma
bun install
bun run dev            # Starts on :3001
```

### 3. Test in Telegram

1. Open your bot in Telegram
2. Send `/start` to connect
3. Use `/split 10 Lunch` to create a bill
4. Click "Open App" buttons to launch Mini App

## 🔗 Smart Contract

**Package ID**: `0x6787acdc7a371186179af5e036558f5e32506ad5a2dbefa79a359b47cfe48983`

**Network**: Sui Testnet

[View on Suiscan →](https://suiscan.xyz/testnet/object/0x6787acdc7a371186179af5e036558f5e32506ad5a2dbefa79a359b47cfe48983)

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome & wallet link |
| `/split <amount> <desc>` | Create bill in group |
| `/status` | View your debts |
| `/pay` | Open app to pay |
| `/help` | Show commands |

## 📱 TMA Pages

- **Dashboard**: Wallet connect, debt summary
- **Create Bill**: 3-step wizard
- **Pay Debts**: List with interest calculation
- **History**: Transaction log
- **Settings**: Wallet & preferences

## 🏗️ Tech Stack

- **Smart Contract**: Sui Move
- **Backend**: Express 5, Prisma 6, Telegraf
- **Frontend**: Next.js 16, React 19, Tailwind 4
- **Wallet**: @mysten/dapp-kit

## 📄 License

MIT
