'use strict';

/**
 * Student Account Management System
 * Migrated from COBOL (main.cob, operations.cob, data.cob).
 *
 * Program structure mirrors the three original COBOL programs:
 *   DataProgram  → store / dataRead() / dataWrite()  (data.cob)
 *   Operations   → viewBalance() / creditAccount() / debitAccount()  (operations.cob)
 *   MainProgram  → displayMenu() / processChoice() / main()  (main.cob)
 */

const readline = require('readline');

// ---------------------------------------------------------------------------
// DataProgram (data.cob)
// Mirrors STORAGE-BALANCE PIC 9(6)V99 VALUE 1000.00 in WORKING-STORAGE.
// dataRead / dataWrite replace the CALL 'DataProgram' USING 'READ'/'WRITE'
// interface so that the rest of the code retains the same call pattern.
// ---------------------------------------------------------------------------
const store = { balance: 1000.00 };

function dataRead() {
  return store.balance;
}

function dataWrite(balance) {
  store.balance = balance;
}

// ---------------------------------------------------------------------------
// Operations (operations.cob) — pure business logic (no I/O)
// Separated from the readline layer so they can be unit-tested directly.
// ---------------------------------------------------------------------------

// OPERATION-TYPE = 'TOTAL ': return current balance without modifying it.
function viewBalance() {
  return dataRead();
}

// OPERATION-TYPE = 'CREDIT': add amount to balance, persist, return new balance.
// Business rule: no minimum credit amount is enforced (mirrors COBOL).
function creditAccount(amount) {
  const balance = dataRead();
  const newBalance = parseFloat((balance + amount).toFixed(2));
  dataWrite(newBalance);
  return newBalance;
}

// OPERATION-TYPE = 'DEBIT ': subtract amount when balance >= amount.
// Business rule: debit equal to the current balance is allowed (>= check).
// Business rule: no write occurs when the debit is rejected.
// Returns { success, newBalance }.
function debitAccount(amount) {
  const balance = dataRead();
  if (balance >= amount) {
    const newBalance = parseFloat((balance - amount).toFixed(2));
    dataWrite(newBalance);
    return { success: true, newBalance };
  }
  return { success: false, newBalance: balance };
}

// ---------------------------------------------------------------------------
// Utility: promisify readline.question so async/await can replace ACCEPT
// ---------------------------------------------------------------------------
function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// ---------------------------------------------------------------------------
// CLI I/O wrappers — thin shells around the pure business functions above
// ---------------------------------------------------------------------------
async function operationTotal() {
  const balance = viewBalance();
  console.log(`Current balance: ${balance.toFixed(2)}`);
}

async function operationCredit(rl) {
  const input = await prompt(rl, 'Enter credit amount: ');
  const amount = parseFloat(input);
  const newBalance = creditAccount(amount);
  console.log(`Amount credited. New balance: ${newBalance.toFixed(2)}`);
}

async function operationDebit(rl) {
  const input = await prompt(rl, 'Enter debit amount: ');
  const amount = parseFloat(input);
  const result = debitAccount(amount);
  if (result.success) {
    console.log(`Amount debited. New balance: ${result.newBalance.toFixed(2)}`);
  } else {
    console.log('Insufficient funds for this debit.');
  }
}

// ---------------------------------------------------------------------------
// MainProgram helpers (main.cob)
// displayMenu + processChoice are exported so they can be tested independently.
// ---------------------------------------------------------------------------
function displayMenu() {
  console.log('--------------------------------');
  console.log('Account Management System');
  console.log('1. View Balance');
  console.log('2. Credit Account');
  console.log('3. Debit Account');
  console.log('4. Exit');
  console.log('--------------------------------');
}

// Handles one menu selection. Returns true to continue or false to exit.
async function processChoice(choice, rl) {
  switch (choice.trim()) {
    case '1':
      await operationTotal();
      return true;
    case '2':
      await operationCredit(rl);
      return true;
    case '3':
      await operationDebit(rl);
      return true;
    case '4':
      return false;
    default:
      console.log('Invalid choice, please select 1-4.');
      return true;
  }
}

// ---------------------------------------------------------------------------
// MainProgram (main.cob) — interactive CLI entry point
// Only runs when the file is executed directly; not on require() for tests.
// ---------------------------------------------------------------------------
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let running = true;

  while (running) {
    displayMenu();
    const choice = await prompt(rl, 'Enter your choice (1-4): ');
    running = await processChoice(choice, rl);
  }

  console.log('Exiting the program. Goodbye!');
  rl.close();
}

// Exports for unit testing
module.exports = {
  store,
  dataRead,
  dataWrite,
  viewBalance,
  creditAccount,
  debitAccount,
  displayMenu,
  processChoice,
};

if (require.main === module) {
  main();
}
