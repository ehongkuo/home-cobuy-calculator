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
  w2Income: 213000,
  caStateTax: 16000,
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

// Upfront cash split by equity: Dad 50%, you 25%, brother 25%.
export const BUYER_CLOSING_COST_RATE = 0.02;
export const EQUITY_SPLIT = { dad: 0.5, user: 0.25, brother: 0.25 };

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
