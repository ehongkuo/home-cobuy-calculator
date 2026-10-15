import React from "react";
import { Info, Home, Receipt, Wallet, TrendingUp, PiggyBank } from "lucide-react";
import { FLOW_COLORS, formatCurrency } from "./utils";
import { buildRentFlow } from "./financialModel";
import RentFlowSankey from "./RentFlowSankey";

const SummaryRow = ({ color, label, value, muted = false }) => (
  <div className={`rentflow-row${muted ? " is-muted" : ""}`}>
    <span className="rentflow-dot" style={{ background: color }} />
    <span>{label}</span>
    <strong>{formatCurrency(value)}</strong>
  </div>
);

const pct = (share) => `${Number((share * 100).toFixed(2))}%`;

// Annual exclusion if a married couple gifts to two recipients (2 × 2 × $19k).
const GIFT_EXCLUSION_LIMIT = 76000;

const BreakdownRow = ({ icon: Icon, label, value, isNested = false, color = "var(--text-primary)" }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: isNested ? "6px 0 6px 20px" : "10px 0",
      borderLeft: isNested ? "2px solid rgba(255,255,255,0.1)" : "none",
      marginLeft: isNested ? "10px" : "0",
      borderBottom: !isNested ? "1px solid rgba(255,255,255,0.05)" : "none",
      fontSize: isNested ? "0.85rem" : "0.95rem",
      color: isNested ? "var(--text-muted)" : "var(--text-primary)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {Icon && <Icon size={isNested ? 14 : 16} style={{ color: isNested ? "var(--text-muted)" : color }} />}
      <span style={{ fontWeight: isNested ? 400 : 500 }}>{label}</span>
    </div>
    <span style={{ fontWeight: 600, color: value.startsWith("-") ? "var(--negative)" : (value.startsWith("+") ? "var(--positive)" : color), fontFamily: "monospace", fontSize: isNested ? "0.9rem" : "1rem" }}>
      {value}
    </span>
  </div>
);

