import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAmortizationSchedule,
  buildRentFlow,
  calculateScheduleATaxSavings,
  calculateCashToClose,
  calculateOwnerCashFlows,
  calculateCumulativeRentalTaxSavings,
  calculateMortgagePayment,
  calculateNetWorthComparison,
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
    annualDepreciationShare: 15272.7272727,
    annualOperatingExpenseShare: 2625,
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
    loanAmount: 840000,
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
    loanAmount: 2000000,
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
const sumLinks = (flow, key, id) =>
  flow.links.filter((l) => l[key] === id).reduce((s, l) => s + l.value, 0);

test("rent flow splits an owner-mode shortfall 50/25/25 and balances every node", () => {
  const flow = buildRentFlow({
    isRental: false,
    owners: DEFAULT_OWNERS,
    totalRent: 6200,
    costs: rentFlowCosts,
  });
  assert.equal(flow.topUp, 1300);
  assert.equal(flow.surplus, 0);
  assert.equal(sumLinks(flow, "source", "in-investor"), 650);
  assert.equal(sumLinks(flow, "source", "in-you"), 3200 + 325);
  for (const node of flow.nodes) {
    if (node.column > 0) closeTo(sumLinks(flow, "target", node.id), node.value);
    if (node.column < 2) closeTo(sumLinks(flow, "source", node.id), node.value);
  }
});

test("rent flow distributes a rental surplus and skips the top-up", () => {
  const flow = buildRentFlow({
    isRental: true,
    owners: DEFAULT_OWNERS,
    totalRent: 9000,
    costs: { ...rentFlowCosts, opex: 500 },
  });
  assert.equal(flow.surplus, 1000);
  assert.ok(!flow.nodes.some((n) => n.id === "topUp"));
  assert.deepEqual(
    flow.nodes.filter((n) => n.column === 0).map((n) => n.id),
    ["in-tenant"],
  );
  assert.equal(flow.nodes.find((n) => n.id === "out-investor").value, 500);
});

const twoOwners = [
  { id: "a", name: "Alex", equity: 60, title: 60, rent: 2500, color: "#818cf8", isYou: true },
  { id: "b", name: "Blair", equity: 40, title: 40, rent: 2000, color: "#c084fc" },
];

test("rent flow and owner cash flows work for two owners", () => {
  const flow = buildRentFlow({ isRental: false, owners: twoOwners, totalRent: 4500, costs: rentFlowCosts });
  assert.equal(flow.topUp, 3000);
  assert.equal(sumLinks(flow, "source", "in-a"), 2500 + 1800);
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
