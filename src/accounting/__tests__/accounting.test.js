'use strict';

/**
 * Unit tests for the Node.js Student Account Management System.
 * Each test maps to a test case in docs/TESTPLAN.md.
 *
 * Test structure mirrors the three COBOL programs:
 *   DataProgram  → storage layer tests
 *   Operations   → business logic tests (viewBalance, creditAccount, debitAccount)
 *   MainProgram  → menu display and dispatch tests
 */

const {
  store,
  dataRead,
  dataWrite,
  viewBalance,
  creditAccount,
  debitAccount,
  displayMenu,
  processChoice,
} = require('../index');

// Reset the shared in-memory store to 1000.00 before every test so each
// test case starts from the same pre-condition described in the test plan.
beforeEach(() => {
  store.balance = 1000.00;
});

// Silence console.log during tests unless a specific test needs to inspect it.
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ==========================================================================
// DataProgram — Storage Layer (data.cob)
// ==========================================================================

describe('DataProgram — storage layer', () => {
  // TC-002 (pre-condition): initial balance defaults to 1000.00
  test('TC-002 dataRead returns the initial default balance of 1000.00', () => {
    expect(dataRead()).toBe(1000.00);
  });

  // TC-010: dataRead is non-destructive
  test('TC-010 dataRead called twice returns the same value without modifying the balance', () => {
    const first = dataRead();
    const second = dataRead();
    expect(first).toBe(second);
    expect(store.balance).toBe(1000.00);
  });

  // TC-014: resetting the store simulates a new application run
  test('TC-014 resetting store.balance to 1000.00 simulates a fresh application start', () => {
    dataWrite(500.00);
    expect(dataRead()).toBe(500.00);
    // Simulate restarting the app — store is re-initialised to 1000.00
    store.balance = 1000.00;
    expect(dataRead()).toBe(1000.00);
  });
});

// ==========================================================================
// Operations — View Balance  (OPERATION-TYPE = 'TOTAL ')
// ==========================================================================

describe("Operations — View Balance ('TOTAL ')", () => {
  // TC-002
  test('TC-002 viewBalance returns 1000.00 before any credit or debit', () => {
    expect(viewBalance()).toBe(1000.00);
  });

  // TC-010
  test('TC-010 viewBalance does not alter the stored balance', () => {
    viewBalance();
    viewBalance();
    expect(store.balance).toBe(1000.00);
  });
});

// ==========================================================================
// Operations — Credit Account  (OPERATION-TYPE = 'CREDIT')
// ==========================================================================

describe("Operations — Credit Account ('CREDIT')", () => {
  // TC-003
  test('TC-003 creditAccount(100) increases balance from 1000.00 to 1100.00', () => {
    const newBalance = creditAccount(100);
    expect(newBalance).toBe(1100.00);
    expect(store.balance).toBe(1100.00);
  });

  // TC-003 — different starting balance
  test('TC-003 creditAccount reflects the correct new balance after a prior credit', () => {
    creditAccount(200);
    const newBalance = creditAccount(50);
    expect(newBalance).toBe(1250.00);
    expect(store.balance).toBe(1250.00);
  });

  // TC-011: zero credit is accepted (no validation in current implementation)
  test('TC-011 creditAccount(0) is accepted and balance remains unchanged at 1000.00', () => {
    const newBalance = creditAccount(0);
    expect(newBalance).toBe(1000.00);
    expect(store.balance).toBe(1000.00);
  });
});

// ==========================================================================
// Operations — Debit Account  (OPERATION-TYPE = 'DEBIT ')
// ==========================================================================

describe("Operations — Debit Account ('DEBIT ')", () => {
  // TC-004
  test('TC-004 debitAccount(100) decreases balance from 1000.00 to 900.00', () => {
    const result = debitAccount(100);
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(900.00);
    expect(store.balance).toBe(900.00);
  });

  // TC-005: debit equal to balance is allowed
  test('TC-005 debitAccount(1000) succeeds when debit equals the full balance, leaving 0.00', () => {
    const result = debitAccount(1000);
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(0.00);
    expect(store.balance).toBe(0.00);
  });

  // TC-006: debit larger than balance is rejected, balance unchanged
  test('TC-006 debitAccount(1500) is rejected with insufficient funds when balance is 1000.00', () => {
    const result = debitAccount(1500);
    expect(result.success).toBe(false);
    // Balance must remain unchanged — no write occurs
    expect(store.balance).toBe(1000.00);
  });

  // TC-012: zero debit is accepted (0 <= 1000, no minimum validation)
  test('TC-012 debitAccount(0) is accepted and balance remains unchanged at 1000.00', () => {
    const result = debitAccount(0);
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(1000.00);
    expect(store.balance).toBe(1000.00);
  });
});

// ==========================================================================
// Session — balance persistence and sequential operations
// ==========================================================================

