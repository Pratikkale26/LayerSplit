/// ============================================================================
/// LayerSplit - Interest Calculation
/// ============================================================================
/// Functions for calculating and updating interest on debts.
/// 
/// Interest Model:
/// - 3-day grace period (no interest)
/// - After grace: 1% per day (365% APR)
/// - Interest accrues on remaining principal only
module contract::interest;

// ============================================================================
// IMPORTS
// ============================================================================

use sui::clock::{Self, Clock};
use contract::types::{Self, Bill, Debt};
use contract::constants;

// ============================================================================
// VIEW FUNCTIONS
// ============================================================================

/// Check if debt is still in grace period
public fun is_in_grace_period(bill: &Bill, clock: &Clock): bool {
    clock::timestamp_ms(clock) <= types::bill_grace_period_end(bill)
}

/// Get remaining time in grace period (returns 0 if grace period ended)
public fun grace_period_remaining(bill: &Bill, clock: &Clock): u64 {
    let now = clock::timestamp_ms(clock);
    let grace_end = types::bill_grace_period_end(bill);
    
    if (now >= grace_end) { 0 }
    else { grace_end - now }
}

/// Calculate current interest for a debt
/// Returns (accrued_interest, total_due)
public fun calculate_interest(
    debt: &Debt,
    bill: &Bill,
    clock: &Clock
): (u64, u64) {
    let now = clock::timestamp_ms(clock);
    let grace_end = types::bill_grace_period_end(bill);
    
    // No interest during grace period
    if (now <= grace_end) {
        let remaining = types::debt_remaining_principal(debt);
        return (0, remaining)
    };
    
    // Calculate days elapsed since grace period ended
    let ms_elapsed = now - grace_end;
    let days_elapsed = ms_elapsed / constants::ms_per_day();
    
    // Calculate interest: principal * days * rate / denominator
    let remaining_principal = types::debt_remaining_principal(debt);
    let interest = (
        remaining_principal * 
        constants::daily_interest_rate_bps() * 
        days_elapsed
    ) / constants::bps_denominator();
    
    let total_interest = types::debt_accrued_interest(debt) + interest;
    let total_due = remaining_principal + total_interest;
    
    (total_interest, total_due)
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/// Update accrued interest on a debt
/// Must be called before payments to persist interest
public fun update_interest(
    debt: &mut Debt,
    bill: &Bill,
    clock: &Clock
) {
    let now = clock::timestamp_ms(clock);
    let grace_end = types::bill_grace_period_end(bill);
    
    // No interest during grace period
    if (now <= grace_end) {
        types::set_last_interest_calc(debt, now);
        return
    };
    
    // Calculate interest since last calc
    let last_calc = types::debt_last_interest_calc(debt);
    let calc_start = if (last_calc > grace_end) { last_calc } else { grace_end };
    
    if (now > calc_start) {
        let ms_elapsed = now - calc_start;
        let days_elapsed = ms_elapsed / constants::ms_per_day();
        
        let remaining_principal = types::debt_remaining_principal(debt);
        let new_interest = (
            remaining_principal * 
            constants::daily_interest_rate_bps() * 
            days_elapsed
        ) / constants::bps_denominator();
        
        let current_interest = types::debt_accrued_interest(debt);
        types::set_accrued_interest(debt, current_interest + new_interest);
    };
    
    types::set_last_interest_calc(debt, now);
}
