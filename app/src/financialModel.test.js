import test from "node:test";
import assert from "node:assert/strict";

import {
  averageLoanBalance,
  buildAmortizationSchedule,
  calculateBuyVsRent,
  calculateScheduleATaxSavings,
  calculateCashToClose,
  calculateOwnerCashFlows,
  calculateCumulativeRentalTaxSavings,
  calculateMortgagePayment,
  calculateNetWorthComparison,
  ownerTaxableGain,
  paymentBreakdown,
  projectLongTerm,
  rentalTaxForYear,
  TAX_ASSUMPTIONS,
  valueInYear,
} from "./financialModel.js";
import {
  DEFAULT_INPUTS,
  DEFAULT_OWNERS,
  decodeInputs,
  encodeInputs,
  inputsFromHash,
  newOwner,
  normalizeInputs,
} from "./scenario.js";

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
    baseHOAMonthly: 1500,
    hoaInflationPercent: 4,
    tenantRentMonthly: 6500,
    rentInflationPercent: 3,
    annualDepreciation: 30545.4545454,
    annualOperatingExpenses: 5250,
    taxShare: 0.5,
    marginalRate: 0.24,
  });

  assert.equal(result.yearly.length, 3);
  closeTo(result.yearly[0].rentalIncome, valueInYear(6500, 3, 6) * 12 * 0.5);
  closeTo(result.totalSavings, 8414.87, 0.1);
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
    loanBalance: 840000,
  });

  assert.equal(result.interestFullyDeductible, true);
  assert.equal(result.saltUnderCap, true);
  closeTo(result.totalItemized, 15000 + 6195 + 27000);
  closeTo(result.annualTaxSavings, (15000 + 6195 + 27000 - 16100) * 0.24);
});

test("schedule A savings applies the SALT cap and mortgage debt limit", () => {
  const result = calculateScheduleATaxSavings({
    annualInterest: 120000,
    annualPropertyTax: 60000,
    loanBalance: 2000000,
  });

  assert.equal(result.interestFullyDeductible, false);
  closeTo(result.deductibleInterest, 60000 * (750000 / 1000000));
  assert.equal(result.saltUnderCap, false);
  assert.equal(result.deductiblePropertyTax, 40400 - 15000);
});

test("cash to close splits down payment and closing costs by equity share", () => {
  const result = calculateCashToClose({
    purchasePrice: 1050000,
    downPaymentPercent: 20,
    owners: DEFAULT_OWNERS,
  });

  assert.equal(result.downPayment, 210000);
  assert.equal(result.closingCosts, 21000);
  assert.equal(result.total, 231000);
  assert.equal(result.byPerson.investor.total, 115500);
  assert.equal(result.byPerson.you.total, 57750);
  assert.equal(result.byPerson.coOwner.downPayment, 52500);
});

const rentFlowCosts = { interest: 4000, principal: 1000, propertyTax: 1000, hoa: 1500 };

test("payment breakdown finds the owner top-up or the surplus", () => {
  const short = paymentBreakdown({ totalRent: 6200, costs: rentFlowCosts });
  assert.equal(short.totalCosts, 7500);
  assert.equal(short.topUp, 1300);
  assert.equal(short.surplus, 0);
  const extra = paymentBreakdown({ totalRent: 9000, costs: { ...rentFlowCosts, opex: 500 } });
  assert.equal(extra.surplus, 1000);
  assert.equal(extra.topUp, 0);
  assert.deepEqual(extra.parts.map((p) => p.id), ["interest", "propertyTax", "hoa", "opex", "principal"]);
});

const twoOwners = [
  { id: "a", name: "Alex", equity: 60, title: 60, rent: 2500, color: "#818cf8", isYou: true },
  { id: "b", name: "Blair", equity: 40, title: 40, rent: 2000, color: "#c084fc" },
];

test("owner cash flows work for two owners", () => {
  const rows = calculateOwnerCashFlows({
    owners: twoOwners,
    isRental: false,
    totalRent: 4500,
    costs: { mortgage: 5000, propertyTax: 1000, hoa: 1500 },
    taxShieldFor: (o) => o.title,
  });
  closeTo(rows[0].net, 4500 * 0.6 - 7500 * 0.6 - 2500 + 60);
  closeTo(rows.reduce((s, r) => s + r.net - r.taxShield + r.rentPaid, 0), 4500 - 7500);
});

test("owner cash flows split four owners and include opex only when rented", () => {
  const owners = [...twoOwners.map((o) => ({ ...o, equity: 25 })), newOwner(twoOwners), newOwner([...twoOwners, newOwner(twoOwners)])]
    .map((o) => ({ ...o, equity: 25 }));
  const costs = { mortgage: 4000, propertyTax: 1000, hoa: 1000, opex: 400 };
  const rental = calculateOwnerCashFlows({ owners, isRental: true, totalRent: 6000, costs });
  rental.forEach((r) => closeTo(r.net, (6000 - 6400) / 4));
  const owner = calculateOwnerCashFlows({ owners, isRental: false, totalRent: 4500, costs });
  closeTo(owner[2].net, (4500 - 6000) / 4);
});

test("scenario round-trips through the URL hash", () => {
  const inputs = { ...DEFAULT_INPUTS, owners: twoOwners, purchasePrice: 800000 };
  const restored = inputsFromHash(`#s=${encodeInputs(inputs)}`);
  assert.deepEqual(restored, normalizeInputs(inputs));
  assert.equal(restored.owners[1].name, "Blair");
  assert.equal(decodeInputs("not-base64!"), null);
});

