/// ============================================================================
/// LayerSplit - Type Definitions
/// ============================================================================
/// Core data structures for the LayerSplit protocol.
/// 
/// Objects:
/// - Bill: Shared object representing an expense
/// - Debt: Owned object for individual debts
/// - PaymentReceipt: Soul-bound NFT for payment proof
/// - BillRegistry: Global registry for statistics
/// - AdminCap: Admin capability
module contract::types;

// ============================================================================
// IMPORTS
// ============================================================================

use std::option::Option;

// ============================================================================
// CAPABILITIES
// ============================================================================

/// Admin capability for package operations
public struct AdminCap has key, store {
    id: UID,
}

/// Create a new AdminCap
public(package) fun new_admin_cap(ctx: &mut TxContext): AdminCap {
    AdminCap { id: object::new(ctx) }
}

// ============================================================================
// BILL OBJECT
// ============================================================================

/// Represents a single expense/bill that can be split among participants
public struct Bill has key, store {
    id: UID,
    /// Creator of the bill (creditor who paid)
    creator: address,
    /// Title of the expense
    title: vector<u8>,
    /// Description of the expense
    description: vector<u8>,
    /// Total amount in base currency units
    total_amount: u64,
    /// Split type: EQUAL=0, CUSTOM=1, DUTCH=2
    split_type: u8,
    /// Optional IPFS hash of receipt image
    receipt_hash: Option<vector<u8>>,
    /// Timestamp when bill was created (ms)
    created_at: u64,
    /// Grace period end timestamp (ms)
    grace_period_end: u64,
    /// Whether all debts are settled
    is_settled: bool,
    /// Total number of debtors
    debtor_count: u64,
    /// Number of settled debts
    settled_count: u64,
}

// -------------------- Bill Constructors --------------------

/// Create a new Bill object
public(package) fun new_bill(
    creator: address,
    title: vector<u8>,
    description: vector<u8>,
    total_amount: u64,
    split_type: u8,
    receipt_hash: Option<vector<u8>>,
    created_at: u64,
    grace_period_end: u64,
    debtor_count: u64,
    ctx: &mut TxContext
): Bill {
    Bill {
        id: object::new(ctx),
        creator,
        title,
        description,
        total_amount,
        split_type,
        receipt_hash,
        created_at,
        grace_period_end,
        is_settled: false,
        debtor_count,
        settled_count: 0,
    }
}

// -------------------- Bill Getters --------------------

public fun bill_id(bill: &Bill): ID { object::uid_to_inner(&bill.id) }
public fun bill_creator(bill: &Bill): address { bill.creator }
public fun bill_title(bill: &Bill): vector<u8> { bill.title }
public fun bill_description(bill: &Bill): vector<u8> { bill.description }
public fun bill_total_amount(bill: &Bill): u64 { bill.total_amount }
public fun bill_split_type(bill: &Bill): u8 { bill.split_type }
public fun bill_created_at(bill: &Bill): u64 { bill.created_at }
public fun bill_grace_period_end(bill: &Bill): u64 { bill.grace_period_end }
public fun bill_is_settled(bill: &Bill): bool { bill.is_settled }
public fun bill_debtor_count(bill: &Bill): u64 { bill.debtor_count }
public fun bill_settled_count(bill: &Bill): u64 { bill.settled_count }

// -------------------- Bill Setters (Package Only) --------------------

public(package) fun increment_settled_count(bill: &mut Bill) {
    bill.settled_count = bill.settled_count + 1;
}

public(package) fun mark_bill_settled(bill: &mut Bill) {
    bill.is_settled = true;
}

// ============================================================================
// DEBT OBJECT
// ============================================================================

/// Individual debt from one user to another
public struct Debt has key, store {
    id: UID,
    /// Reference to parent bill
    bill_id: ID,
    /// Address of the debtor (who owes money)
    debtor: address,
    /// Address of the creditor (who is owed money)
    creditor: address,
    /// Original principal amount
    principal_amount: u64,
    /// Amount already paid
    amount_paid: u64,
    /// Accrued interest
    accrued_interest: u64,
    /// Last time interest was calculated
    last_interest_calc: u64,
    /// Whether this debt is fully settled
    is_settled: bool,
    /// Itemized items for Dutch split
    due_items: vector<DueItem>,
    /// Timestamp when debt was created
    created_at: u64,
}

// -------------------- Debt Constructors --------------------

/// Create a new Debt object
public(package) fun new_debt(
    bill_id: ID,
    debtor: address,
    creditor: address,
    principal_amount: u64,
    due_items: vector<DueItem>,
    created_at: u64,
    ctx: &mut TxContext
): Debt {
    Debt {
        id: object::new(ctx),
        bill_id,
        debtor,
        creditor,
        principal_amount,
        amount_paid: 0,
        accrued_interest: 0,
        last_interest_calc: created_at,
        is_settled: false,
        due_items,
        created_at,
    }
}

// -------------------- Debt Getters --------------------

public fun debt_id(debt: &Debt): ID { object::uid_to_inner(&debt.id) }
public fun debt_bill_id(debt: &Debt): ID { debt.bill_id }
public fun debt_debtor(debt: &Debt): address { debt.debtor }
public fun debt_creditor(debt: &Debt): address { debt.creditor }
public fun debt_principal_amount(debt: &Debt): u64 { debt.principal_amount }
public fun debt_amount_paid(debt: &Debt): u64 { debt.amount_paid }
public fun debt_accrued_interest(debt: &Debt): u64 { debt.accrued_interest }
public fun debt_last_interest_calc(debt: &Debt): u64 { debt.last_interest_calc }
public fun debt_is_settled(debt: &Debt): bool { debt.is_settled }
public fun debt_due_items(debt: &Debt): &vector<DueItem> { &debt.due_items }
public fun debt_created_at(debt: &Debt): u64 { debt.created_at }

