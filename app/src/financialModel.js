export const valueInYear = (baseValue, annualPercent, year) =>
  baseValue * Math.pow(1 + annualPercent / 100, Math.max(0, year - 1));

export function calculateMortgagePayment(principal, annualRatePercent, years) {
  if (principal <= 0 || years <= 0) return 0;

  const numberOfPayments = years * 12;
  if (annualRatePercent === 0) return principal / numberOfPayments;

  const monthlyRate = annualRatePercent / 100 / 12;
  const growth = Math.pow(1 + monthlyRate, numberOfPayments);
  return principal * ((monthlyRate * growth) / (growth - 1));
}

export function buildAmortizationSchedule(
  principal,
  annualRatePercent,
  years,
  monthlyPayment = calculateMortgagePayment(principal, annualRatePercent, years),
) {
  const schedule = [];
  const monthlyRate = annualRatePercent / 100 / 12;
  let balance = Math.max(0, principal);

  for (let year = 1; year <= years; year += 1) {
    let principalPaid = 0;
    let interestPaid = 0;

    for (let month = 0; month < 12 && balance > 0; month += 1) {
      const interest = balance * monthlyRate;
      const payment = Math.min(monthlyPayment, balance + interest);
      const principalPortion = Math.max(0, payment - interest);

      interestPaid += interest;
      principalPaid += principalPortion;
      balance = Math.max(0, balance - principalPortion);
    }

    schedule.push({
      year,
      principal: principalPaid,
      interest: interestPaid,
      balance,
    });
  }

  return schedule;
}

export function calculateCumulativeRentalTaxSavings({
  throughYear,
  moveOutYear,
  amortizationSchedule,
  basePropertyTaxAnnual,
  baseHOAMonthly,
  hoaInflationPercent,
  tenantRentMonthly,
  rentInflationPercent,
  annualDepreciationShare,
  annualOperatingExpenseShare,
  taxShare,
  marginalRate,
}) {
  const yearly = [];
  let totalSavings = 0;

  for (let year = moveOutYear + 1; year <= throughYear; year += 1) {
    const interest =
      (amortizationSchedule[year - 1]?.interest ?? 0) * taxShare;
    const propertyTax = valueInYear(basePropertyTaxAnnual, 2, year) * taxShare;
    const hoa =
      valueInYear(baseHOAMonthly, hoaInflationPercent, year) * 12 * taxShare;
    const rentalIncome =
      valueInYear(tenantRentMonthly, rentInflationPercent, year) * 12 * taxShare;
    const deductions =
      interest +
      propertyTax +
      hoa +
      annualDepreciationShare +
      annualOperatingExpenseShare;
    const netRentalIncome = rentalIncome - deductions;
    const savings = Math.max(0, -netRentalIncome * marginalRate);

    totalSavings += savings;
    yearly.push({ year, rentalIncome, deductions, netRentalIncome, savings });
  }

  return { totalSavings, yearly };
}

export function calculateNetWorthComparison({
  buyBrokerage,
  userNetProceeds,
  rentBrokerage,
}) {
  const buyLiquidNetWorth = buyBrokerage + userNetProceeds;
  const rentNetWorth = rentBrokerage;

  return {
    buyLiquidNetWorth,
    rentNetWorth,
    pathAWins: buyLiquidNetWorth > rentNetWorth,
    delta: Math.abs(buyLiquidNetWorth - rentNetWorth),
  };
}

// Owner-occupied Schedule A savings for one co-owner (federal, single filer).
export const TAX_ASSUMPTIONS = {
  w2Income: 200000,
  caStateTax: 15000,
  saltCap: 40400,
  standardDeduction: 16100,
  mortgageDebtLimit: 750000,
  marginalRate: 0.24,
};

export function calculateScheduleATaxSavings({
  annualInterest,
  annualPropertyTax,
  loanAmount,
  ownerShare = 0.5,
  assumptions = TAX_ASSUMPTIONS,
}) {
  const {
    caStateTax,
    saltCap,
    standardDeduction,
    mortgageDebtLimit,
    marginalRate,
  } = assumptions;

  const shareOfInterest = annualInterest * ownerShare;
  const shareOfPropertyTax = annualPropertyTax * ownerShare;
  const shareOfLoan = loanAmount * ownerShare;

  const interestFullyDeductible = shareOfLoan <= mortgageDebtLimit;
  const deductibleInterest = interestFullyDeductible
    ? shareOfInterest
    : shareOfInterest * (mortgageDebtLimit / shareOfLoan);

  const saltTotal = caStateTax + shareOfPropertyTax;
  const saltUnderCap = saltTotal <= saltCap;
  const deductiblePropertyTax = saltUnderCap
    ? shareOfPropertyTax
    : Math.max(0, saltCap - caStateTax);

  const totalItemized = caStateTax + deductiblePropertyTax + deductibleInterest;
  const incrementalDeduction = Math.max(0, totalItemized - standardDeduction);
  const annualTaxSavings = incrementalDeduction * marginalRate;

  return {
    shareOfInterest,
    shareOfPropertyTax,
    shareOfLoan,
    interestFullyDeductible,
    deductibleInterest,
    saltTotal,
    saltUnderCap,
    deductiblePropertyTax,
    totalItemized,
    itemizes: totalItemized > standardDeduction,
    incrementalDeduction,
    annualTaxSavings,
    monthlyTaxSavings: annualTaxSavings / 12,
  };
}

