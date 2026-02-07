/// ============================================================================
/// LayerSplit - Main Entry Point
/// ============================================================================
/// 
/// LayerSplit is a bill splitting protocol for Telegram Mini Apps on Sui.
/// 
/// Key Features:
/// - Split bills equally, with custom amounts, or Dutch (itemized)
/// - 365% APR interest after 3-day grace period
/// - Soul-bound payment receipt NFTs
/// - Bill creator can cancel/modify debts
/// 
/// ## Module Structure
/// 
/// ```
/// layersplit (this module)
/// ├── constants     - Configuration values
/// ├── errors        - Error codes  
/// ├── types         - Core data structures
/// ├── events        - Event definitions
/// ├── interest      - Interest calculation
/// ├── bill          - Bill creation
/// ├── payment       - Payment processing
/// └── admin         - Creator authority
/// ```
/// 
/// ## Quick Start
/// 
/// 1. Create bill: `bill::create_equal_split()`
/// 2. Share bill: `bill::share_bill(bill)`
/// 3. Transfer debts: `bill::transfer_debts(debts)`
/// 4. Pay debt: `payment::pay_full()` or `payment::pay_partial()`
/// 5. Transfer receipt: `payment::transfer_receipt(receipt)`
module contract::layersplit;

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export commonly used types
use contract::types::{
    AdminCap,
    Bill,
    Debt,
    DueItem,
    PaymentReceipt,
    BillRegistry,
};

// Re-export modules for external access
use contract::constants;
use contract::bill;
use contract::payment;
use contract::admin;
use contract::interest;

// ============================================================================
// INITIALIZATION
// ============================================================================

/// Initialize the LayerSplit protocol
/// Creates AdminCap and BillRegistry
fun init(ctx: &mut TxContext) {
    // Create and transfer AdminCap to deployer
    let admin_cap = contract::types::new_admin_cap(ctx);
    contract::types::transfer_admin_cap(admin_cap, ctx.sender());
    
    // Create shared BillRegistry
    let registry = contract::types::new_bill_registry(ctx);
    contract::types::share_registry(registry);
}

// ============================================================================
// CONVENIENCE WRAPPERS (Optional - for simpler API)
// ============================================================================

/// Create an equal split bill (convenience wrapper)
public fun create_bill_equal_split(
    registry: &mut BillRegistry,
    clock: &sui::clock::Clock,
    title: vector<u8>,
    description: vector<u8>,
    total_amount: u64,
    debtors: vector<address>,
    receipt_hash: option::Option<vector<u8>>,
    ctx: &mut TxContext
): (Bill, vector<Debt>) {
    bill::create_equal_split(
        registry, clock, title, description, 
        total_amount, debtors, receipt_hash, ctx
    )
}

/// Create a custom split bill (convenience wrapper)
public fun create_bill_custom_split(
    registry: &mut BillRegistry,
    clock: &sui::clock::Clock,
    title: vector<u8>,
    description: vector<u8>,
    total_amount: u64,
    debtors: vector<address>,
    amounts: vector<u64>,
    receipt_hash: option::Option<vector<u8>>,
    ctx: &mut TxContext
): (Bill, vector<Debt>) {
    bill::create_custom_split(
        registry, clock, title, description,
        total_amount, debtors, amounts, receipt_hash, ctx
    )
}

/// Pay debt in full (convenience wrapper)
public fun pay_debt_full(
    debt: &mut Debt,
    bill: &mut Bill,
    clock: &sui::clock::Clock,
    payment_coin: sui::coin::Coin<sui::sui::SUI>,
    ctx: &mut TxContext
): PaymentReceipt {
    payment::pay_full(debt, bill, clock, payment_coin, ctx)
}

/// Pay debt partially (convenience wrapper)
public fun pay_debt_partial(
    debt: &mut Debt,
    bill: &mut Bill,
    clock: &sui::clock::Clock,
    payment_coin: sui::coin::Coin<sui::sui::SUI>,
    ctx: &mut TxContext
): PaymentReceipt {
    payment::pay_partial(debt, bill, clock, payment_coin, ctx)
}

/// Cancel a debt (convenience wrapper)
public fun cancel_debt(
    debt: &mut Debt,
    bill: &mut Bill,
    clock: &sui::clock::Clock,
    ctx: &TxContext
) {
    admin::cancel_debt(debt, bill, clock, ctx)
}