test("scenario normalization repairs bad input", () => {
  const fixed = normalizeInputs({
    purchasePrice: "abc",
    owners: [
      { id: "x", name: "", equity: 150, rent: -5 },
      { id: "x", name: "Dup", isYou: true },
      { id: "y", isYou: true },
      ...Array(5).fill({ name: "Extra" }),
    ],
  });
  assert.equal(fixed.purchasePrice, DEFAULT_INPUTS.purchasePrice);
  assert.equal(fixed.owners.length, 5);
  assert.equal(fixed.owners[0].equity, 100);
  assert.equal(fixed.owners[0].rent, 0);
  assert.notEqual(fixed.owners[1].id, "x");
  assert.equal(fixed.owners.filter((o) => o.isYou).length, 1);
  assert.equal(fixed.owners[1].isYou, true);
  assert.deepEqual(normalizeInputs(null).owners, DEFAULT_OWNERS);
});

test("rental tax uses the configured marginal rate and charges tax on a profit", () => {
  const year = rentalTaxForYear({
    rentAnnual: 100000,
    interest: 40000,
    propertyTax: 10000,
    hoaAnnual: 10000,
    opexAnnual: 5000,
    depreciation: 25000,
    taxShare: 0.5,
  });
  assert.equal(year.netRentalIncome, 5000);
  closeTo(year.tax, 5000 * TAX_ASSUMPTIONS.marginalRate);
});

test("the mortgage debt limit follows the balance, not the original loan", () => {
  const schedule = buildAmortizationSchedule(1600000, 6.5, 30);
  const year25 = averageLoanBalance(schedule, 1600000, 25);
  assert.ok(year25 < 750000);
  assert.equal(averageLoanBalance(schedule, 1600000, 1), (1600000 + schedule[0].balance) / 2);
  const late = calculateScheduleATaxSavings({
    annualInterest: schedule[24].interest,
    annualPropertyTax: 20000,
    loanBalance: year25,
    ownerShare: 1,
  });
  assert.equal(late.interestFullyDeductible, true);
});

test("each owner's Section 121 exclusion is capped at their own share of the gain", () => {
  const gain = 600000;
  const taxable = [0.9, 0.1].reduce(
    (sum, titleShare) => sum + ownerTaxableGain({ capitalGain: gain, titleShare, resident: true, excluded: true }),
    0,
  );
  assert.equal(taxable, 540000 - 250000);
  assert.equal(ownerTaxableGain({ capitalGain: gain, titleShare: 0.5, resident: false, excluded: true }), 300000);
  assert.equal(ownerTaxableGain({ capitalGain: -1000, titleShare: 1, resident: true, excluded: false }), 0);
});

test("long-term projection opens and closes the Section 121 window", () => {
  const rows = projectLongTerm({
    purchasePrice: 1000000,
    amortizationSchedule: buildAmortizationSchedule(800000, 6.5, 30),
    baseHOA: 1000,
    hoaInflation: 4,
    appreciation: 5,
    moveOutYear: 5,
    owners: [
      { title: 90, rent: 3000 },
      { title: 10, rent: 3000 },
    ],
  });
  assert.deepEqual(
    [1, 5, 8, 9].map((y) => rows[y - 1].section121Status),
    ["too-soon", "living", "eligible", "expired"],
  );
  const year8 = rows[7];
  closeTo(year8.taxableGain, Math.max(0, year8.capitalGain * 0.9 - 250000) + Math.max(0, year8.capitalGain * 0.1 - 250000));
  closeTo(rows[8].taxableGain, rows[8].capitalGain);
  closeTo(rows[1].annualHOA, 12000 * 1.04);
});

test("buy vs rent takes tax on the sale out of the proceeds", () => {
  const loanAmount = 840000;
  const amortizationSchedule = buildAmortizationSchedule(loanAmount, 6.5, 30);
  const base = {
    ...DEFAULT_INPUTS,
    loanAmount,
    mortgage: calculateMortgagePayment(loanAmount, 6.5, 30),
    basePropertyTaxAnnual: 1050000 * 0.0118,
    youShare: 0.25,
    youTitleShare: 0.5,
    youRent: 3200,
    ownerRentTotal: 6200,
    amortizationSchedule,
  };
  const late = calculateBuyVsRent({ ...base, selectedYear: 15 });
  const gain = 1050000 * (Math.pow(1.03, 15) - 1);
  const recapture = (1050000 * 0.8) / 27.5 * 10 * 0.5;
  closeTo(late.saleTaxUser, gain * 0.5 * 0.15 + recapture * 0.25, 1);
  closeTo(
    late.userNetProceeds,
    (late.currentHomeValueUser - late.remainingLoanUser - late.sellerClosingCostsUser) - late.saleTaxUser,
    1,
  );
  assert.equal(late.buyLiquidNetWorth, late.buyBrokerage + late.userNetProceeds);
  // Inside the window a small gain is fully excluded.
  assert.equal(calculateBuyVsRent({ ...base, selectedYear: 3 }).saleTaxUser, 0);
});

test("loaded scenarios are clamped to the slider ranges", () => {
  const fixed = normalizeInputs({ moveOutYear: 5.5, downPaymentPercent: 150, interestRate: -3, selectedYear: 99 });
  assert.equal(fixed.moveOutYear, 6);
  assert.equal(fixed.downPaymentPercent, 50);
  assert.equal(fixed.interestRate, 4);
  assert.equal(fixed.selectedYear, 30);
});