// Upfront cash split by equity: investor 50%, you 25%, co-owner 25%.
export const BUYER_CLOSING_COST_RATE = 0.02;
export const EQUITY_SPLIT = { investor: 0.5, user: 0.25, coOwner: 0.25 };

export function calculateCashToClose({
  purchasePrice,
  downPaymentPercent,
  closingCostRate = BUYER_CLOSING_COST_RATE,
  split = EQUITY_SPLIT,
}) {
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const closingCosts = purchasePrice * closingCostRate;
  const total = downPayment + closingCosts;
  const byPerson = Object.fromEntries(
    Object.entries(split).map(([person, share]) => [
      person,
      {
        share,
        downPayment: downPayment * share,
        closingCosts: closingCosts * share,
        total: total * share,
      },
    ]),
  );

  return { downPayment, closingCosts, total, byPerson };
}

// Monthly rent flow for the Sankey: who pays in, the shared pots, and where
// the money goes. Rent covers costs first; any gap is topped up by the owners
// in equity proportion, and any surplus is distributed the same way.
export function buildRentFlow({
  isRental,
  userRent,
  coOwnerRent,
  totalRent,
  costs,
  split = EQUITY_SPLIT,
}) {
  const people = {
    user: { label: "You", share: split.user },
    coOwner: { label: "Co-owner", share: split.coOwner },
    investor: { label: "Investor", share: split.investor },
  };
  const rentIn = isRental
    ? [{ person: "tenant", value: totalRent }]
    : [
        { person: "user", value: userRent },
        { person: "coOwner", value: coOwnerRent },
      ];
  const rent = rentIn.reduce((s, r) => s + r.value, 0);
  const costRows = [
    { id: "interest", label: "Mortgage interest", value: costs.interest },
    { id: "propertyTax", label: "Property tax", value: costs.propertyTax },
    { id: "hoa", label: "HOA", value: costs.hoa },
    { id: "opex", label: "Operating costs", value: costs.opex ?? 0 },
    { id: "principal", label: "Principal (equity)", value: costs.principal },
  ].filter((c) => c.value > 0.005);
  const totalCosts = costRows.reduce((s, c) => s + c.value, 0);
  const topUp = Math.max(0, totalCosts - rent);
  const surplus = Math.max(0, rent - totalCosts);
  const order = isRental
    ? ["tenant", "investor", "user", "coOwner"]
    : ["user", "coOwner", "investor"];

  const nodes = [];
  const links = [];
  for (const person of order) {
    const rentPaid = rentIn.find((r) => r.person === person)?.value ?? 0;
    const topUpPaid = topUp * (people[person]?.share ?? 0);
    if (rentPaid + topUpPaid <= 0.005) continue;
    nodes.push({
      id: `in-${person}`,
      kind: person,
      label: people[person]?.label ?? "Tenant",
      column: 0,
      value: rentPaid + topUpPaid,
    });
    if (rentPaid > 0.005)
      links.push({ source: `in-${person}`, target: "pot", value: rentPaid });
    if (topUpPaid > 0.005)
      links.push({ source: `in-${person}`, target: "topUp", value: topUpPaid });
  }
  nodes.push({ id: "pot", kind: "pot", label: "Rent pot", column: 1, value: rent });
  if (topUp > 0.005)
    nodes.push({ id: "topUp", kind: "topUp", label: "Owner top-up", column: 1, value: topUp });

  const uses = costRows.map((c) => ({ ...c, kind: c.id }));
  if (surplus > 0.005)
    for (const person of ["investor", "user", "coOwner"])
      uses.push({
        id: `out-${person}`,
        kind: person,
        label: `${people[person].label} (${Math.round(people[person].share * 100)}%)`,
        value: surplus * people[person].share,
      });
  for (const use of uses) nodes.push({ ...use, column: 2 });

  // Fill uses in order from the rent pot, then from the top-up, so ribbons
  // never cross between the middle and right columns.
  const sources = [{ id: "pot", left: rent }, { id: "topUp", left: topUp }];
  for (const use of uses) {
    let need = use.value;
    for (const src of sources) {
      const amount = Math.min(need, src.left);
      if (amount > 0.005) links.push({ source: src.id, target: use.id, value: amount });
      src.left -= amount;
      need -= amount;
    }
  }

  return { nodes, links, rent, totalCosts, topUp, surplus };
}
