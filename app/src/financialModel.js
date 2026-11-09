// Prop 13 caps assessed-value growth at 2% a year.
export const PROPERTY_TAX_GROWTH = 2;

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

// One year of rental P&L for a taxShare of the LLC. tax > 0 is owed, < 0 is saved.
export function rentalTaxForYear({
  rentAnnual,
  interest,
  propertyTax,
  hoaAnnual,
  opexAnnual,
  depreciation,
  taxShare,
  marginalRate = TAX_ASSUMPTIONS.marginalRate,
}) {
  const rentalIncome = rentAnnual * taxShare;
  const deductions =
    (interest + propertyTax + hoaAnnual + opexAnnual + depreciation) * taxShare;
  const netRentalIncome = rentalIncome - deductions;
  return { rentalIncome, deductions, netRentalIncome, tax: netRentalIncome * marginalRate };
}

// Net tax saved over the rental years; a profitable year counts against the total.
export function calculateCumulativeRentalTaxSavings({
  throughYear,
  moveOutYear,
  amortizationSchedule,
  basePropertyTaxAnnual,
  baseHOAMonthly,
  hoaInflationPercent,
  tenantRentMonthly,
  rentInflationPercent,
  annualDepreciation,
  annualOperatingExpenses,
  taxShare,
  marginalRate,
}) {
  const yearly = [];
  let totalSavings = 0;

  for (let year = moveOutYear + 1; year <= throughYear; year += 1) {
    const row = rentalTaxForYear({
      rentAnnual: valueInYear(tenantRentMonthly, rentInflationPercent, year) * 12,
      interest: amortizationSchedule[year - 1]?.interest ?? 0,
      propertyTax: valueInYear(basePropertyTaxAnnual, PROPERTY_TAX_GROWTH, year),
      hoaAnnual: valueInYear(baseHOAMonthly, hoaInflationPercent, year) * 12,
      opexAnnual: annualOperatingExpenses,
      depreciation: annualDepreciation,
      taxShare,
      marginalRate,
    });
    const savings = -row.tax;
    totalSavings += savings;
    yearly.push({ year, ...row, savings });
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

// Federal assumptions for one co-owner filing single.
export const TAX_ASSUMPTIONS = {
  w2Income: 200000,
  caStateTax: 15000,
  saltCap: 40400,
  standardDeduction: 16100,
  mortgageDebtLimit: 750000,
  marginalRate: 0.24,
  capitalGainsRate: 0.15,
  recaptureRate: 0.25,
};

// Straight-line depreciation on the building (80% of the price) over 27.5 years.
export const annualDepreciation = (purchasePrice) => (purchasePrice * 0.8) / 27.5;

// Average balance during a year; the mortgage debt limit is measured against it.
export function averageLoanBalance(schedule, loanAmount, year) {
  const start = year <= 1 ? loanAmount : schedule[year - 2]?.balance ?? 0;
  const end = schedule[year - 1]?.balance ?? 0;
  return (start + end) / 2;
}

// Section 121: owners must have lived there 2 of the 5 years before the sale.
export function section121Status(year, moveOutYear) {
  if (year < 2) return "too-soon";
  if (year <= moveOutYear) return "living";
  if (year <= moveOutYear + 3) return "eligible";
  return "expired";
}

export const SECTION_121_EXCLUSION = 250000;

// One owner's taxable gain: their title share of the gain, less their own
// $250k exclusion if they lived there and the window is still open.
export function ownerTaxableGain({ capitalGain, titleShare, resident, excluded }) {
  const gain = Math.max(0, capitalGain) * titleShare;
  const exclusion = excluded && resident ? SECTION_121_EXCLUSION : 0;
  return Math.max(0, gain - exclusion);
}

export function calculateScheduleATaxSavings({
  annualInterest,
  annualPropertyTax,
  loanBalance,
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
  const shareOfLoan = loanBalance * ownerShare;

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

// Upfront cash split by each owner's equity percentage.
export const BUYER_CLOSING_COST_RATE = 0.02;

export function calculateCashToClose({
  purchasePrice,
  downPaymentPercent,
  owners,
  closingCostRate = BUYER_CLOSING_COST_RATE,
}) {
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const closingCosts = purchasePrice * closingCostRate;
  const total = downPayment + closingCosts;
  const byPerson = Object.fromEntries(
    owners.map((o) => {
      const share = o.equity / 100;
      return [
        o.id,
        {
          share,
          downPayment: downPayment * share,
          closingCosts: closingCosts * share,
          total: total * share,
        },
      ];
    }),
  );

  return { downPayment, closingCosts, total, byPerson };
}

// Monthly cash flow per owner. Costs and rent income split by equity; residents
// also pay their rent in owner mode; taxShieldFor(owner) adds monthly savings.
export function calculateOwnerCashFlows({
  owners,
  isRental,
  totalRent,
  costs,
  taxShieldFor = () => 0,
}) {
  const opex = isRental ? costs.opex ?? 0 : 0;
  return owners.map((owner) => {
    const share = owner.equity / 100;
    const split = {
      mortgage: costs.mortgage * share,
      propertyTax: costs.propertyTax * share,
      hoa: costs.hoa * share,
      opex: opex * share,
    };
    const expenses = split.mortgage + split.propertyTax + split.hoa + split.opex;
    const rentIncome = totalRent * share;
    const rentPaid = isRental ? 0 : owner.rent;
    const taxShield = taxShieldFor(owner);
    return {
      ...owner,
      share,
      split,
      expenses,
      rentIncome,
      rentPaid,
      taxShield,
      net: rentIncome - expenses - rentPaid + taxShield,
    };
  });
}

// The monthly payment by component. Rent covers it first; owners top up any
// gap and share any surplus, both by equity.
export function paymentBreakdown({ totalRent, costs }) {
  const parts = [
    { id: "interest", label: "Mortgage interest", value: costs.interest },
    { id: "propertyTax", label: "Property tax", value: costs.propertyTax },
    { id: "hoa", label: "HOA", value: costs.hoa },
    { id: "opex", label: "Operating costs", value: costs.opex ?? 0 },
    { id: "principal", label: "Principal (equity)", value: costs.principal },
  ].filter((c) => c.value > 0.005);
  const totalCosts = parts.reduce((s, c) => s + c.value, 0);
  return {
    parts,
    totalCosts,
    topUp: Math.max(0, totalCosts - totalRent),
    surplus: Math.max(0, totalRent - totalCosts),
  };
}

// Year-by-year value, equity, carrying costs and taxable gain if sold that year.
export function projectLongTerm({
  purchasePrice,
  amortizationSchedule,
  baseHOA,
  hoaInflation,
  appreciation,
  moveOutYear,
  owners,
}) {
  const rows = [];
  let cumulativeHOAIncrease = 0;
  for (let year = 1; year <= 30; year += 1) {
    const marketValue = purchasePrice * Math.pow(1 + appreciation / 100, year);
    const loanBalance = amortizationSchedule[year - 1]?.balance ?? 0;
    const annualHOA = valueInYear(baseHOA, hoaInflation, year) * 12;
    cumulativeHOAIncrease += annualHOA - baseHOA * 12;
    const capitalGain = marketValue - purchasePrice;
    const status = section121Status(year, moveOutYear);
    const excluded = status === "living" || status === "eligible";
    const taxableGain = owners.reduce(
      (sum, o) =>
        sum +
        ownerTaxableGain({ capitalGain, titleShare: o.title / 100, resident: o.rent > 0, excluded }),
      0,
    );
    rows.push({
      year,
      marketValue,
      loanBalance,
      equity: marketValue - loanBalance,
      annualHOA,
      monthlyHOA: annualHOA / 12,
      section121Status: status,
      capitalGain,
      taxableGain,
      cumulativeHOAIncrease,
      appreciationGain: capitalGain,
      // Appreciation gain minus the extra HOA paid because of HOA growth.
      netPosition: capitalGain - cumulativeHOAIncrease,
    });
  }
  return rows;
}

const STARTING_CASH = 100000;
const SELLER_CLOSING_COST_RATE = 0.06;

// Month-by-month: "you" buy (and later rent the home out) or rent instead,
// investing whatever is left of take-home pay. Both paths start with the
// same cash; buying sells at the end of selectedYear.
export function calculateBuyVsRent({
  purchasePrice,
  loanAmount,
  mortgage,
  baseHOA,
  basePropertyTaxAnnual,
  hoaInflation,
  appreciation,
  youShare,
  youTitleShare,
  youRent,
  ownerRentTotal,
  tenantRent,
  operatingExpenseRate,
  moveOutYear,
  selectedYear,
  amortizationSchedule,
  rentInflation,
  takeHome,
  nonHousingExpenses,
  stockMarketReturn,
  equivalentRent,
  includeTaxSavings = true,
}) {
  const initialDownPaymentUser = (purchasePrice - loanAmount) * youShare;
  const initialClosingCostsUser = purchasePrice * BUYER_CLOSING_COST_RATE * youShare;
  const totalInitialSunkUser = initialDownPaymentUser + initialClosingCostsUser;

  const monthlyStockRate = Math.pow(1 + stockMarketReturn / 100, 1 / 12) - 1;
  const availableForHousing = takeHome - nonHousingExpenses;
  const depreciation = annualDepreciation(purchasePrice);
  const opExAnnual = purchasePrice * (operatingExpenseRate / 100);

  let buyBrokerage = STARTING_CASH - totalInitialSunkUser;
  let rentBrokerage = STARTING_CASH;
  let totalBuySurplusDeposited = 0;
  let totalRentSurplusDeposited = 0;
  let totalBuyHousingSpent = 0;
  let totalRentHousingSpent = 0;
  let final = {};

  for (let m = 1; m <= selectedYear * 12; m += 1) {
    const year = Math.floor((m - 1) / 12) + 1;
    const isRental = year > moveOutYear;
    const hoaMonthly = valueInYear(baseHOA, hoaInflation, year);
    const propertyTaxAnnual = valueInYear(basePropertyTaxAnnual, PROPERTY_TAX_GROWTH, year);
    const interest = amortizationSchedule[year - 1]?.interest ?? 0;

    const month = {
      mortgageShare: mortgage * youShare,
      hoaShare: hoaMonthly * youShare,
      propTaxShare: (propertyTaxAnnual / 12) * youShare,
      taxShield: 0,
      rentIncome: 0,
      tenantRent: 0,
      opExShare: 0,
      rentalTaxImpact: 0,
      isRental,
    };
    let buyHousingCost;
    if (!isRental) {
      month.rentIncome = ownerRentTotal * youShare;
      month.taxShield = includeTaxSavings
        ? calculateScheduleATaxSavings({
            annualInterest: interest,
            annualPropertyTax: propertyTaxAnnual,
            loanBalance: averageLoanBalance(amortizationSchedule, loanAmount, year),
            ownerShare: youTitleShare,
          }).monthlyTaxSavings
        : 0;
      buyHousingCost =
        month.mortgageShare + month.hoaShare + month.propTaxShare + youRent - month.rentIncome - month.taxShield;
    } else {
      month.tenantRent = valueInYear(tenantRent, rentInflation, year);
      month.opExShare = (opExAnnual / 12) * youShare;
      month.rentIncome = month.tenantRent * youShare;
      month.rentalTaxImpact = includeTaxSavings
        ? rentalTaxForYear({
            rentAnnual: month.tenantRent * 12,
            interest,
            propertyTax: propertyTaxAnnual,
            hoaAnnual: hoaMonthly * 12,
            opexAnnual: opExAnnual,
            depreciation,
            taxShare: youTitleShare,
          }).tax / 12
        : 0;
      buyHousingCost =
        month.mortgageShare + month.hoaShare + month.propTaxShare + month.opExShare - month.rentIncome + month.rentalTaxImpact;
    }

    const rentHousingCost = isRental ? 0 : valueInYear(equivalentRent, rentInflation, year);
    const buySurplus = availableForHousing - buyHousingCost;
    const rentSurplus = availableForHousing - rentHousingCost;

    buyBrokerage = buyBrokerage * (1 + monthlyStockRate) + buySurplus;
    rentBrokerage = rentBrokerage * (1 + monthlyStockRate) + rentSurplus;
    totalBuySurplusDeposited += buySurplus;
    totalRentSurplusDeposited += rentSurplus;
    totalBuyHousingSpent += buyHousingCost;
    totalRentHousingSpent += rentHousingCost;

    if (m === selectedYear * 12) final = { ...month, buyHousingCost, buySurplus, rentHousingCost, rentSurplus };
  }

  // Selling at the end of selectedYear.
  const finalPropertyVal = purchasePrice * Math.pow(1 + appreciation / 100, selectedYear);
  const remainingLoanTotal = amortizationSchedule[Math.min(selectedYear, 30) - 1]?.balance ?? 0;
  const grossEquityTotal = finalPropertyVal - remainingLoanTotal;
  const sellerClosingCostsTotal = finalPropertyVal * SELLER_CLOSING_COST_RATE;
  const status = section121Status(selectedYear, moveOutYear);
  const taxableGainUser = ownerTaxableGain({
    capitalGain: finalPropertyVal - purchasePrice,
    titleShare: youTitleShare,
    resident: youRent > 0,
    excluded: status === "living" || status === "eligible",
  });
  // Recapture only offsets depreciation the tax toggle counted.
  const depreciationClaimedUser = includeTaxSavings
    ? depreciation * Math.min(27.5, Math.max(0, selectedYear - moveOutYear)) * youTitleShare
    : 0;
  const saleTaxUser =
    taxableGainUser * TAX_ASSUMPTIONS.capitalGainsRate +
    depreciationClaimedUser * TAX_ASSUMPTIONS.recaptureRate;

  const userNetProceeds = (grossEquityTotal - sellerClosingCostsTotal) * youShare - saleTaxUser;
  const comparison = calculateNetWorthComparison({ buyBrokerage, userNetProceeds, rentBrokerage });

  return {
    STARTING_CASH,
    availableForHousing,
    totalInitialSunkUser,
    finalBuyHousingCost: final.buyHousingCost,
    finalBuySurplus: final.buySurplus,
    finalRentHousingCost: final.rentHousingCost,
    finalRentSurplus: final.rentSurplus,
    finalMortgageShare: final.mortgageShare,
    finalHoaShare: final.hoaShare,
    finalPropTaxShare: final.propTaxShare,
    finalTaxShield: final.taxShield,
    finalRentIncome: final.rentIncome,
    finalIsRental: final.isRental,
    finalTenantRent: final.tenantRent,
    finalOpExShare: final.opExShare,
    finalRentalTaxImpact: final.rentalTaxImpact,
    totalBuyHousingSpent,
    totalRentHousingSpent,
    totalBuySurplusDeposited,
    totalRentSurplusDeposited,
    buyBrokerage,
    rentBrokerage,
    buyCumulativeReturns: buyBrokerage - (STARTING_CASH - totalInitialSunkUser) - totalBuySurplusDeposited,
    rentCumulativeReturns: rentBrokerage - STARTING_CASH - totalRentSurplusDeposited,
    userNetProceeds,
    saleTaxUser,
    sellerClosingCostsUser: sellerClosingCostsTotal * youShare,
    currentHomeValueUser: finalPropertyVal * youShare,
    remainingLoanUser: remainingLoanTotal * youShare,
    ...comparison,
  };
}
