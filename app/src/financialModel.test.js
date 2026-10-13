import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAmortizationSchedule,
  calculateScheduleATaxSavings,
  calculateCashToClose,
  calculateCumulativeRentalTaxSavings,
  calculateMortgagePayment,
  calculateNetWorthComparison,
  valueInYear,
} from "./financialModel.js";

const closeTo = (actual, expected, tolerance = 0.01) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("mortgage payment handles interest, zero interest, and no principal", () => {
  closeTo(calculateMortgagePayment(840000, 6.5, 30), 5309.37, 0.01);
  closeTo(calculateMortgagePayment(120000, 0, 10), 1000);
  assert.equal(calculateMortgagePayment(0, 6.5, 30), 0);
});

test("amortization schedule pays the loan down without negative balances", () => {
  const payment = calculateMortgagePayment(840000, 6.5, 30);
  const schedule = buildAmortizationSchedule(840000, 6.5, 30, payment);

  assert.equal(schedule.length, 30);
  closeTo(schedule[0].principal, 9388.89, 0.1);
  closeTo(schedule.at(-1).balance, 0, 0.01);
  closeTo(
    schedule.reduce((total, year) => total + year.principal, 0),
    840000,
    0.01,
  );
});

test("year-based inflation uses the base value in year one", () => {
  assert.equal(valueInYear(6500, 3, 1), 6500);
  closeTo(valueInYear(6500, 3, 3), 6895.85);
});

test("cumulative rental savings applies each year's rent instead of the final-year rent", () => {
  const schedule = Array.from({ length: 10 }, (_, index) => ({
    year: index + 1,
    interest: 50000 - index * 1000,
  }));
  const result = calculateCumulativeRentalTaxSavings({
    throughYear: 8,
    moveOutYear: 5,
    amortizationSchedule: schedule,
    basePropertyTaxAnnual: 12390,
    baseHOAMonthly: 1556,
    hoaInflationPercent: 4,
    tenantRentMonthly: 6500,
    rentInflationPercent: 3,
    annualDepreciationShare: 15272.7272727,
    annualOperatingExpenseShare: 2625,
    taxShare: 0.5,
    marginalRate: 0.24,
  });

  assert.equal(result.yearly.length, 3);
  closeTo(result.yearly[0].rentalIncome, valueInYear(6500, 3, 6) * 12 * 0.5);
  closeTo(result.totalSavings, 8721.14, 0.1);
});

test("opportunity-cost totals reconcile and compare liquid net worth", () => {
  const result = calculateNetWorthComparison({
    buyBrokerage: 49425,
    userNetProceeds: 46500,
    rentBrokerage: 107000,
  });

  assert.equal(result.buyLiquidNetWorth, 95925);
  assert.equal(result.rentNetWorth, 107000);
  assert.equal(result.pathAWins, false);
  assert.equal(result.delta, 11075);
});

test("schedule A savings only counts deductions above the standard deduction", () => {
  const result = calculateScheduleATaxSavings({
    annualInterest: 54000,
    annualPropertyTax: 12390,
    loanAmount: 840000,
  });

  assert.equal(result.interestFullyDeductible, true);
  assert.equal(result.saltUnderCap, true);
  closeTo(result.totalItemized, 16000 + 6195 + 27000);
  closeTo(result.annualTaxSavings, (16000 + 6195 + 27000 - 16100) * 0.24);
});

test("schedule A savings applies the SALT cap and mortgage debt limit", () => {
  const result = calculateScheduleATaxSavings({
    annualInterest: 120000,
    annualPropertyTax: 60000,
    loanAmount: 2000000,
  });

  assert.equal(result.interestFullyDeductible, false);
  closeTo(result.deductibleInterest, 60000 * (750000 / 1000000));
  assert.equal(result.saltUnderCap, false);
  assert.equal(result.deductiblePropertyTax, 40400 - 16000);
});

test("cash to close splits down payment and closing costs by equity share", () => {
  const result = calculateCashToClose({
    purchasePrice: 1050000,
    downPaymentPercent: 20,
  });

  assert.equal(result.downPayment, 210000);
  assert.equal(result.closingCosts, 21000);
  assert.equal(result.total, 231000);
  assert.equal(result.byPerson.dad.total, 115500);
  assert.equal(result.byPerson.user.total, 57750);
  assert.equal(result.byPerson.brother.downPayment, 52500);
});
