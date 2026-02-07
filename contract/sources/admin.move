/// ============================================================================
/// LayerSplit - Admin / Creator Authority
/// ============================================================================
/// Functions for bill creators to manage debts.
/// 
/// Creator Powers:
/// - Cancel debt (forgive)
/// - Modify debt amount (reduce only)
module contract::admin;

// ============================================================================
// IMPORTS
// ============================================================================

use sui::clock::{Self, Clock};
use contract::types::{Self, Bill, Debt};
use contract::errors;
use contract::events;

// ============================================================================
// CANCEL DEBT
// ============================================================================

/// Cancel (forgive) a debt
/// Only the bill creator can cancel debts
/// 
/// # Arguments
/// * `debt` - The debt to cancel
/// * `bill` - The parent bill (for creator verification)
/// * `clock` - Sui Clock for timestamp
public fun cancel_debt(
    debt: &mut Debt,
    bill: &mut Bill,
    clock: &Clock,
    ctx: &TxContext
) {
    // Authorization: only bill creator can cancel
    assert!(ctx.sender() == types::bill_creator(bill), errors::not_bill_creator());
    assert!(!types::debt_is_settled(debt), errors::debt_already_settled());
    
    let now = clock::timestamp_ms(clock);
    
    // Calculate forgiven amount
    let remaining_principal = types::debt_remaining_principal(debt);
    let accrued_interest = types::debt_accrued_interest(debt);
    let forgiven_amount = remaining_principal + accrued_interest;
    
    // Mark as settled (forgiven)
    types::mark_debt_settled(debt);
    
    // Update bill
    types::increment_settled_count(bill);
    if (types::bill_settled_count(bill) == types::bill_debtor_count(bill)) {
        types::mark_bill_settled(bill);
    };
    
    events::emit_debt_cancelled(
        types::debt_id(debt),
        types::debt_bill_id(debt),
        types::bill_creator(bill),
        types::debt_debtor(debt),
        forgiven_amount,
        now
    );
}

// ============================================================================
// MODIFY DEBT AMOUNT
// ============================================================================

/// Modify a debt amount (reduce only)
/// Only the bill creator can modify debts
/// 
/// # Rules
/// - Can only reduce amount, not increase
/// - If new amount <= amount_paid, debt is settled
/// 
/// # Arguments
/// * `debt` - The debt to modify
/// * `bill` - The parent bill
/// * `new_amount` - New principal amount (must be less than current)
/// * `clock` - Sui Clock for timestamp
public fun modify_debt_amount(
    debt: &mut Debt,
    bill: &Bill,
    new_amount: u64,
    clock: &Clock,
    ctx: &TxContext
) {
    // Authorization: only bill creator can modify
    assert!(ctx.sender() == types::bill_creator(bill), errors::not_bill_creator());
    assert!(!types::debt_is_settled(debt), errors::debt_already_settled());
    assert!(new_amount > 0, errors::invalid_amount());
    
    let old_amount = types::debt_principal_amount(debt);
    assert!(new_amount <= old_amount, errors::invalid_amount());
    
    let now = clock::timestamp_ms(clock);
    
    // If new amount is less than already paid, settle the debt
    let amount_paid = types::debt_amount_paid(debt);
    if (new_amount <= amount_paid) {
        types::set_principal_amount(debt, amount_paid);
        types::mark_debt_settled(debt);
    } else {
        types::set_principal_amount(debt, new_amount);
    };
    
    events::emit_debt_modified(
        types::debt_id(debt),
        types::debt_bill_id(debt),
        types::bill_creator(bill),
        types::debt_debtor(debt),
        old_amount,
        new_amount,
        now
    );
}
