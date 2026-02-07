/// ============================================================================
/// LayerSplit - Test Suite
/// ============================================================================
/// 
/// Organized test categories:
/// 1. Initialization Tests
/// 2. Bill Creation Tests
/// 3. Interest Calculation Tests
/// 4. Payment Tests
/// 5. Creator Authority Tests
/// 6. Access Control Tests
/// 7. Edge Cases
#[test_only]
module contract::layersplit_tests;

// ============================================================================
// IMPORTS
// ============================================================================

use sui::test_scenario::{Self as ts, Scenario};
use sui::clock::{Self, Clock};
use sui::coin;
use sui::sui::SUI;

use contract::layersplit::{Self};
use contract::types::{Bill, Debt, BillRegistry, AdminCap};
use contract::constants;
use contract::errors;

// ============================================================================
// TEST CONSTANTS
// ============================================================================

const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;
const CHARLIE: address = @0xC4A1;

const MS_PER_DAY: u64 = 86_400_000;
const GRACE_PERIOD_MS: u64 = 259_200_000;
const AMOUNT_100: u64 = 100_000_000;
const AMOUNT_50: u64 = 50_000_000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Initialize test scenario
fun setup(): Scenario {
    let mut scenario = ts::begin(ALICE);
    layersplit::init_for_testing(ts::ctx(&mut scenario));
    scenario
}

/// Create clock at specific time
fun create_clock(scenario: &mut Scenario, timestamp_ms: u64): Clock {
    ts::next_tx(scenario, ALICE);
    let mut clock = clock::create_for_testing(ts::ctx(scenario));
    clock::set_for_testing(&mut clock, timestamp_ms);
    clock
}

/// Advance clock
fun advance_clock(clock: &mut Clock, ms: u64) {
    let current = clock::timestamp_ms(clock);
    clock::set_for_testing(clock, current + ms);
}

// ############################################################################
//                           1. INITIALIZATION TESTS
// ############################################################################

#[test]
fun test_init_creates_admin_cap() {
    let mut scenario = setup();
    ts::next_tx(&mut scenario, ALICE);
    assert!(ts::has_most_recent_for_address<AdminCap>(ALICE), 0);
    ts::end(scenario);
}

#[test]
fun test_init_creates_registry() {
    let mut scenario = setup();
    ts::next_tx(&mut scenario, ALICE);
    {
        let registry = ts::take_shared<BillRegistry>(&scenario);
        let (bills, volume) = layersplit::registry_stats(&registry);
        assert!(bills == 0 && volume == 0, 0);
        ts::return_shared(registry);
    };
    ts::end(scenario);
}

// ############################################################################
//                           2. BILL CREATION TESTS
// ############################################################################

#[test]
fun test_create_equal_split_bill() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry,
            &clock,
            b"Dinner",
            b"Pizza",
            AMOUNT_100,
            vector[BOB, CHARLIE],
            option::none(),
            ts::ctx(&mut scenario)
        );
        
        // Verify bill
        let (creator, _, total, split_type, _, _, is_settled) = layersplit::bill_info(&bill);
        assert!(creator == ALICE, 0);
        assert!(total == AMOUNT_100, 1);
        assert!(split_type == 0, 2); // EQUAL
        assert!(!is_settled, 3);
        assert!(debts.length() == 2, 4);
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
fun test_create_custom_split_bill() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_custom_split(
            &mut registry,
            &clock,
            b"Custom",
            b"Desc",
            AMOUNT_100,
            vector[BOB, CHARLIE],
            vector[70_000_000, 30_000_000],
            option::none(),
            ts::ctx(&mut scenario)
        );
        
        let (_, _, _, split_type, _, _, _) = layersplit::bill_info(&bill);
        assert!(split_type == 1, 0); // CUSTOM
        assert!(debts.length() == 2, 1);
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
fun test_creator_excluded_from_split() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        // Include Alice (creator) - should be excluded
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry,
            &clock,
            b"Test",
            b"Desc",
            AMOUNT_100,
            vector[ALICE, BOB, CHARLIE],
            option::none(),
            ts::ctx(&mut scenario)
        );
        
        // Only 2 debts (Alice excluded)
        assert!(debts.length() == 2, 0);
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ############################################################################
//                        3. INTEREST CALCULATION TESTS
// ############################################################################

