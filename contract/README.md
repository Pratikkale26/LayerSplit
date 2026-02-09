# LayerSplit Smart Contract

Sui Move smart contracts for the LayerSplit bill splitting protocol.

## 📦 Package Info

| | |
|---|---|
| **Package ID** | `0x6787acdc7a371186179af5e036558f5e32506ad5a2dbefa79a359b47cfe48983` |
| **Network** | Sui Testnet |
| **Move Edition** | 2024 |
| **Toolchain** | 1.65.0 |

## 📁 Module Structure

```
sources/
├── layersplit.move   # Main entry point, re-exports
├── bill.move         # Bill creation functions
├── payment.move      # Debt payment, interest-first allocation
├── types.move        # Core structs (Bill, Debt, PaymentReceipt)
├── interest.move     # 365% APR calculation, grace period
├── admin.move        # Creator authority management
├── events.move       # Event definitions
├── errors.move       # Error codes
└── constants.move    # Configuration values
```

## ✨ Key Features

### Interest Model
- **Grace Period:** 3 days (no interest)
- **Interest Rate:** 1% per day (365% APR)
- **Payment Order:** Interest paid before principal

### Split Types
1. **Equal Split** - Divide total equally among debtors
2. **Custom Split** - Specify amount per debtor
3. **Dutch Split** - Itemized with assignees

### Payment Receipts
- Soul-bound NFTs proving payment
- Contains: amount, timestamp, bill reference

## 🔧 Build & Deploy

```bash
# Build
sui move build

# Test
sui move test

# Deploy to testnet
sui client publish --gas-budget 100000000
```

## 📚 Key Functions

### Creating Bills

```move
// Equal split among debtors
public fun create_equal_split(
    registry: &mut BillRegistry,
    title: String,
    total_amount: u64,
    debtors: vector<address>,
    ctx: &mut TxContext
): (Bill, vector<Debt>)
```

### Paying Debts

```move
// Full payment with interest
public fun pay_debt_full(
    debt: &mut Debt,
    bill: &mut Bill,
    clock: &Clock,
    payment: Coin<SUI>,
    ctx: &mut TxContext
): PaymentReceipt
```

## 📜 License

MIT
