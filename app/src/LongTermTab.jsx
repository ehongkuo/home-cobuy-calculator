import React, { useState, useMemo } from "react";
import { TrendingUp, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "./utils";

function LongTermTab({
  selectedYear,
  purchasePrice,
  amortizationSchedule,
  baseHOA,
  basePropertyTaxAnnual,
  hoaInflation,
  appreciation,
  moveOutYear,
  exclusionOwners = 2,
}) {
  const [showFullTable, setShowFullTable] = useState(false);

  const projectionData = useMemo(() => {
    const rows = [];
    let currentHOAAnnual = baseHOA * 12;
    let currentPropertyTax = basePropertyTaxAnnual;
    const baseHOAAnnual = baseHOA * 12;

    let cumulativeHOAPaid = 0;
    let cumulativeBaseHOA = 0;

    for (let year = 1; year <= 30; year++) {
      const marketValue =
        purchasePrice * Math.pow(1 + appreciation / 100, year);
      const amortRow = amortizationSchedule[year - 1] || { balance: 0 };
      const loanBalance = amortRow.balance;
      const equity = marketValue - loanBalance;

      // HOA compounds from year 2 onward
      if (year > 1) {
        currentHOAAnnual = currentHOAAnnual * (1 + hoaInflation / 100);
      }

      // Prop 13: property tax grows max 2%/yr from year 2 onward
      if (year > 1) {
        currentPropertyTax = currentPropertyTax * 1.02;
      }

      // Cumulative HOA tracking
      cumulativeHOAPaid += currentHOAAnnual;
      cumulativeBaseHOA += baseHOAAnnual;
      const cumulativeHOAIncrease = cumulativeHOAPaid - cumulativeBaseHOA;

      // Appreciation gain
      const appreciationGain = marketValue - purchasePrice;

      // Section 121: must have lived there 2 of the 5 years before the sale.
      let section121Status;
      if (year < 2) {
        section121Status = "too-soon";
      } else if (year <= moveOutYear) {
        section121Status = "living";
      } else if (year <= moveOutYear + 3) {
        section121Status = "eligible";
      } else {
        section121Status = "expired";
      }
      const excluded =
        section121Status === "living" || section121Status === "eligible";

      const capitalGain = marketValue - purchasePrice;
      const exclusionPerPerson = 250000;
      const totalExclusion = exclusionPerPerson * exclusionOwners; // each resident on title
      const taxableGain = excluded
        ? Math.max(0, capitalGain - totalExclusion)
        : Math.max(0, capitalGain);

      // Net position: appreciation gain minus the extra HOA you paid due to inflation
      const netPosition = appreciationGain - cumulativeHOAIncrease;

      rows.push({
        year,
        marketValue,
        loanBalance,
        equity,
        annualHOA: currentHOAAnnual,
        monthlyHOA: currentHOAAnnual / 12,
        annualPropertyTax: currentPropertyTax,
        section121Status,
        capitalGain,
        taxableGain,
        cumulativeHOAPaid,
        cumulativeHOAIncrease,
        appreciationGain,
        netPosition,
      });
    }
    return rows;
  }, [
    purchasePrice,
    amortizationSchedule,
    baseHOA,
    basePropertyTaxAnnual,
    hoaInflation,
    appreciation,
    moveOutYear,
    exclusionOwners,
  ]);

  // Quick-access rows for the summary cards
  const year5 = projectionData[4];
  const year10 = projectionData[9];
  const year15 = projectionData[14];
  const year30 = projectionData[29];

  // Determine which rows to show
  const summaryYears = new Set([5, 10, 15, 30, selectedYear]);
  summaryYears.add(moveOutYear);
  summaryYears.add(moveOutYear + 3);

  const displayRows = showFullTable
    ? projectionData
    : projectionData.filter((row) => summaryYears.has(row.year));

  return (
    <div className="tab-fade-in">
      {/* Immediate feedback panels */}
      <div className="card controls-card" style={{ marginBottom: "24px" }}>
        <h2>
          <TrendingUp className="icon" /> Long-Term Forecasting
        </h2>

        <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
          The values below reflect the global settings in your control panel
          (Appreciation: {appreciation}%, HOA Inflation: {hoaInflation}%,
          Move-Out: Year {moveOutYear}).
        </p>

        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div style={{ flex: 1, minWidth: "200px" }}>
            <h3
              style={{
                color: "#e2e8f0",
                marginBottom: "12px",
                fontSize: "1.1rem",
              }}
            >
              HOA Growth ({hoaInflation}%/yr)
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div
                style={{
                  background: "rgba(168, 85, 247, 0.1)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  HOA Today
                </div>
                <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>
                  {formatCurrency(baseHOA)}/mo
                </div>
              </div>
              <div
                style={{
                  background: "rgba(168, 85, 247, 0.1)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  Year 10
                </div>
                <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>
                  {formatCurrency(year10?.monthlyHOA || 0)}/mo
                </div>
              </div>
              <div
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  Year 30
                </div>
                <div style={{ color: "#a855f7", fontWeight: "bold" }}>
                  {formatCurrency(year30?.monthlyHOA || 0)}/mo
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <h3
              style={{
                color: "#e2e8f0",
                marginBottom: "12px",
                fontSize: "1.1rem",
              }}
            >
              Property Value ({appreciation}%/yr)
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div
                style={{
                  background: "rgba(96, 165, 250, 0.1)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  Today
                </div>
                <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>
                  {formatCurrency(purchasePrice)}
                </div>
              </div>
              <div
                style={{
                  background: "rgba(96, 165, 250, 0.1)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  Year 10
                </div>
                <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>
                  {formatCurrency(year10?.marketValue || 0)}
                </div>
              </div>
              <div
                style={{
                  background: "rgba(96, 165, 250, 0.15)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(96, 165, 250, 0.3)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  Year 30
                </div>
                <div style={{ color: "#60a5fa", fontWeight: "bold" }}>
                  {formatCurrency(year30?.marketValue || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 121 Explainer */}
      <div className="card" style={{ marginBottom: "24px", display: "flex", gap: "12px", background: "rgba(96, 165, 250, 0.1)", border: "1px solid rgba(96, 165, 250, 0.3)" }}>
        <Info color="#60a5fa" size={28} style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <h2 style={{ marginTop: 0 }}>Section 121 Tax-Free Capital Gains Window</h2>
          <p>
            The IRS lets each owner on title exclude up to $250,000 of gain if
            they lived in the home for 2 of the 5 years before selling. This
            scenario has {exclusionOwners} qualifying{" "}
            {exclusionOwners === 1 ? "owner" : "owners"} (on title and paying
            rent), so up to {formatCurrency(250000 * exclusionOwners)} combined.
          </p>
          <p style={{ color: "#f87171", marginTop: "8px", marginBottom: 0 }}>
            Moving out after <strong>Year {moveOutYear}</strong> starts the clock
            — you have until the end of <strong>Year {moveOutYear + 3}</strong>{" "}
            to sell and still qualify. Depreciation claimed while renting is
            recaptured and is not covered by the exclusion.
          </p>
        </div>
      </div>

      {/* Projection Table */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ margin: 0 }}>
            <TrendingUp className="icon" /> 30-Year Projection
          </h2>
          <button
            onClick={() => setShowFullTable(!showFullTable)}
            className="topbar-badge"
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.8rem",
              background: showFullTable ? "rgba(96, 165, 250, 0.15)" : "rgba(255, 255, 255, 0.05)",
              borderColor: showFullTable ? "rgba(96, 165, 250, 0.3)" : "rgba(255, 255, 255, 0.1)",
              color: showFullTable ? "#60a5fa" : "#94a3b8",
              border: "1px solid",
              padding: "6px 12px",
              borderRadius: "6px",
            }}
          >
            {showFullTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showFullTable ? "Show Key Years" : "Show All 30 Years"}
          </button>
        </div>
        <div className="table-wrapper">
          <table className="amort-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Market Value</th>
                <th>Loan Balance</th>
                <th>Equity</th>
                <th>Monthly HOA</th>
                <th style={{ color: "#a855f7" }}>Cumul. HOA Increase</th>
                <th style={{ color: "#60a5fa" }}>Appreciation Gain</th>
                <th style={{ color: "#2dd4bf" }}>Net Position</th>
                <th>Section 121</th>
                <th>Taxable Gain</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                  const isCurrentMoveOut = row.year === moveOutYear;
                  const isDeadline = row.year === moveOutYear + 3;
                  const isExpired = row.section121Status === "expired";

                  let rowBg = "transparent";
                  if (isCurrentMoveOut) rowBg = "rgba(251, 191, 36, 0.15)";
                  else if (isDeadline) rowBg = "rgba(248, 113, 113, 0.15)";
                  else if (row.section121Status === "eligible")
                    rowBg = "rgba(74, 222, 128, 0.08)";
                  else if (isExpired) rowBg = "rgba(248, 113, 113, 0.05)";

                return (
                  <tr key={row.year} style={{ background: rowBg }}>
                    <td style={row.year === selectedYear ? { fontWeight: 700, color: "var(--accent-blue)" } : undefined}>
                      Year {row.year}
                      {isCurrentMoveOut && " 🚚"}
                      {isDeadline && " ⏰"}
                    </td>
                    <td>{formatCurrency(row.marketValue)}</td>
                    <td>{formatCurrency(row.loanBalance)}</td>
                    <td className="positive">{formatCurrency(row.equity)}</td>
                    <td>{formatCurrency(row.monthlyHOA)}</td>
                    <td>
                      <span className="negative">
                        {row.cumulativeHOAIncrease > 0
                          ? `-${formatCurrency(row.cumulativeHOAIncrease)}`
                          : formatCurrency(0)}
                      </span>
                    </td>
                    <td>
                      <span className={row.appreciationGain >= 0 ? "positive" : "negative"}>
                        {row.appreciationGain >= 0 ? "+" : ""}{formatCurrency(row.appreciationGain)}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: row.netPosition >= 0 ? "var(--accent-teal)" : "var(--negative)",
                          fontWeight: 600,
                        }}
                      >
                        {row.netPosition >= 0 ? "+" : ""}{formatCurrency(row.netPosition)}
                      </span>
                    </td>
                    <td>
                      {row.section121Status === "living" && (
                        <span style={{ color: "#60a5fa" }}>🏠 Living</span>
                      )}
                      {row.section121Status === "eligible" && (
                        <span style={{ color: "#4ade80" }}>
                          <CheckCircle
                            size={14}
                            style={{ verticalAlign: "middle" }}
                          />{" "}
                          Eligible
                        </span>
                      )}
                      {row.section121Status === "too-soon" && (
                        <span style={{ color: "#94a3b8" }}>Under 2 yrs</span>
                      )}
                      {row.section121Status === "expired" && (
                        <span style={{ color: "#f87171" }}>
                          <XCircle
                            size={14}
                            style={{ verticalAlign: "middle" }}
                          />{" "}
                          Expired
                        </span>
                      )}
                    </td>
                    <td>
                      {row.capitalGain <= 0 ? (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      ) : row.taxableGain === 0 ? (
                        <span className="positive">
                          {formatCurrency(0)} (excluded!)
                        </span>
                      ) : (
                        <span className={row.taxableGain > 0 ? "negative" : "positive"}>
                          {formatCurrency(row.taxableGain)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="grid" style={{ marginBottom: "24px" }}>
        <div className="card">
          <div className="card-header">HOA Growth Impact</div>
          <div className="card-body">
            <div className="row">
              <span>Year 1 HOA:</span> <span>{formatCurrency(baseHOA)}/mo</span>
            </div>
            <div className="row">
              <span>Year 15 HOA:</span>{" "}
              <span>{formatCurrency(year15?.monthlyHOA || 0)}/mo</span>
            </div>
            <div className="row">
              <span>Year 30 HOA:</span>{" "}
              <span className="negative">
                {formatCurrency(year30?.monthlyHOA || 0)}/mo
              </span>
            </div>
            <div className="divider" style={{ margin: "8px 0" }} />
            <div className="row">
              <span>30yr Extra HOA Paid:</span>{" "}
              <span className="negative">
                {formatCurrency(year30?.cumulativeHOAIncrease || 0)}
              </span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Equity Milestones</div>
          <div className="card-body">
            <div className="row">
              <span>Year 5 Equity:</span>{" "}
              <span className="positive">
                {formatCurrency(year5?.equity || 0)}
              </span>
            </div>
            <div className="row">
              <span>Year 15 Equity:</span>{" "}
              <span className="positive">
                {formatCurrency(year15?.equity || 0)}
              </span>
            </div>
            <div className="row">
              <span>Year 30 Equity:</span>{" "}
              <span className="positive">
                {formatCurrency(year30?.equity || 0)}
              </span>
            </div>
            <div className="divider" style={{ margin: "8px 0" }} />
            <div className="row">
              <span>30yr Appreciation:</span>{" "}
              <span className="positive">
                +{formatCurrency(year30?.appreciationGain || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LongTermTab;