describe('Session — balance persistence within a run', () => {
  // TC-007: multiple operations accumulate correctly in one session
  test('TC-007 credit 200 then debit 50 produces the correct running balance', () => {
    creditAccount(200);
    expect(viewBalance()).toBe(1200.00);

    debitAccount(50);
    expect(viewBalance()).toBe(1150.00);
  });

  // TC-013: all operations share a single in-memory balance
  test('TC-013 all operations operate on the same shared store — no separate account selection', () => {
    creditAccount(500);
    const balanceAfterCredit = viewBalance();

    debitAccount(100);
    const balanceAfterDebit = viewBalance();

    expect(balanceAfterCredit).toBe(1500.00);
    expect(balanceAfterDebit).toBe(1400.00);
    expect(store.balance).toBe(1400.00);
  });

  // TC-015: three sequential operations applied in order
  test('TC-015 sequential credit(100), debit(25), credit(10) produces a final balance of 1085.00', () => {
    creditAccount(100); // 1000 + 100 = 1100
    debitAccount(25);   // 1100 - 25  = 1075
    creditAccount(10);  // 1075 + 10  = 1085

    expect(viewBalance()).toBe(1085.00);
    expect(store.balance).toBe(1085.00);
  });
});

// ==========================================================================
// MainProgram — Menu display and dispatch  (main.cob)
// ==========================================================================

describe('MainProgram — menu display', () => {
  // TC-001: all four menu options are shown
  test('TC-001 displayMenu prints the account management system header and all four options', () => {
    // Re-enable console.log for this test so we can inspect what was printed
    console.log.mockRestore();
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    displayMenu();

    const printed = spy.mock.calls.map(call => call[0]);
    expect(printed).toContain('Account Management System');
    expect(printed).toContain('1. View Balance');
    expect(printed).toContain('2. Credit Account');
    expect(printed).toContain('3. Debit Account');
    expect(printed).toContain('4. Exit');
    expect(printed).toContain('--------------------------------');
  });
});

describe('MainProgram — menu dispatch (processChoice)', () => {
  // TC-002 via dispatch: choice '1' triggers View Balance and prints balance
  test('TC-002 processChoice("1") displays the current balance and returns true (continue)', async () => {
    const mockRl = {};
    const running = await processChoice('1', mockRl);
    expect(console.log).toHaveBeenCalledWith('Current balance: 1000.00');
    expect(running).toBe(true);
  });

  // TC-003 via dispatch: choice '2' triggers Credit and prints new balance
  test('TC-003 processChoice("2") credits the account and returns true (continue)', async () => {
    const mockRl = { question: jest.fn((_q, cb) => cb('100')) };
    const running = await processChoice('2', mockRl);
    expect(console.log).toHaveBeenCalledWith('Amount credited. New balance: 1100.00');
    expect(running).toBe(true);
    expect(store.balance).toBe(1100.00);
  });

  // TC-004 via dispatch: choice '3' triggers Debit (sufficient funds)
  test('TC-004 processChoice("3") debits the account when funds are sufficient and returns true', async () => {
    const mockRl = { question: jest.fn((_q, cb) => cb('100')) };
    const running = await processChoice('3', mockRl);
    expect(console.log).toHaveBeenCalledWith('Amount debited. New balance: 900.00');
    expect(running).toBe(true);
    expect(store.balance).toBe(900.00);
  });

  // TC-006 via dispatch: choice '3' with insufficient funds shows the rejection message
  test('TC-006 processChoice("3") displays insufficient funds message when debit exceeds balance', async () => {
    const mockRl = { question: jest.fn((_q, cb) => cb('1500')) };
    await processChoice('3', mockRl);
    expect(console.log).toHaveBeenCalledWith('Insufficient funds for this debit.');
    // Balance must remain at 1000.00 — no write occurred
    expect(store.balance).toBe(1000.00);
  });

  // TC-008: invalid menu choice shows error and continues the loop
  test('TC-008 processChoice("9") displays an invalid choice message and returns true (continue)', async () => {
    const mockRl = {};
    const running = await processChoice('9', mockRl);
    expect(console.log).toHaveBeenCalledWith('Invalid choice, please select 1-4.');
    expect(running).toBe(true);
  });

  // TC-009: exit choice stops the loop
  test('TC-009 processChoice("4") returns false to signal the application should exit', async () => {
    const mockRl = {};
    const running = await processChoice('4', mockRl);
    expect(running).toBe(false);
  });

  // TC-016: every non-exit choice returns true so the menu loop continues
  test('TC-016 processChoice returns true for choices 1, 2, and 3 so the menu loop continues', async () => {
    const rlViewBalance = {};
    const rlCredit = { question: jest.fn((_q, cb) => cb('50')) };
    const rlDebit  = { question: jest.fn((_q, cb) => cb('25')) };

    expect(await processChoice('1', rlViewBalance)).toBe(true);
    expect(await processChoice('2', rlCredit)).toBe(true);
    expect(await processChoice('3', rlDebit)).toBe(true);
  });
});
