import React, { useState, useMemo } from "react";
import { TrendingUp, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "./utils";
import { projectLongTerm, SECTION_121_EXCLUSION } from "./financialModel";

function LongTermTab({
  selectedYear,
  purchasePrice,
  amortizationSchedule,
  baseHOA,
  hoaInflation,
  appreciation,
  moveOutYear,
  owners,
}) {
  const [showFullTable, setShowFullTable] = useState(false);
  // Each owner on title who lived there gets their own exclusion.
  const exclusionOwners = owners.filter((o) => o.title > 0 && o.rent > 0).length;

  const projectionData = useMemo(
    () =>
      projectLongTerm({
        purchasePrice,
        amortizationSchedule,
        baseHOA,
        hoaInflation,
        appreciation,
        moveOutYear,
        owners,
      }),
    [purchasePrice, amortizationSchedule, baseHOA, hoaInflation, appreciation, moveOutYear, owners],
  );

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
          <TrendingUp className="icon" /> Long-term forecast
        </h2>

        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          The values below reflect the global settings in your control panel
          (Appreciation: {appreciation}%, HOA Inflation: {hoaInflation}%,
          Move-out: year {moveOutYear}).
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
                color: "var(--text-primary)",
                marginBottom: "12px",
                fontSize: "1.1rem",
              }}
            >
              HOA Growth ({hoaInflation}%/yr)
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div
                style={{
                  background: "color-mix(in srgb, var(--rental) 6%, transparent)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid color-mix(in srgb, var(--rental) 20%, transparent)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  HOA today
                </div>
                <div style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                  {formatCurrency(baseHOA)}/mo
                </div>
              </div>
              <div
                style={{
                  background: "color-mix(in srgb, var(--rental) 6%, transparent)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid color-mix(in srgb, var(--rental) 20%, transparent)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Year 10
                </div>
                <div style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                  {formatCurrency(year10?.monthlyHOA || 0)}/mo
                </div>
              </div>
              <div
                style={{
                  background: "color-mix(in srgb, var(--rental) 6%, transparent)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid color-mix(in srgb, var(--rental) 30%, transparent)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Year 30
                </div>
                <div style={{ color: "var(--rental)", fontWeight: "bold" }}>
                  {formatCurrency(year30?.monthlyHOA || 0)}/mo
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <h3
              style={{
                color: "var(--text-primary)",
                marginBottom: "12px",
                fontSize: "1.1rem",
              }}
            >
              Property Value ({appreciation}%/yr)
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div
                style={{
                  background: "color-mix(in srgb, var(--info) 6%, transparent)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid color-mix(in srgb, var(--info) 20%, transparent)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Today
                </div>
                <div style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                  {formatCurrency(purchasePrice)}
                </div>
              </div>
              <div
                style={{
                  background: "color-mix(in srgb, var(--info) 6%, transparent)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid color-mix(in srgb, var(--info) 20%, transparent)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Year 10
                </div>
                <div style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                  {formatCurrency(year10?.marketValue || 0)}
                </div>
              </div>
              <div
                style={{
                  background: "color-mix(in srgb, var(--info) 6%, transparent)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Year 30
                </div>
                <div style={{ color: "var(--info)", fontWeight: "bold" }}>
                  {formatCurrency(year30?.marketValue || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 121 Explainer */}
      <div className="card" style={{ marginBottom: "24px", display: "flex", gap: "12px", background: "color-mix(in srgb, var(--info) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)" }}>
        <Info color="var(--info)" size={28} style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <h2 style={{ marginTop: 0 }}>Section 121 tax-free capital gains window</h2>
          <p>
            The IRS lets each owner on title exclude up to $250,000 of gain if
            they lived in the home for 2 of the 5 years before selling. This
            scenario has {exclusionOwners} qualifying{" "}
            {exclusionOwners === 1 ? "owner" : "owners"} (on title and paying
            rent), each up to {formatCurrency(SECTION_121_EXCLUSION)} of their own share of
            the gain.
          </p>
          <p style={{ color: "var(--negative)", marginTop: "8px", marginBottom: 0 }}>
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
            <TrendingUp className="icon" /> 30-year projection
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
              background: showFullTable ? "color-mix(in srgb, var(--info) 6%, transparent)" : "color-mix(in srgb, var(--ink) 5%, transparent)",
              borderColor: showFullTable ? "color-mix(in srgb, var(--info) 30%, transparent)" : "color-mix(in srgb, var(--ink) 10%, transparent)",
              color: showFullTable ? "var(--info)" : "var(--text-secondary)",
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
                <th>Market value</th>
                <th>Loan balance</th>
                <th>Equity</th>
                <th>Monthly HOA</th>
                <th>Cumulative HOA increase</th>
                <th>Appreciation gain</th>
                <th>Net position</th>
                <th>Section 121</th>
                <th>Taxable gain</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                  const isCurrentMoveOut = row.year === moveOutYear;
                  const isDeadline = row.year === moveOutYear + 3;
                  const isExpired = row.section121Status === "expired";

                  let rowBg = "transparent";
                  if (isCurrentMoveOut) rowBg = "color-mix(in srgb, var(--warning) 15%, transparent)";
                  else if (isDeadline) rowBg = "color-mix(in srgb, var(--negative) 15%, transparent)";
                  else if (row.section121Status === "eligible")
                    rowBg = "color-mix(in srgb, var(--positive) 8%, transparent)";
                  else if (isExpired) rowBg = "color-mix(in srgb, var(--negative) 5%, transparent)";

                return (
                  <tr key={row.year} style={{ background: rowBg }}>
                    <td style={row.year === selectedYear ? { fontWeight: 700, color: "var(--accent-blue)" } : undefined}>
                      Year {row.year}
                      {isCurrentMoveOut && " · move-out"}
                      {isDeadline && " · last year to sell"}
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
                        <span style={{ color: "var(--info)" }}>Living there</span>
                      )}
                      {row.section121Status === "eligible" && (
                        <span style={{ color: "var(--positive)" }}>
                          <CheckCircle
                            size={14}
                            style={{ verticalAlign: "middle" }}
                          />{" "}
                          Eligible
                        </span>
                      )}
                      {row.section121Status === "too-soon" && (
                        <span style={{ color: "var(--text-secondary)" }}>Under 2 yrs</span>
                      )}
                      {row.section121Status === "expired" && (
                        <span style={{ color: "var(--negative)" }}>
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
                        <span style={{ color: "var(--text-secondary)" }}>—</span>
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
          <div className="card-header">HOA growth impact</div>
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
              <span>Extra HOA paid over 30 years</span>{" "}
              <span className="negative">
                {formatCurrency(year30?.cumulativeHOAIncrease || 0)}
              </span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Equity milestones</div>
          <div className="card-body">
            <div className="row">
              <span>Year 5 equity</span>{" "}
              <span className="positive">
                {formatCurrency(year5?.equity || 0)}
              </span>
            </div>
            <div className="row">
              <span>Year 15 equity</span>{" "}
              <span className="positive">
                {formatCurrency(year15?.equity || 0)}
              </span>
            </div>
            <div className="row">
              <span>Year 30 equity</span>{" "}
              <span className="positive">
                {formatCurrency(year30?.equity || 0)}
              </span>
            </div>
            <div className="divider" style={{ margin: "8px 0" }} />
            <div className="row">
              <span>Appreciation over 30 years</span>{" "}
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