/// Modify debt amount (convenience wrapper)
public fun modify_debt_amount(
    debt: &mut Debt,
    bill: &Bill,
    new_amount: u64,
    clock: &sui::clock::Clock,
    ctx: &TxContext
) {
    admin::modify_debt_amount(debt, bill, new_amount, clock, ctx)
}

/// Calculate interest on a debt (convenience wrapper)
public fun calculate_interest(
    debt: &Debt,
    bill: &Bill,
    clock: &sui::clock::Clock
): (u64, u64) {
    interest::calculate_interest(debt, bill, clock)
}

/// Check if in grace period (convenience wrapper)
public fun is_in_grace_period(bill: &Bill, clock: &sui::clock::Clock): bool {
    interest::is_in_grace_period(bill, clock)
}

/// Get grace period remaining (convenience wrapper)
public fun grace_period_remaining(bill: &Bill, clock: &sui::clock::Clock): u64 {
    interest::grace_period_remaining(bill, clock)
}

// ============================================================================
// TRANSFER HELPERS
// ============================================================================

/// Share a bill object
public fun share_bill(bill_obj: Bill) {
    bill::share_bill(bill_obj)
}

/// Transfer a debt to its debtor
public fun transfer_debt(debt_obj: Debt) {
    bill::transfer_debt(debt_obj)
}

/// Transfer multiple debts to their debtors
public fun transfer_debts(debts: vector<Debt>) {
    bill::transfer_debts(debts)
}

/// Transfer receipt to payer
public fun transfer_receipt(receipt: PaymentReceipt) {
    payment::transfer_receipt(receipt)
}

// ============================================================================
// VIEW FUNCTIONS
// ============================================================================

/// Get bill info
public fun bill_info(bill_obj: &Bill): (address, vector<u8>, u64, u8, u64, u64, bool) {
    (
        contract::types::bill_creator(bill_obj),
        contract::types::bill_title(bill_obj),
        contract::types::bill_total_amount(bill_obj),
        contract::types::bill_split_type(bill_obj),
        contract::types::bill_created_at(bill_obj),
        contract::types::bill_grace_period_end(bill_obj),
        contract::types::bill_is_settled(bill_obj)
    )
}

/// Get debt info
public fun debt_info(debt_obj: &Debt): (ID, address, address, u64, u64, u64, bool) {
    (
        contract::types::debt_bill_id(debt_obj),
        contract::types::debt_debtor(debt_obj),
        contract::types::debt_creditor(debt_obj),
        contract::types::debt_principal_amount(debt_obj),
        contract::types::debt_amount_paid(debt_obj),
        contract::types::debt_accrued_interest(debt_obj),
        contract::types::debt_is_settled(debt_obj)
    )
}

/// Get remaining principal
public fun remaining_principal(debt_obj: &Debt): u64 {
    contract::types::debt_remaining_principal(debt_obj)
}

/// Check if debt is settled
public fun is_debt_settled(debt_obj: &Debt): bool {
    contract::types::debt_is_settled(debt_obj)
}

/// Check if bill is settled
public fun is_bill_settled(bill_obj: &Bill): bool {
    contract::types::bill_is_settled(bill_obj)
}

/// Get bill creator
public fun bill_creator(bill_obj: &Bill): address {
    contract::types::bill_creator(bill_obj)
}

/// Get debt creditor
public fun debt_creditor(debt_obj: &Debt): address {
    contract::types::debt_creditor(debt_obj)
}

/// Get debt debtor
public fun debt_debtor(debt_obj: &Debt): address {
    contract::types::debt_debtor(debt_obj)
}

/// Get registry stats
public fun registry_stats(registry: &BillRegistry): (u64, u64) {
    (
        contract::types::registry_total_bills(registry),
        contract::types::registry_total_volume(registry)
    )
}

// ============================================================================
// TEST HELPERS
// ============================================================================

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

#[test_only]
public fun get_grace_period_ms(): u64 {
    constants::grace_period_ms()
}

#[test_only]
public fun get_daily_interest_rate_bps(): u64 {
    constants::daily_interest_rate_bps()
}

#[test_only]
public fun get_max_participants(): u64 {
    constants::max_participants()
}
