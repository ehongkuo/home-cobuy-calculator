import React, { useMemo } from "react";
import MathTooltip from "./MathTooltip";
import { formatCurrency } from "./utils";
import { calculateBuyVsRent, TAX_ASSUMPTIONS } from "./financialModel";

function OpportunityCostTab({
  purchasePrice,
  loanAmount,
  mortgage, // monthly
  baseHOA, // monthly
  basePropertyTaxAnnual, // annual
  hoaInflation, // percentage
  appreciation, // percentage
  youShare, // your equity share of costs, rent and proceeds
  youTitleShare, // your share of the title, for tax deductions
  youRent, // your monthly rent contribution during owner-occupied
  ownerRentTotal, // all residents' rent during owner-occupied
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

  const sharePct = `${Number((youShare * 100).toFixed(2))}%`;
  const marginalRate = TAX_ASSUMPTIONS.marginalRate;

  const data = useMemo(
    () =>
      calculateBuyVsRent({
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
        includeTaxSavings,
      }),
    [
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
      includeTaxSavings,
    ],
  );

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
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
          Year {selectedYear} comparison
        </h2>
      </div>

      {/* ── Side-by-Side Comparison ── */}
      <div className="grid">
        {/* ── PATH A: BUY ── */}
        <div
          className={`card hover-card ${data.pathAWins ? "" : "disabled-card"}`}
          style={{
            border: data.pathAWins
              ? "2px solid var(--positive)"
              : "1px solid color-mix(in srgb, var(--ink) 8%, transparent)",
          }}
        >
          <div
            className="card-header"
            style={{ color: data.pathAWins ? "var(--positive)" : "inherit" }}
          >
            Path A: Buy
          </div>
          <div className="card-body">
            {/* Hero number */}
            <div className="opp-hero">
              <span className="opp-hero-label">Monthly to brokerage</span>
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
              <div className="opp-section-title" style={{ color: "var(--rental)" }}>
                {data.finalIsRental ? "Rental Costs" : "Housing Costs"} — Year {selectedYear}
              </div>

              <Line
                label={`Mortgage (${sharePct} share)`}
                amount={-data.finalMortgageShare}
                tooltip={`Total mortgage: ${formatCurrency(mortgage)}/mo\nYour ${sharePct}: ${formatCurrency(data.finalMortgageShare)}`}
              />
              <Line
                label={`HOA (${sharePct} share)`}
                amount={-data.finalHoaShare}
                tooltip={`HOA inflates ${hoaInflation}%/yr\nYear ${selectedYear}: ${formatCurrency(data.finalHoaShare)}`}
              />
              <Line
                label={`Property tax (${sharePct} share)`}
                amount={-data.finalPropTaxShare}
                tooltip={`Prop 13: inflates 2%/yr\nYear ${selectedYear}: ${formatCurrency(data.finalPropTaxShare)}`}
              />
              {data.finalIsRental && data.finalOpExShare > 0 && (
                <Line
                  label={`Operating Expenses (${sharePct})`}
                  amount={-data.finalOpExShare}
                />
              )}
              {!data.finalIsRental && (
                <Line label="Your rent payment" amount={-youRent} />
              )}
              <Line
                label={data.finalIsRental ? `Tenant income (${sharePct})` : `Rent pot back (${sharePct})`}
                amount={data.finalRentIncome}
                tooltip={
                  data.finalIsRental
                    ? `Tenant pays ${formatCurrency(data.finalTenantRent)}/mo\nYour ${sharePct}: ${formatCurrency(data.finalRentIncome)}`
                    : `Rent pot: ${formatCurrency(ownerRentTotal)}/mo\nYour ${sharePct} back: ${formatCurrency(data.finalRentIncome)}`
                }
              />
              {!data.finalIsRental && data.finalTaxShield > 0 && (
                <Line
                  label="Tax shield"
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
                label="= Net housing cost"
                amount={-data.finalBuyHousingCost}
                bold
              />
            </div>

            {/* Cumulative Wealth */}
            <div className="opp-section" style={{ marginTop: "12px" }}>
              <div className="opp-section-title" style={{ color: "var(--positive)" }}>
                Net worth, year {selectedYear}
              </div>

              <Line
                label="Brokerage account"
                amount={data.buyBrokerage}
                tooltip={`Day 1: ${formatCurrency(data.STARTING_CASH - data.totalInitialSunkUser)}\n+ Deposited: ${formatCurrency(data.totalBuySurplusDeposited)}\n+ Market Returns: ${formatCurrency(data.buyCumulativeReturns)}\n= ${formatCurrency(data.buyBrokerage)}`}
              />
              <Line
                label="Home equity (after 6% selling costs)"
                amount={data.userNetProceeds}
                tooltip={`Home Value (${sharePct}): ${formatCurrency(data.currentHomeValueUser)}\n- Loan (${sharePct}): ${formatCurrency(data.remainingLoanUser)}\n- Closing (6%): ${formatCurrency(data.sellerClosingCostsUser)}\n- Tax on sale: ${formatCurrency(data.saleTaxUser)}\n= ${formatCurrency(data.userNetProceeds)}`}
              />
              <div className="opp-cf-divider" />
              <div className="opp-cf-line">
                <span className="opp-cf-label-bold" style={{ fontSize: "1.05rem" }}>
                  Total net worth
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
              ? "2px solid var(--positive)"
              : "1px solid color-mix(in srgb, var(--ink) 8%, transparent)",
          }}
        >
          <div
            className="card-header"
            style={{ color: !data.pathAWins ? "var(--positive)" : "inherit" }}
          >
            Path B: Rent and invest
          </div>
          <div className="card-body">
            {/* Hero number */}
            <div className="opp-hero">
              <span className="opp-hero-label">Monthly to brokerage</span>
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
              <div className="opp-section-title" style={{ color: "var(--rental)" }}>
                Housing costs, year {selectedYear}
              </div>

              {data.finalRentHousingCost > 0 ? (
                <Line
                  label="Monthly rent"
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
                label="= Net housing cost"
                amount={-data.finalRentHousingCost}
                bold
              />
            </div>

            {/* Cumulative Wealth */}
            <div className="opp-section" style={{ marginTop: "12px" }}>
              <div className="opp-section-title" style={{ color: "var(--positive)" }}>
                Net worth, year {selectedYear}
              </div>

              <Line
                label="Brokerage account"
                amount={data.rentBrokerage}
                tooltip={`Day 1: ${formatCurrency(data.STARTING_CASH)} (full — no down payment)\n+ Deposited: ${formatCurrency(data.totalRentSurplusDeposited)}\n+ Market Returns: ${formatCurrency(data.rentCumulativeReturns)}\n= ${formatCurrency(data.rentBrokerage)}`}
              />
              <div className="opp-cf-divider" />
              <div className="opp-cf-line">
                <span className="opp-cf-label-bold" style={{ fontSize: "1.05rem" }}>
                  Total net worth
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
          background: "var(--surface)",
        }}
      >
        <h3 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>
          {data.pathAWins ? "Buying comes out ahead" : "Renting comes out ahead"}
        </h3>
        <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>
          By year {selectedYear},{" "}
          {data.pathAWins ? "buying the condo" : "renting and investing"} puts
          you ahead by{" "}
          <strong style={{ color: "var(--positive)", fontSize: "1.3rem" }}>
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
            <span className="opp-verdict-label">Total rent spent</span>
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
