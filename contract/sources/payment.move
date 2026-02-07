/// ============================================================================
/// LayerSplit - Payment Processing
/// ============================================================================
/// Functions for processing debt payments with interest calculation.
/// 
/// Payment Rules:
/// - Interest is paid first, then principal
/// - Partial payments are supported
/// - Soul-bound receipt NFT is created for each payment
module contract::payment;

// ============================================================================
// IMPORTS
// ============================================================================

use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use contract::types::{Self, Bill, Debt, PaymentReceipt};
use contract::interest;
use contract::errors;
use contract::events;

// ============================================================================
// FULL PAYMENT
// ============================================================================

/// Pay a debt in full
/// 
/// # Requirements
/// - Caller must be the debtor
/// - Debt must not be already settled
/// - Payment must cover principal + accrued interest
/// 
/// # Arguments
/// * `debt` - The debt to pay
/// * `bill` - The parent bill
/// * `clock` - Sui Clock for interest calculation
/// * `payment` - Coin to pay with
/// 
/// # Returns
/// * `PaymentReceipt` - Soul-bound receipt NFT
public fun pay_full(
    debt: &mut Debt,
    bill: &mut Bill,
    clock: &Clock,
    payment: Coin<SUI>,
    ctx: &mut TxContext
): PaymentReceipt {
    // Validations
    assert!(!types::debt_is_settled(debt), errors::debt_already_settled());
    assert!(ctx.sender() == types::debt_debtor(debt), errors::not_debtor());
    
    let now = clock::timestamp_ms(clock);
    
    // Update interest before payment
    interest::update_interest(debt, bill, clock);
    
    // Calculate amounts
    let remaining_principal = types::debt_remaining_principal(debt);
    let accrued_interest = types::debt_accrued_interest(debt);
    let total_due = remaining_principal + accrued_interest;
    let payment_amount = coin::value(&payment);
    
    assert!(payment_amount >= total_due, errors::insufficient_payment());
    
    // Payment allocation
    let interest_paid = accrued_interest;
    let principal_paid = remaining_principal;
    
    // Update debt state
    types::add_payment(debt, principal_paid, interest_paid);
    types::mark_debt_settled(debt);
    
    // Update bill
    types::increment_settled_count(bill);
    if (types::bill_settled_count(bill) == types::bill_debtor_count(bill)) {
        types::mark_bill_settled(bill);
        
        events::emit_bill_settled(
            types::bill_id(bill),
            types::bill_creator(bill),
            types::bill_total_amount(bill),
            now
        );
    };
    
    // Transfer payment to creditor
    transfer::public_transfer(payment, types::debt_creditor(debt));
    
    // Emit events
    events::emit_payment_made(
        types::debt_id(debt),
        types::debt_debtor(debt),
        payment_amount,
        principal_paid,
        interest_paid,
        0, // remaining principal
        0, // remaining interest
        true, // is_settled
        now
    );
    
    events::emit_debt_settled(
        types::debt_id(debt),
        types::debt_bill_id(debt),
        types::debt_debtor(debt),
        types::debt_creditor(debt),
        payment_amount,
        interest_paid,
        now
    );
    
    // Create soul-bound receipt
    types::new_payment_receipt(
        types::debt_id(debt),
        types::debt_debtor(debt),
        payment_amount,
        true, // is_full_payment
        principal_paid,
        interest_paid,
        now,
        ctx
    )
}

// ============================================================================
// PARTIAL PAYMENT
// ============================================================================

/// Make a partial payment on a debt
/// Payment goes to interest first, then principal
/// 
/// # Arguments
/// * `debt` - The debt to pay
/// * `bill` - The parent bill
/// * `clock` - Sui Clock
/// * `payment` - Coin to pay with (any amount > 0)
/// 
/// # Returns
/// * `PaymentReceipt` - Soul-bound receipt NFT
public fun pay_partial(
    debt: &mut Debt,
    bill: &mut Bill,
    clock: &Clock,
    payment: Coin<SUI>,
    ctx: &mut TxContext
): PaymentReceipt {
    // Validations
    assert!(!types::debt_is_settled(debt), errors::debt_already_settled());
    assert!(ctx.sender() == types::debt_debtor(debt), errors::not_debtor());
    
    let now = clock::timestamp_ms(clock);
    let payment_amount = coin::value(&payment);
    
    assert!(payment_amount > 0, errors::invalid_amount());
    
    // Update interest before payment
    interest::update_interest(debt, bill, clock);
    
    let remaining_principal = types::debt_remaining_principal(debt);
    let accrued_interest = types::debt_accrued_interest(debt);
    
    // Allocate payment: interest first, then principal
    let (interest_paid, principal_paid, is_settled) = allocate_payment(
        payment_amount,
        remaining_principal,
        accrued_interest
    );
    
    // Update debt
    types::add_payment(debt, principal_paid, interest_paid);
    
    if (is_settled) {
        types::mark_debt_settled(debt);
        
        // Update bill
        types::increment_settled_count(bill);
        if (types::bill_settled_count(bill) == types::bill_debtor_count(bill)) {
            types::mark_bill_settled(bill);
            
            events::emit_bill_settled(
                types::bill_id(bill),
                types::bill_creator(bill),
                types::bill_total_amount(bill),
                now
            );
        };
    };
    
    // Transfer payment to creditor
    transfer::public_transfer(payment, types::debt_creditor(debt));
    
    let new_remaining_principal = types::debt_remaining_principal(debt);
    let new_remaining_interest = types::debt_accrued_interest(debt);
    
    // Emit payment event
    events::emit_payment_made(
        types::debt_id(debt),
        types::debt_debtor(debt),
        payment_amount,
        principal_paid,
        interest_paid,
        new_remaining_principal,
        new_remaining_interest,
        is_settled,
        now
    );
    
    if (is_settled) {
        events::emit_debt_settled(
            types::debt_id(debt),
            types::debt_bill_id(debt),
            types::debt_debtor(debt),
            types::debt_creditor(debt),
            types::debt_amount_paid(debt),
            interest_paid,
            now
        );
    };
    
    // Create soul-bound receipt
    types::new_payment_receipt(
        types::debt_id(debt),
        types::debt_debtor(debt),
        payment_amount,
        is_settled,
        principal_paid,
        interest_paid,
        now,
        ctx
    )
}

// ============================================================================
// RECEIPT TRANSFER
// ============================================================================

/// Transfer payment receipt to payer
/// Receipts are soul-bound (non-transferable by design)
public fun transfer_receipt(receipt: PaymentReceipt) {
    types::transfer_receipt_to_payer(receipt);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/// Allocate payment to interest first, then principal
/// Returns (interest_paid, principal_paid, is_settled)
fun allocate_payment(
    payment_amount: u64,
    remaining_principal: u64,
    accrued_interest: u64
): (u64, u64, bool) {
    let mut remaining = payment_amount;
    let mut interest_paid = 0u64;
    let mut principal_paid = 0u64;
    
    // Pay interest first
    if (remaining > 0 && accrued_interest > 0) {
        if (remaining >= accrued_interest) {
            interest_paid = accrued_interest;
            remaining = remaining - accrued_interest;
        } else {
            interest_paid = remaining;
            remaining = 0;
        };
    };
    
    // Pay principal with remaining
    if (remaining > 0) {
        if (remaining >= remaining_principal) {
            principal_paid = remaining_principal;
        } else {
            principal_paid = remaining;
        };
    };
    
    let is_settled = principal_paid >= remaining_principal;
    
    (interest_paid, principal_paid, is_settled)
}