#[test]
fun test_no_interest_during_grace_period() {
    let mut scenario = setup();
    let mut clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        
        // Still in grace period (advance 2 days)
        advance_clock(&mut clock, 2 * MS_PER_DAY);
        
        let debt = debts.borrow(0);
        let (interest, total_due) = layersplit::calculate_interest(debt, &bill, &clock);
        
        assert!(interest == 0, 0);
        assert!(total_due == AMOUNT_100, 1);
        assert!(layersplit::is_in_grace_period(&bill, &clock), 2);
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
fun test_interest_after_grace_period() {
    let mut scenario = setup();
    let mut clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        
        // Advance past grace + 1 day
        advance_clock(&mut clock, GRACE_PERIOD_MS + MS_PER_DAY);
        
        let debt = debts.borrow(0);
        let (interest, _) = layersplit::calculate_interest(debt, &bill, &clock);
        
        // 1% of 100,000,000 = 1,000,000
        assert!(interest == 1_000_000, 0);
        assert!(!layersplit::is_in_grace_period(&bill, &clock), 1);
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
fun test_interest_accumulates_daily() {
    let mut scenario = setup();
    let mut clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        
        // Advance past grace + 5 days
        advance_clock(&mut clock, GRACE_PERIOD_MS + 5 * MS_PER_DAY);
        
        let debt = debts.borrow(0);
        let (interest, _) = layersplit::calculate_interest(debt, &bill, &clock);
        
        // 5% of 100,000,000 = 5,000,000
        assert!(interest == 5_000_000, 0);
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ############################################################################
//                             4. PAYMENT TESTS
// ############################################################################

#[test]
fun test_pay_debt_full_in_grace_period() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    // Create bill
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    // Bob pays
    ts::next_tx(&mut scenario, BOB);
    {
        let mut bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        let payment = coin::mint_for_testing<SUI>(AMOUNT_100, ts::ctx(&mut scenario));
        
        let receipt = layersplit::pay_debt_full(&mut debt, &mut bill, &clock, payment, ts::ctx(&mut scenario));
        
        assert!(layersplit::is_debt_settled(&debt), 0);
        assert!(layersplit::is_bill_settled(&bill), 1);
        
        layersplit::transfer_receipt(receipt);
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
fun test_pay_debt_partial_interest_first() {
    let mut scenario = setup();
    let mut clock = create_clock(&mut scenario, 1000000);
    
    // Create bill
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    // Advance past grace + 2 days (2% interest = 2,000,000)
    advance_clock(&mut clock, GRACE_PERIOD_MS + 2 * MS_PER_DAY);
    
    // Bob pays partial (less than interest)
    ts::next_tx(&mut scenario, BOB);
    {
        let mut bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        let payment = coin::mint_for_testing<SUI>(1_500_000, ts::ctx(&mut scenario));
        
        let receipt = layersplit::pay_debt_partial(&mut debt, &mut bill, &clock, payment, ts::ctx(&mut scenario));
        
        // Not settled, principal unchanged
        assert!(!layersplit::is_debt_settled(&debt), 0);
        assert!(layersplit::remaining_principal(&debt) == AMOUNT_100, 1);
        
        layersplit::transfer_receipt(receipt);
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ############################################################################
//                        5. CREATOR AUTHORITY TESTS
// ############################################################################

#[test]
fun test_creator_can_cancel_debt() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    // Create bill
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    // Alice cancels
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        
        layersplit::cancel_debt(&mut debt, &mut bill, &clock, ts::ctx(&mut scenario));
        
        assert!(layersplit::is_debt_settled(&debt), 0);
        
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
fun test_creator_can_modify_debt() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    // Create bill
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    // Alice modifies
    ts::next_tx(&mut scenario, ALICE);
    {
        let bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        
        layersplit::modify_debt_amount(&mut debt, &bill, AMOUNT_50, &clock, ts::ctx(&mut scenario));
        
        assert!(layersplit::remaining_principal(&debt) == AMOUNT_50, 0);
        
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ############################################################################
//                         6. ACCESS CONTROL TESTS
// ############################################################################

#[test]
#[expected_failure(abort_code = 2)]
fun test_non_creator_cannot_cancel() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    // Create bill
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    // Charlie tries to cancel - should fail
    ts::next_tx(&mut scenario, CHARLIE);
    {
        let mut bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        
        layersplit::cancel_debt(&mut debt, &mut bill, &clock, ts::ctx(&mut scenario));
        
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 3)]
fun test_wrong_debtor_cannot_pay() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    // Create bill
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    // Charlie tries to pay Bob's debt - should fail
    ts::next_tx(&mut scenario, CHARLIE);
    {
        let mut bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        let payment = coin::mint_for_testing<SUI>(AMOUNT_100, ts::ctx(&mut scenario));
        
        let receipt = layersplit::pay_debt_full(&mut debt, &mut bill, &clock, payment, ts::ctx(&mut scenario));
        
        layersplit::transfer_receipt(receipt);
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ############################################################################
//                             7. EDGE CASES
// ############################################################################

#[test]
#[expected_failure(abort_code = 102)]
fun test_max_participants_exceeded() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        
        // Create 21 debtors
        let mut debtors = vector::empty<address>();
        let mut i = 0u64;
        while (i < 21) {
            debtors.push_back(@0x1);
            i = i + 1;
        };
        
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            debtors, option::none(), ts::ctx(&mut scenario)
        );
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 100)]
fun test_zero_amount_fails() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", 0,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 200)]
fun test_cannot_pay_settled_debt() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    // Create bill
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    // Bob pays first time
    ts::next_tx(&mut scenario, BOB);
    {
        let mut bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        let payment = coin::mint_for_testing<SUI>(AMOUNT_100, ts::ctx(&mut scenario));
        let receipt = layersplit::pay_debt_full(&mut debt, &mut bill, &clock, payment, ts::ctx(&mut scenario));
        layersplit::transfer_receipt(receipt);
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    // Bob tries again - should fail
    ts::next_tx(&mut scenario, BOB);
    {
        let mut bill = ts::take_shared<Bill>(&scenario);
        let mut debt = ts::take_from_address<Debt>(&scenario, BOB);
        let payment = coin::mint_for_testing<SUI>(AMOUNT_100, ts::ctx(&mut scenario));
        let receipt = layersplit::pay_debt_full(&mut debt, &mut bill, &clock, payment, ts::ctx(&mut scenario));
        layersplit::transfer_receipt(receipt);
        ts::return_shared(bill);
        ts::return_to_address(BOB, debt);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 101)]
fun test_custom_split_invalid_amounts() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 1000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        
        // Amounts don't sum to total
        let (bill, debts) = layersplit::create_bill_custom_split(
            &mut registry, &clock, b"Test", b"", AMOUNT_100,
            vector[BOB, CHARLIE],
            vector[50_000_000, 30_000_000], // 80 != 100
            option::none(),
            ts::ctx(&mut scenario)
        );
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ############################################################################
//                              8. VIEW FUNCTIONS
// ############################################################################

#[test]
fun test_view_functions() {
    let mut scenario = setup();
    let clock = create_clock(&mut scenario, 5000000);
    
    ts::next_tx(&mut scenario, ALICE);
    {
        let mut registry = ts::take_shared<BillRegistry>(&scenario);
        let (bill, debts) = layersplit::create_bill_equal_split(
            &mut registry, &clock, b"View Test", b"Desc", AMOUNT_100,
            vector[BOB], option::none(), ts::ctx(&mut scenario)
        );
        
        // Test bill view
        assert!(layersplit::bill_creator(&bill) == ALICE, 0);
        assert!(!layersplit::is_bill_settled(&bill), 1);
        
        // Test debt view
        let debt = debts.borrow(0);
        assert!(layersplit::debt_creditor(debt) == ALICE, 2);
        assert!(layersplit::debt_debtor(debt) == BOB, 3);
        assert!(!layersplit::is_debt_settled(debt), 4);
        assert!(layersplit::remaining_principal(debt) == AMOUNT_100, 5);
        
        // Test registry
        let (bills, volume) = layersplit::registry_stats(&registry);
        assert!(bills == 1, 6);
        assert!(volume == AMOUNT_100, 7);
        
        layersplit::share_bill(bill);
        layersplit::transfer_debts(debts);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

#[test]
fun test_constants() {
    assert!(layersplit::get_grace_period_ms() == GRACE_PERIOD_MS, 0);
    assert!(layersplit::get_daily_interest_rate_bps() == 100, 1);
    assert!(layersplit::get_max_participants() == 20, 2);
}
