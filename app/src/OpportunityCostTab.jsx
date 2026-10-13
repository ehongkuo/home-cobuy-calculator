import React, { useMemo } from "react";
import MathTooltip from "./MathTooltip";
import { formatCurrency } from "./utils";
import {
  calculateNetWorthComparison,
  calculateScheduleATaxSavings,
  TAX_ASSUMPTIONS,
  valueInYear,
} from "./financialModel";

function OpportunityCostTab({
  purchasePrice,
  loanAmount,
  mortgage, // monthly
  baseHOA, // monthly
  basePropertyTaxAnnual, // annual
  hoaInflation, // percentage
  appreciation, // percentage
  userRent, // user's monthly rent contribution during owner-occupied
  brotherRent, // brother's rent during owner-occupied
  tenantRent, // total monthly tenant rent when rented out
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

  // ── Constants ──
  const STARTING_CASH = 100000;
  const downPaymentTotal = purchasePrice - loanAmount;
  const buyerClosingCostsPercent = 0.02;
  const sellerClosingCostsPercent = 0.06;

  const userEquityShare = 0.25;
  const userCashFlowShareOwner = 0.25;
  const userCashFlowShareRental = 0.25;
  const userTaxShareRental = 0.50;

  const marginalRate = TAX_ASSUMPTIONS.marginalRate;
  const buildingRatio = 0.8;
  const depreciationBasis = purchasePrice * buildingRatio;
  const annualDepreciation = depreciationBasis / 27.5;

  const data = useMemo(() => {
    const initialDownPaymentUser = downPaymentTotal * userEquityShare;
    const initialClosingCostsUser =
      purchasePrice * buyerClosingCostsPercent * userEquityShare;
    const totalInitialSunkUser =
      initialDownPaymentUser + initialClosingCostsUser;

    const monthlyStockRate =
      Math.pow(1 + stockMarketReturn / 100, 1 / 12) - 1;
    const availableForHousing = takeHome - nonHousingExpenses;

    let buyBrokerage = STARTING_CASH - totalInitialSunkUser;
    let rentBrokerage = STARTING_CASH;

    let totalBuySurplusDeposited = 0;
    let totalRentSurplusDeposited = 0;
    let totalBuyHousingSpent = 0;
    let totalRentHousingSpent = 0;

    // Final month snapshot
    let finalBuyHousingCost = 0;
    let finalBuySurplus = 0;
    let finalRentHousingCost = 0;
    let finalRentSurplus = 0;
    let finalMortgageShare = 0;
    let finalHoaShare = 0;
    let finalPropTaxShare = 0;
    let finalTaxShield = 0;
    let finalRentIncome = 0;
    let finalIsRental = false;
    let finalTenantRent = 0;
    let finalOpExShare = 0;
    let finalRentalTaxImpact = 0;

    for (let m = 1; m <= selectedYear * 12; m++) {
      const yearIndex = Math.floor((m - 1) / 12);
      const currentYear = yearIndex + 1;
      const isRental = currentYear > moveOutYear;

      const currentHOA = valueInYear(baseHOA, hoaInflation, currentYear);
      const currentTaxAnnual = valueInYear(
        basePropertyTaxAnnual,
        2,
        currentYear,
      );
      const currentTaxMonthly = currentTaxAnnual / 12;

      const yearData = amortizationSchedule[yearIndex] || {
        interest: 0,
        principal: 0,
      };
      const totalInterestForYear = yearData.interest;

      let buyHousingCost = 0;
      let monthMortgageShare = 0;
      let monthHoaShare = 0;
      let monthPropTaxShare = 0;
      let monthTaxShield = 0;
      let monthRentIncome = 0;
      let monthTenantRent = 0;
      let monthOpExShare = 0;
      let monthRentalTaxImpact = 0;

      if (!isRental) {
        monthMortgageShare = mortgage * userCashFlowShareOwner;
        monthHoaShare = currentHOA * userCashFlowShareOwner;
        monthPropTaxShare = currentTaxMonthly * userCashFlowShareOwner;

        const totalRentPot = userRent + brotherRent;
        monthRentIncome = totalRentPot * 0.25;

        monthTaxShield = includeTaxSavings
          ? calculateScheduleATaxSavings({
              annualInterest: totalInterestForYear,
              annualPropertyTax: currentTaxAnnual,
              loanAmount,
            }).monthlyTaxSavings
          : 0;

        buyHousingCost =
          monthMortgageShare +
          monthHoaShare +
          monthPropTaxShare +
          userRent -
          monthRentIncome -
          monthTaxShield;
      } else {
        const inflatedTenantRent = valueInYear(
          tenantRent,
          rentInflation,
          currentYear,
        );
        monthTenantRent = inflatedTenantRent;
        const currentOpExAnnual =
          purchasePrice * (operatingExpenseRate / 100);
        monthOpExShare = (currentOpExAnnual / 12) * userCashFlowShareRental;

        monthMortgageShare = mortgage * userCashFlowShareRental;
        monthHoaShare = currentHOA * userCashFlowShareRental;
        monthPropTaxShare = currentTaxMonthly * userCashFlowShareRental;
        monthRentIncome = inflatedTenantRent * userCashFlowShareRental;

        const rentalInterest = totalInterestForYear * userTaxShareRental;
        const rentalPropertyTax = currentTaxAnnual * userTaxShareRental;
        const rentalHOA = currentHOA * 12 * userTaxShareRental;
        const userShareOfDepreciation =
          annualDepreciation * userTaxShareRental;
        const userShareOfOperatingExpenses =
          currentOpExAnnual * userTaxShareRental;
        const totalRentalDeductions =
          rentalInterest +
          rentalPropertyTax +
          rentalHOA +
          userShareOfDepreciation +
          userShareOfOperatingExpenses;

        const annualRentalIncomeTax =
          inflatedTenantRent * 12 * userTaxShareRental;
        const netRentalIncomeTax =
          annualRentalIncomeTax - totalRentalDeductions;
        monthRentalTaxImpact = includeTaxSavings
          ? (netRentalIncomeTax * marginalRate) / 12
          : 0;

        buyHousingCost =
          monthMortgageShare +
          monthHoaShare +
          monthPropTaxShare +
          monthOpExShare -
          monthRentIncome +
          monthRentalTaxImpact;
      }

      const rentHousingCost = isRental
        ? 0
        : valueInYear(equivalentRent, rentInflation, currentYear);

      const buySurplus = availableForHousing - buyHousingCost;
      const rentSurplus = availableForHousing - rentHousingCost;

      buyBrokerage = buyBrokerage * (1 + monthlyStockRate) + buySurplus;
      rentBrokerage = rentBrokerage * (1 + monthlyStockRate) + rentSurplus;

      totalBuySurplusDeposited += buySurplus;
      totalRentSurplusDeposited += rentSurplus;
      totalBuyHousingSpent += buyHousingCost;
      totalRentHousingSpent += rentHousingCost;

      if (m === selectedYear * 12) {
        finalBuyHousingCost = buyHousingCost;
        finalBuySurplus = buySurplus;
        finalRentHousingCost = rentHousingCost;
        finalRentSurplus = rentSurplus;
        finalMortgageShare = monthMortgageShare;
        finalHoaShare = monthHoaShare;
        finalPropTaxShare = monthPropTaxShare;
        finalTaxShield = monthTaxShield;
        finalRentIncome = monthRentIncome;
        finalIsRental = isRental;
        finalTenantRent = monthTenantRent;
        finalOpExShare = monthOpExShare;
        finalRentalTaxImpact = monthRentalTaxImpact;
      }
    }

    // Home equity
    const finalPropertyVal =
      purchasePrice * Math.pow(1 + appreciation / 100, selectedYear);
    const yearIndex = Math.min(selectedYear - 1, 29);
    const remainingLoanTotal =
      amortizationSchedule.length > 0
        ? amortizationSchedule[yearIndex]?.balance || 0
        : loanAmount;

    const grossEquityTotal = finalPropertyVal - remainingLoanTotal;
    const sellerClosingCostsTotal =
      finalPropertyVal * sellerClosingCostsPercent;

    const userHomeEquity = grossEquityTotal * userEquityShare;
    const userNetProceeds =
      (grossEquityTotal - sellerClosingCostsTotal) * userEquityShare;

    const {
      buyLiquidNetWorth,
      rentNetWorth,
      pathAWins,
      delta,
    } = calculateNetWorthComparison({
      buyBrokerage,
      userNetProceeds,
      rentBrokerage,
    });

    const buyCumulativeReturns =
      buyBrokerage -
      (STARTING_CASH - totalInitialSunkUser) -
      totalBuySurplusDeposited;
    const rentCumulativeReturns =
      rentBrokerage - STARTING_CASH - totalRentSurplusDeposited;

    return {
      STARTING_CASH,
      availableForHousing,
      initialDownPaymentUser,
      initialClosingCostsUser,
      totalInitialSunkUser,
      finalBuyHousingCost,
      finalBuySurplus,
      finalRentHousingCost,
      finalRentSurplus,
      finalMortgageShare,
      finalHoaShare,
      finalPropTaxShare,
      finalTaxShield,
      finalRentIncome,
      finalIsRental,
      finalTenantRent,
      finalOpExShare,
      finalRentalTaxImpact,
      totalBuyHousingSpent,
      totalRentHousingSpent,
      totalBuySurplusDeposited,
      totalRentSurplusDeposited,
      buyBrokerage,
      rentBrokerage,
      buyCumulativeReturns,
      rentCumulativeReturns,
      userHomeEquity,
      userNetProceeds,
      sellerClosingCostsUser: sellerClosingCostsTotal * userEquityShare,
      currentHomeValueUser: finalPropertyVal * userEquityShare,
      remainingLoanUser: remainingLoanTotal * userEquityShare,
      buyLiquidNetWorth,
      rentNetWorth,
      pathAWins,
      delta,
    };
  }, [
    purchasePrice,
    loanAmount,
    mortgage,
    baseHOA,
    basePropertyTaxAnnual,
    hoaInflation,
    appreciation,
    userRent,
    brotherRent,
    tenantRent,
    operatingExpenseRate,
    moveOutYear,
    selectedYear,
    stockMarketReturn,
    equivalentRent,
    rentInflation,
    amortizationSchedule,
    takeHome,
    nonHousingExpenses,
    downPaymentTotal,
    annualDepreciation,
    includeTaxSavings,
    marginalRate,
  ]);

  // ── Reusable line item ──
  const Line = ({ label, amount, bold, dim, tooltip }) => {
    const isPos = amount >= 0;
    const display = isPos
      ? formatCurrency(amount)
      : `-${formatCurrency(Math.abs(amount))}`;

    const valueEl = (
      <span className={isPos ? "positive" : "negative"} style={dim ? { opacity: 0.5 } : undefined}>
        {display}
      </span>
    );

    return (
      <div className="opp-cf-line">
        <span className={bold ? "opp-cf-label-bold" : "opp-cf-label"}>
          {label}
        </span>
        {tooltip ? (
          <MathTooltip ledger={tooltip}>{valueEl}</MathTooltip>
        ) : (
          valueEl
        )}
      </div>
    );
  };

  // Budget bar percentage
  const buyHousingPct = Math.min(
    100,
    Math.max(0, (data.finalBuyHousingCost / data.availableForHousing) * 100)
  );
  const rentHousingPct = Math.min(
    100,
    Math.max(0, (data.finalRentHousingCost / data.availableForHousing) * 100)
  );

  return (
    <div className="tab-fade-in">
      {/* ── Shared Budget Banner ── */}
      <div className="opp-budget-banner">
        <div className="opp-budget-flow">
          <div className="opp-budget-step">
            <span className="opp-budget-step-label">Take-Home</span>
            <span className="opp-budget-step-value">{formatCurrency(takeHome)}</span>
          </div>
          <span className="opp-budget-arrow">→</span>
          <div className="opp-budget-step">
            <span className="opp-budget-step-label">Expenses</span>
            <span className="opp-budget-step-value negative">-{formatCurrency(nonHousingExpenses)}</span>
          </div>
          <span className="opp-budget-arrow">→</span>
          <div className="opp-budget-step opp-budget-step-highlight">
            <span className="opp-budget-step-label">Available</span>
            <span className="opp-budget-step-value" style={{ color: "var(--accent-teal)", fontSize: "1.2rem" }}>
              {formatCurrency(data.availableForHousing)}/mo
            </span>
          </div>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
          Same in both paths — the only question is how much goes to housing vs. investing
        </div>
      </div>

      {/* ── Year Header ── */}
      <div style={{ textAlign: "center", margin: "28px 0 16px" }}>
        <h2 style={{ fontSize: "1.8rem", margin: 0 }}>
          Year {selectedYear} Showdown
        </h2>
      </div>

      {/* ── Side-by-Side Comparison ── */}
      <div className="grid">
        {/* ── PATH A: BUY ── */}
        <div
          className={`card hover-card ${data.pathAWins ? "" : "disabled-card"}`}
          style={{
            border: data.pathAWins
              ? "2px solid #4ade80"
              : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="card-header"
            style={{ color: data.pathAWins ? "#4ade80" : "inherit" }}
          >
            🏠 Path A: Buy the Condo
          </div>
          <div className="card-body">
            {/* Hero number */}
            <div className="opp-hero">
              <span className="opp-hero-label">Monthly to Brokerage</span>
              <span className={`opp-hero-value ${data.finalBuySurplus >= 0 ? "opp-surplus-positive" : "opp-surplus-negative"}`}>
                {data.finalBuySurplus >= 0 ? "+" : ""}{formatCurrency(data.finalBuySurplus)}/mo
              </span>
            </div>

            {/* Budget bar */}
            <div className="opp-bar-container">
              <div className="opp-bar-track">
                <div
                  className="opp-bar-fill opp-bar-housing"
                  style={{ width: `${buyHousingPct}%` }}
                />
                <div
                  className="opp-bar-fill opp-bar-invest"
                  style={{ width: `${Math.max(0, 100 - buyHousingPct)}%` }}
                />
              </div>
              <div className="opp-bar-labels">
                <span><span style={{ color: "var(--negative)" }}>■</span> Housing: {formatCurrency(data.finalBuyHousingCost)}</span>
                <span><span style={{ color: "var(--accent-teal)" }}>■</span> Invest: {formatCurrency(Math.max(0, data.finalBuySurplus))}</span>
              </div>
            </div>

            {/* Housing cost breakdown */}
            <div className="opp-section" style={{ marginTop: "12px" }}>
              <div className="opp-section-title" style={{ color: "#a855f7" }}>
                {data.finalIsRental ? "Rental Costs" : "Housing Costs"} — Year {selectedYear}
              </div>

              <Line
                label="Mortgage (25% share)"
                amount={-data.finalMortgageShare}
                tooltip={`Total mortgage: ${formatCurrency(mortgage)}/mo\nYour 25%: ${formatCurrency(data.finalMortgageShare)}`}
              />
              <Line
                label="HOA (25% share)"
                amount={-data.finalHoaShare}
                tooltip={`HOA inflates ${hoaInflation}%/yr\nYear ${selectedYear}: ${formatCurrency(data.finalHoaShare)}`}
              />
              <Line
                label="Property Tax (25% share)"
                amount={-data.finalPropTaxShare}
                tooltip={`Prop 13: inflates 2%/yr\nYear ${selectedYear}: ${formatCurrency(data.finalPropTaxShare)}`}
              />
              {data.finalIsRental && data.finalOpExShare > 0 && (
                <Line
                  label="Operating Expenses (25%)"
                  amount={-data.finalOpExShare}
                />
              )}
              {!data.finalIsRental && (
                <Line label="Your Rent to Parents" amount={-userRent} />
              )}
              <Line
                label={data.finalIsRental ? "Tenant Income (25%)" : "Rent Pot Back (25%)"}
                amount={data.finalRentIncome}
                tooltip={
                  data.finalIsRental
                    ? `Tenant pays ${formatCurrency(data.finalTenantRent)}/mo\nYour 25%: ${formatCurrency(data.finalRentIncome)}`
                    : `Rent pot: ${formatCurrency(userRent + brotherRent)}/mo\nYour 25% back: ${formatCurrency(data.finalRentIncome)}`
                }
              />
              {!data.finalIsRental && data.finalTaxShield > 0 && (
                <Line
                  label="Tax Shield"
                  amount={data.finalTaxShield}
                  tooltip={`Schedule A: incremental deductions above standard deduction × ${marginalRate * 100}%\nMonthly: ${formatCurrency(data.finalTaxShield)}`}
                />
              )}
              {data.finalIsRental && includeTaxSavings && (
                <Line
                  label={data.finalRentalTaxImpact <= 0 ? "Tax Shield (LLC)" : "Tax Liability"}
                  amount={-data.finalRentalTaxImpact}
                />
              )}

              <div className="opp-cf-divider" />
              <Line
                label="= Net Housing Cost"
                amount={-data.finalBuyHousingCost}
                bold
              />
            </div>

            {/* Cumulative Wealth */}
            <div className="opp-section" style={{ marginTop: "12px" }}>
              <div className="opp-section-title" style={{ color: "#2dd4bf" }}>
                Net Worth — Year {selectedYear}
              </div>

              <Line
                label="Brokerage Account"
                amount={data.buyBrokerage}
                tooltip={`Day 1: ${formatCurrency(data.STARTING_CASH - data.totalInitialSunkUser)}\n+ Deposited: ${formatCurrency(data.totalBuySurplusDeposited)}\n+ Market Returns: ${formatCurrency(data.buyCumulativeReturns)}\n= ${formatCurrency(data.buyBrokerage)}`}
              />
              <Line
                label="Home Equity (net of 6% sale)"
                amount={data.userNetProceeds}
                tooltip={`Home Value (25%): ${formatCurrency(data.currentHomeValueUser)}\n- Loan (25%): ${formatCurrency(data.remainingLoanUser)}\n- Closing (6%): ${formatCurrency(data.sellerClosingCostsUser)}\n= ${formatCurrency(data.userNetProceeds)}`}
              />
              <div className="opp-cf-divider" />
              <div className="opp-cf-line">
                <span className="opp-cf-label-bold" style={{ fontSize: "1.05rem" }}>
                  Total Net Worth
                </span>
                <span className="positive" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                  {formatCurrency(data.buyLiquidNetWorth)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PATH B: RENT ── */}
        <div
          className={`card hover-card ${!data.pathAWins ? "" : "disabled-card"}`}
          style={{
            border: !data.pathAWins
              ? "2px solid #4ade80"
              : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="card-header"
            style={{ color: !data.pathAWins ? "#4ade80" : "inherit" }}
          >
            📈 Path B: Rent & Invest
          </div>
          <div className="card-body">
            {/* Hero number */}
            <div className="opp-hero">
              <span className="opp-hero-label">Monthly to Brokerage</span>
              <span className={`opp-hero-value ${data.finalRentSurplus >= 0 ? "opp-surplus-positive" : "opp-surplus-negative"}`}>
                {data.finalRentSurplus >= 0 ? "+" : ""}{formatCurrency(data.finalRentSurplus)}/mo
              </span>
            </div>

            {/* Budget bar */}
            <div className="opp-bar-container">
              <div className="opp-bar-track">
                <div
                  className="opp-bar-fill opp-bar-housing"
                  style={{ width: `${rentHousingPct}%` }}
                />
                <div
                  className="opp-bar-fill opp-bar-invest"
                  style={{ width: `${Math.max(0, 100 - rentHousingPct)}%` }}
                />
              </div>
              <div className="opp-bar-labels">
                <span><span style={{ color: "var(--negative)" }}>■</span> Rent: {formatCurrency(data.finalRentHousingCost)}</span>
                <span><span style={{ color: "var(--accent-teal)" }}>■</span> Invest: {formatCurrency(Math.max(0, data.finalRentSurplus))}</span>
              </div>
            </div>

            {/* Housing cost breakdown */}
            <div className="opp-section" style={{ marginTop: "12px" }}>
              <div className="opp-section-title" style={{ color: "#a855f7" }}>
                Housing Costs — Year {selectedYear}
              </div>

              {data.finalRentHousingCost > 0 ? (
                <Line
                  label="Monthly Rent"
                  amount={-data.finalRentHousingCost}
                  tooltip={`Base: ${formatCurrency(equivalentRent)}/mo\nInflated ${rentInflation}%/yr for ${selectedYear} yr(s)\nYear ${selectedYear}: ${formatCurrency(data.finalRentHousingCost)}/mo`}
                />
              ) : (
                <div className="opp-cf-line">
                  <span className="opp-cf-label" style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
                    No rent (post move-out)
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>$0</span>
                </div>
              )}

              <div className="opp-cf-divider" />
              <Line
                label="= Net Housing Cost"
                amount={-data.finalRentHousingCost}
                bold
              />
            </div>

            {/* Cumulative Wealth */}
            <div className="opp-section" style={{ marginTop: "12px" }}>
              <div className="opp-section-title" style={{ color: "#2dd4bf" }}>
                Net Worth — Year {selectedYear}
              </div>

              <Line
                label="Brokerage Account"
                amount={data.rentBrokerage}
                tooltip={`Day 1: ${formatCurrency(data.STARTING_CASH)} (full — no down payment)\n+ Deposited: ${formatCurrency(data.totalRentSurplusDeposited)}\n+ Market Returns: ${formatCurrency(data.rentCumulativeReturns)}\n= ${formatCurrency(data.rentBrokerage)}`}
              />
              <div className="opp-cf-divider" />
              <div className="opp-cf-line">
                <span className="opp-cf-label-bold" style={{ fontSize: "1.05rem" }}>
                  Total Net Worth
                </span>
                <span className="positive" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                  {formatCurrency(data.rentNetWorth)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Verdict ── */}
      <div
        className="card"
        style={{
          marginTop: "24px",
          textAlign: "center",
          background: "rgba(15, 23, 42, 0.8)",
        }}
      >
        <h3 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>
          {data.pathAWins ? "🏠 Buying Wins!" : "📈 Renting Wins!"}
        </h3>
        <p style={{ fontSize: "1.1rem", color: "#cbd5e1" }}>
          By Year {selectedYear},{" "}
          {data.pathAWins ? "buying the condo" : "renting and investing"} puts
          you ahead by{" "}
          <strong style={{ color: "#4ade80", fontSize: "1.3rem" }}>
            {formatCurrency(data.delta)}
          </strong>
        </p>
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div className="opp-verdict-stat">
            <span className="opp-verdict-label">Total Housing Spent (Buy)</span>
            <span className="negative">
              {formatCurrency(data.totalBuyHousingSpent)}
            </span>
          </div>
          <div className="opp-verdict-stat">
            <span className="opp-verdict-label">Total Rent Spent</span>
            <span className="negative">
              {formatCurrency(data.totalRentHousingSpent)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpportunityCostTab;