/// Get remaining principal (principal - amount_paid)
public fun debt_remaining_principal(debt: &Debt): u64 {
    if (debt.is_settled) { 0 }
    else { debt.principal_amount - debt.amount_paid }
}

// -------------------- Debt Setters (Package Only) --------------------

public(package) fun add_payment(debt: &mut Debt, principal_paid: u64, interest_paid: u64) {
    debt.amount_paid = debt.amount_paid + principal_paid;
    if (interest_paid <= debt.accrued_interest) {
        debt.accrued_interest = debt.accrued_interest - interest_paid;
    } else {
        debt.accrued_interest = 0;
    };
}

public(package) fun set_accrued_interest(debt: &mut Debt, interest: u64) {
    debt.accrued_interest = interest;
}

public(package) fun set_last_interest_calc(debt: &mut Debt, timestamp: u64) {
    debt.last_interest_calc = timestamp;
}

public(package) fun mark_debt_settled(debt: &mut Debt) {
    debt.is_settled = true;
    debt.accrued_interest = 0;
}

public(package) fun set_principal_amount(debt: &mut Debt, amount: u64) {
    debt.principal_amount = amount;
}

// ============================================================================
// DUE ITEM (for Dutch splits)
// ============================================================================

/// Item for Dutch (itemized) splits
public struct DueItem has store, copy, drop {
    /// Name of the item
    item_name: vector<u8>,
    /// Amount for this item
    amount: u64,
    /// Quantity of this item
    quantity: u64,
}

/// Create a new DueItem
public fun new_due_item(item_name: vector<u8>, amount: u64, quantity: u64): DueItem {
    DueItem { item_name, amount, quantity }
}

public fun due_item_name(item: &DueItem): vector<u8> { item.item_name }
public fun due_item_amount(item: &DueItem): u64 { item.amount }
public fun due_item_quantity(item: &DueItem): u64 { item.quantity }
public fun due_item_total(item: &DueItem): u64 { item.amount * item.quantity }

// ============================================================================
// PAYMENT RECEIPT (Soul-bound NFT)
// ============================================================================

/// Soul-bound payment receipt NFT (non-transferable)
public struct PaymentReceipt has key {
    id: UID,
    /// Reference to the debt this payment was for
    debt_id: ID,
    /// Address of payer
    payer: address,
    /// Amount paid in this transaction
    amount_paid: u64,
    /// Whether this was a partial or full payment
    is_full_payment: bool,
    /// Principal portion of payment
    principal_paid: u64,
    /// Interest portion of payment
    interest_paid: u64,
    /// Timestamp of payment
    timestamp: u64,
}

/// Create a new PaymentReceipt
public(package) fun new_payment_receipt(
    debt_id: ID,
    payer: address,
    amount_paid: u64,
    is_full_payment: bool,
    principal_paid: u64,
    interest_paid: u64,
    timestamp: u64,
    ctx: &mut TxContext
): PaymentReceipt {
    PaymentReceipt {
        id: object::new(ctx),
        debt_id,
        payer,
        amount_paid,
        is_full_payment,
        principal_paid,
        interest_paid,
        timestamp,
    }
}

public fun receipt_debt_id(receipt: &PaymentReceipt): ID { receipt.debt_id }
public fun receipt_payer(receipt: &PaymentReceipt): address { receipt.payer }
public fun receipt_amount_paid(receipt: &PaymentReceipt): u64 { receipt.amount_paid }
public fun receipt_is_full_payment(receipt: &PaymentReceipt): bool { receipt.is_full_payment }
public fun receipt_principal_paid(receipt: &PaymentReceipt): u64 { receipt.principal_paid }
public fun receipt_interest_paid(receipt: &PaymentReceipt): u64 { receipt.interest_paid }
public fun receipt_timestamp(receipt: &PaymentReceipt): u64 { receipt.timestamp }

// ============================================================================
// BILL REGISTRY (Shared Object)
// ============================================================================

/// Registry to track all bills and debts (shared object)
public struct BillRegistry has key {
    id: UID,
    /// Total number of bills created
    total_bills: u64,
    /// Total amount transacted
    total_volume: u64,
}

/// Create a new BillRegistry
public(package) fun new_bill_registry(ctx: &mut TxContext): BillRegistry {
    BillRegistry {
        id: object::new(ctx),
        total_bills: 0,
        total_volume: 0,
    }
}

public fun registry_total_bills(registry: &BillRegistry): u64 { registry.total_bills }
public fun registry_total_volume(registry: &BillRegistry): u64 { registry.total_volume }

public(package) fun increment_registry_stats(registry: &mut BillRegistry, amount: u64) {
    registry.total_bills = registry.total_bills + 1;
    registry.total_volume = registry.total_volume + amount;
}

// ============================================================================
// TRANSFER HELPERS (Package Only)
// ============================================================================

/// Transfer a payment receipt to its payer (soul-bound)
public(package) fun transfer_receipt_to_payer(receipt: PaymentReceipt) {
    let payer = receipt.payer;
    transfer::transfer(receipt, payer);
}

/// Share a bill object
public(package) fun share_bill_object(bill: Bill) {
    transfer::share_object(bill);
}

/// Transfer a debt to its debtor
public(package) fun transfer_debt_to_debtor(debt: Debt) {
    let debtor = debt.debtor;
    transfer::transfer(debt, debtor);
}

/// Transfer AdminCap to an address
public(package) fun transfer_admin_cap(cap: AdminCap, recipient: address) {
    transfer::transfer(cap, recipient);
}

/// Share the BillRegistry as a shared object
public(package) fun share_registry(registry: BillRegistry) {
    transfer::share_object(registry);
}