function OwnerCard({ owner, isRental, includeTaxSavings }) {
  const share = pct(owner.share);
  return (
    <div
      className="card hover-card"
      style={{
        display: "flex",
        flexDirection: "column",
        ...(owner.isYou && { border: "1px solid rgba(99, 102, 241, 0.3)", boxShadow: "0 0 20px rgba(99, 102, 241, 0.05)" }),
      }}
    >
      <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", textTransform: "uppercase", color: owner.isYou ? "var(--accent-blue)" : "var(--text-muted)", fontWeight: owner.isYou ? 700 : 600, letterSpacing: "1px" }}>
          <span className="rentflow-dot" style={{ background: owner.color }} />
          {owner.name} ({share})
        </div>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: owner.net >= 0 ? "var(--positive)" : "var(--text-primary)", marginTop: "4px" }}>
          {formatCurrency(owner.net)}<span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}>/mo</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <BreakdownRow icon={Home} label="Property Costs" value={`-${formatCurrency(owner.expenses)}`} />
        <BreakdownRow label={`Mortgage (${share})`} value={`-${formatCurrency(owner.split.mortgage)}`} isNested />
        <BreakdownRow label={`Prop Tax (${share})`} value={`-${formatCurrency(owner.split.propertyTax)}`} isNested />
        <BreakdownRow label={`HOA (${share})`} value={`-${formatCurrency(owner.split.hoa)}`} isNested />
        {isRental && <BreakdownRow label={`OpEx (${share})`} value={`-${formatCurrency(owner.split.opex)}`} isNested />}

        {owner.rentPaid > 0 && <BreakdownRow icon={Receipt} label="Rent Paid Out" value={`-${formatCurrency(owner.rentPaid)}`} />}

        <BreakdownRow icon={Wallet} label="Rent Income" value={`+${formatCurrency(owner.rentIncome)}`} color="var(--positive)" />

        {includeTaxSavings && owner.title > 0 && (
          <BreakdownRow
            icon={TrendingUp}
            label={owner.taxShield >= 0 ? "Tax Savings" : "Tax Cost"}
            value={owner.taxShield > 0 ? `+${formatCurrency(owner.taxShield)}` : formatCurrency(owner.taxShield)}
            color={owner.taxShield >= 0 ? "var(--positive)" : "var(--negative)"}
          />
        )}
      </div>
    </div>
  );
}

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
}) {
  const opExMonthly = (totalOperatingExpenses || 0) / 12;

  // Split the level payment into interest and principal for the selected year.
  const paidThisYear = monthlyInterest + monthlyPrincipal;
  const interestPortion = paidThisYear > 0 ? mortgage * (monthlyInterest / paidThisYear) : 0;
  const flow = buildRentFlow({
    isRental,
    owners,
    totalRent,
    costs: {
      interest: interestPortion,
      principal: paidThisYear > 0 ? mortgage - interestPortion : 0,
      propertyTax,
      hoa,
      opex: isRental ? opExMonthly : 0,
    },
  });
  const coverage = flow.totalCosts > 0 ? totalRent / flow.totalCosts : 1;
  const payers = isRental
    ? [{ id: "tenant", color: FLOW_COLORS.tenant, label: "Tenant pays", value: totalRent }]
    : owners
        .filter((o) => o.rent > 0)
        .map((o) => ({ id: o.id, color: o.color, label: `${o.name} pays`, value: o.rent }));
  const gapLabel = flow.topUp > 0 ? "Owners top up the gap" : "Surplus paid out";

  // Owners off the title who cover a shortfall are effectively gifting to the others.
  const gifts = owners
    .filter((o) => o.title <= 0)
    .map((o) => ({ ...o, annual: (o.expenses - o.rentIncome + o.rentPaid) * 12 }))
    .filter((o) => o.annual > GIFT_EXCLUSION_LIMIT);

  return (
    <div className="tab-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Total payment + rent flow */}
      <section className="rentflow-hero">
        <div className="rentflow-summary">
          <div className="rentflow-eyebrow">Total Monthly Payment</div>
          <div className="rentflow-total">
            {formatCurrency(flow.totalCosts)}<span>/mo</span>
          </div>

          <div className="rentflow-coverage">
            <div className="rentflow-coverage-head">
              <span>Rent covers {Math.round(coverage * 100)}%</span>
            </div>
            <div className="rentflow-bar" role="presentation">
              <div style={{ width: `${Math.min(100, coverage * 100)}%` }} />
            </div>
          </div>

          <div className="rentflow-divider" />

          <div className="rentflow-gap">
            <div className="rentflow-gap-head">
              <span>Rent pot</span>
              <strong>{formatCurrency(totalRent)}</strong>
            </div>
            <div className="rentflow-rows">
              {payers.map((p) => (
                <SummaryRow key={p.id} color={p.color} label={p.label} value={p.value} muted />
              ))}
            </div>
          </div>

          <div className="rentflow-gap">
            <div className="rentflow-gap-head">
              <span>{gapLabel}</span>
              <strong className={flow.topUp > 0 ? "is-negative" : "is-positive"}>
                {flow.topUp > 0 ? "-" : "+"}{formatCurrency(flow.topUp || flow.surplus)}
              </strong>
            </div>
            <div className="rentflow-rows">
              {owners.filter((o) => o.share > 0).map((o) => (
                <SummaryRow
                  key={o.id}
                  color={o.color}
                  label={`${o.name} · ${pct(o.share)}`}
                  value={(flow.topUp || flow.surplus) * o.share}
                  muted
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rentflow-chart">
          <div className="rentflow-chart-head">
            <h3>Where the money goes</h3>
            <span className="rentflow-mode">{isRental ? "Rental" : "Owner-occupied"} · monthly</span>
          </div>
          <RentFlowSankey flow={flow} />
        </div>
      </section>

      {/* Upfront cash */}
      <div className="cash-strip">
        <div className="cash-strip-title">
          <PiggyBank size={16} /> Cash to close: {formatCurrency(cashToClose.total)}
        </div>
        <div className="cash-strip-people">
          {owners.map((o) => (
            <span key={o.id} className={o.isYou ? "cash-strip-you" : undefined}>
              {o.name} {formatCurrency(cashToClose.byPerson[o.id]?.total ?? 0)}
            </span>
          ))}
        </div>
        <button type="button" className="cash-strip-link" onClick={onShowLoan}>
          Details →
        </button>
      </div>

      {/* Gift Tax Warning */}
      {gifts.map((o) => (
        <div
          key={o.id}
          style={{
            background: "rgba(251, 146, 60, 0.1)",
            border: "1px solid rgba(251, 146, 60, 0.4)",
            padding: "16px 20px",
            borderRadius: "12px",
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          <Info color="#fb923c" size={24} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <h3 style={{ color: "#fb923c", margin: "0 0 6px 0", fontSize: "1.05rem" }}>Gift Tax Notice</h3>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, fontSize: "0.9rem" }}>
              {o.name} is not on the title and contributes a net <strong>{formatCurrency(o.annual)}</strong> a year, above the <strong>{formatCurrency(GIFT_EXCLUSION_LIMIT)}</strong> annual gift exclusion for two donors and two recipients. If that shortfall is a gift, Form 709 is required (usually no tax owed; it reduces the lifetime exemption).
            </p>
          </div>
        </div>
      ))}

      {/* One card per owner */}
      <div className="grid-3" style={{ alignItems: "stretch" }}>
        {owners.map((o) => (
          <OwnerCard key={o.id} owner={o} isRental={isRental} includeTaxSavings={includeTaxSavings} />
        ))}
      </div>
    </div>
  );
}
export default CashFlowTab;
