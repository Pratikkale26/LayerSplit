# LayerSplit API

Backend API for LayerSplit Telegram Mini App.

## Tech Stack
- **Runtime**: Bun
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Sui Testnet

## Setup

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection string
   ```

3. **Setup database**
   ```bash
   bun run db:generate  # Generate Prisma client
   bun run db:push      # Push schema to database
   ```

4. **Run development server**
   ```bash
   bun run dev
   ```

## API Endpoints

### Health
- `GET /health` - Server health check

### Users
- `POST /api/users/link` - Link Telegram ID to wallet
- `GET /api/users/:telegramId` - Get user profile
- `GET /api/users/:telegramId/debts` - Get user's debts
- `GET /api/users/:telegramId/receivables` - Get debts owed to user

### Groups
- `POST /api/groups` - Create group
- `GET /api/groups/:groupId` - Get group details
- `POST /api/groups/:groupId/members` - Add member
- `DELETE /api/groups/:groupId/members/:telegramId` - Remove member

### Bills
- `POST /api/bills` - Create bill (returns PTB)
- `GET /api/bills/:billId` - Get bill details
- `GET /api/bills/group/:groupId` - Get bills in group
- `PUT /api/bills/:billId` - Update bill
- `DELETE /api/bills/:billId` - Cancel bill

### Payments
- `POST /api/payments/pay` - Build payment PTB
- `POST /api/payments/pay-all` - Build batch payment PTB
- `POST /api/payments/confirm` - Confirm payment on-chain
- `GET /api/payments/interest/:debtId` - Calculate current interest

## Deployed Contract
- **Package ID**: `0x6787acdc7a371186179af5e036558f5e32506ad5a2dbefa79a359b47cfe48983`
- **Network**: Sui Testnet
