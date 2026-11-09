import React from "react";
import { Info } from "lucide-react";
import { formatCurrency } from "./utils";
import { paymentBreakdown } from "./financialModel";

const pct = (share) => `${Number((share * 100).toFixed(2))}%`;

// Annual exclusion if a married couple gifts to two recipients (2 × 2 × $19k).
const GIFT_EXCLUSION_LIMIT = 76000;

// Payment components, darkest first so the bar reads without color.
const COST_COLORS = {
  interest: "var(--series-1)",
  hoa: "var(--series-2)",
  propertyTax: "var(--series-3)",
  opex: "var(--series-5)",
  principal: "var(--series-4)",
};
const COST_ORDER = ["interest", "hoa", "propertyTax", "opex", "principal"];

// A single stacked bar with a legend underneath.
function StackedBar({ label, parts, total }) {
  return (
    <div
      className="stacked-bar"
      role="img"
      aria-label={`${label}: ${parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}`}
    >
      {parts.map((p) => (
        <div key={p.id} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  );
}

const Swatch = ({ color, round = false }) => (
  <span className={`swatch${round ? " is-round" : ""}`} style={{ background: color }} aria-hidden="true" />
);

function CashFlowTab({
  isRental,
  owners,
  includeTaxSavings,
  totalRent,
  mortgage,
  monthlyInterest,
  monthlyPrincipal,
  propertyTax,
  hoa,
  totalOperatingExpenses,
  cashToClose,
  onShowLoan,
  rentPanel,
}) {
  const opExMonthly = (totalOperatingExpenses || 0) / 12;

  // Split the level payment into interest and principal for the selected year.
  const paidThisYear = monthlyInterest + monthlyPrincipal;
  const interestPortion = paidThisYear > 0 ? mortgage * (monthlyInterest / paidThisYear) : 0;
  const flow = paymentBreakdown({
    totalRent,
    costs: {
      interest: interestPortion,
      principal: paidThisYear > 0 ? mortgage - interestPortion : 0,
      propertyTax,
      hoa,
      opex: isRental ? opExMonthly : 0,
    },
  });
  const costs = flow.parts
    .sort((a, b) => COST_ORDER.indexOf(a.id) - COST_ORDER.indexOf(b.id))
    .map((c) => ({ ...c, color: COST_COLORS[c.id] }));
  const coverage = flow.totalCosts > 0 ? totalRent / flow.totalCosts : 1;
  const residents = owners.filter((o) => o.rent > 0);
  const rentSource = isRental
    ? "from the tenant"
    : `from ${residents.length === 1 ? "one resident" : `${residents.length} residents`}`;
  const gap = flow.topUp || flow.surplus;
  const funding = [
    { id: "rent", label: "Rent pot", value: Math.min(totalRent, flow.totalCosts), color: "var(--series-1)" },
    { id: "topUp", label: "Owner top-up", value: flow.topUp, color: "var(--series-5)" },
  ].filter((f) => f.value > 0.005);
  const you = owners.find((o) => o.isYou) ?? owners[0];
  const youLabel = you.name === "You" ? "Your" : `${you.name}'s`;

  // Owners off the title who cover a shortfall are effectively gifting to the others.
  const gifts = owners
    .filter((o) => o.title <= 0)
    .map((o) => ({ ...o, annual: (o.expenses - o.rentIncome + o.rentPaid) * 12 }))
    .filter((o) => o.annual > GIFT_EXCLUSION_LIMIT);

  return (
    <div className="tab-fade-in cashflow">
      <section className="stat-row" aria-label="Summary">
        <div className="stat">
          <div className="stat-label">Total monthly payment</div>
          <div className="stat-value">{formatCurrency(flow.totalCosts)}</div>
          <div className="stat-note">Mortgage, property tax{isRental ? ", HOA and operating costs" : " and HOA"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Covered by rent</div>
          <div className="stat-value">{Math.round(coverage * 100)}%</div>
          <div className="stat-note">{formatCurrency(totalRent)} {rentSource}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{flow.topUp > 0 ? "Owner top-up" : "Surplus to owners"}</div>
          <div className="stat-value">{formatCurrency(gap)}</div>
          <div className="stat-note">Split by equity share</div>
        </div>
        <div className="stat is-you">
          <div className="stat-label">{youLabel} net per month</div>
          <div className="stat-value">{formatCurrency(you.net)}</div>
          <div className="stat-note">
            {includeTaxSavings && you.taxShield
              ? `Includes ${formatCurrency(Math.abs(you.taxShield))} tax ${you.taxShield > 0 ? "savings" : "cost"}`
              : "Before tax effects"}
          </div>
        </div>
      </section>

      <div className="split-row">
      <section className="card split-main" aria-labelledby="where-title">
        <h2 id="where-title" className="card-header">Where the payment goes</h2>
        <p className="card-subtitle">{formatCurrency(flow.totalCosts)} per month, {isRental ? "rental" : "owner-occupied"}</p>
        <StackedBar label="Payment breakdown" parts={costs} total={flow.totalCosts} />
        <table className="ledger-table">
          <tbody>
            {costs.map((c) => (
              <tr key={c.id}>
                <td><Swatch color={c.color} />{c.label}</td>
                <td className="r muted">{Math.round((c.value / flow.totalCosts) * 100)}%</td>
                <td className="r strong">{formatCurrency(c.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="card-subheader">How it is funded</h3>
        {funding.length > 0 && (
          <StackedBar label="Funding" parts={funding} total={flow.totalCosts} />
        )}
        <div className="bar-legend">
          {funding.map((f) => (
            <span key={f.id}><Swatch color={f.color} />{f.label} <strong>{formatCurrency(f.value)}</strong></span>
          ))}
          {flow.surplus > 0.005 && (
            <span>Surplus paid out <strong className="positive">{formatCurrency(flow.surplus)}</strong></span>
          )}
        </div>
      </section>
      <div className="split-side">{rentPanel}</div>
      </div>

      {gifts.map((o) => (
        <div key={o.id} className="notice is-warning" role="note">
          <Info size={20} aria-hidden="true" />
          <div>
            <h3>Gift tax notice</h3>
            <p>
              {o.name} is not on the title and contributes a net <strong>{formatCurrency(o.annual)}</strong> a year, above the <strong>{formatCurrency(GIFT_EXCLUSION_LIMIT)}</strong> annual gift exclusion for two donors and two recipients. If that shortfall is a gift, Form 709 is required (usually no tax owed; it reduces the lifetime exemption).
            </p>
          </div>
        </div>
      ))}

      <section className="card is-flush" aria-labelledby="owner-flows-title">
        <div className="card-head-row">
          <div>
            <h2 id="owner-flows-title" className="card-header">Each owner, per month</h2>
            <p className="card-subtitle">Costs and rent income split by equity. Tax effects follow title share.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="ledger-table has-head stacks-on-phone">
            <thead>
              <tr>
                <th>Owner</th>
                <th className="r">Equity</th>
                <th className="r">Share of costs</th>
                {residents.length > 0 && !isRental && <th className="r">Rent paid</th>}
                <th className="r">Rent income</th>
                {includeTaxSavings && <th className="r">Tax effect</th>}
                <th className="r">Net</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr key={o.id} className={o.isYou ? "is-you" : undefined}>
                  <td>
                    <Swatch color={o.color} round />
                    {o.isYou ? <strong>{o.name}</strong> : o.name}
                    <span className="muted"> · {o.rent > 0 ? "resident" : "does not live there"}</span>
                  </td>
                  <td className="r" data-label="Equity">{pct(o.share)}</td>
                  <td className="r" data-label="Share of costs">{formatCurrency(-o.expenses)}</td>
                  {residents.length > 0 && !isRental && (
                    <td className="r" data-label="Rent paid">{o.rentPaid > 0 ? formatCurrency(-o.rentPaid) : "—"}</td>
                  )}
                  <td className="r" data-label="Rent income">{formatCurrency(o.rentIncome)}</td>
                  {includeTaxSavings && (
                    <td className="r" data-label="Tax effect">{o.title > 0 && o.taxShield ? formatCurrency(o.taxShield) : "—"}</td>
                  )}
                  <td className={`r strong${o.net >= 0 ? " positive" : ""}`} data-label="Net">{formatCurrency(o.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-foot">
          <span>
            <strong>Cash to close {formatCurrency(cashToClose.total)}</strong>
            <span className="muted">
              {owners.map((o) => ` · ${o.name} ${formatCurrency(cashToClose.byPerson[o.id]?.total ?? 0)}`).join("")}
            </span>
          </span>
          <button type="button" className="link-btn" onClick={onShowLoan}>
            See loan details
          </button>
        </div>
      </section>
    </div>
  );
}
export default CashFlowTab;
