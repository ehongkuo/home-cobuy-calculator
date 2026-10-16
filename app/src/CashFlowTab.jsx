import React, { useState } from "react";
import { Info, Home, Receipt, Wallet, TrendingUp, PiggyBank, ChevronDown } from "lucide-react";
import { FLOW_COLORS, formatCurrency } from "./utils";
import { buildRentFlow } from "./financialModel";
import RentFlowSankey from "./RentFlowSankey";

// One owner's monthly net. On phones the breakdown collapses behind the header.
const OwnerCard = ({ title, net, highlight = false, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`card hover-card owner-card${highlight ? " is-you" : ""}${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="owner-card-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="owner-card-title">{title}</span>
        <span className={`owner-card-net${net >= 0 ? " is-positive" : ""}`}>
          {formatCurrency(net)}
          <span className="owner-card-unit">/mo</span>
        </span>
        <ChevronDown size={18} className="owner-card-chevron" aria-hidden="true" />
      </button>
      <div className="owner-card-body">{children}</div>
    </div>
  );
};

const SummaryRow = ({ kind, label, value, muted = false }) => (
  <div className={`rentflow-row${muted ? " is-muted" : ""}`}>
    <span className="rentflow-dot" style={{ background: FLOW_COLORS[kind] }} />
    <span>{label}</span>
    <strong>{formatCurrency(value)}</strong>
  </div>
);

const owners = [
  { kind: "investor", label: "Investor · 50%", share: 0.5 },
  { kind: "user", label: "You · 25%", share: 0.25 },
  { kind: "coOwner", label: "Co-owner · 25%", share: 0.25 },
];

function CashFlowTab({
  isRental,
  userRent,
  coOwnerRent,
  tenantRent,
  includeTaxSavings,
  totalRent,
  investorExpenses,
  investorRentIncome,
  investorNet,
  userExpenses,
  userRentIncome,
  userNet,
  userTaxShield,
  coOwnerExpenses,
  coOwnerRentIncome,
  coOwnerNet,
  mortgage,
  monthlyInterest,
  monthlyPrincipal,
  propertyTax,
  hoa,
  totalOperatingExpenses,
  cashToClose,
  onShowLoan,
}) {
  const investorShare = 0.5;
  const userShare = 0.25;
  const coOwnerShare = 0.25;

  const opExMonthly = (totalOperatingExpenses || 0) / 12;

  // Split the level payment into interest and principal for the selected year.
  const paidThisYear = monthlyInterest + monthlyPrincipal;
  const interestPortion = paidThisYear > 0 ? mortgage * (monthlyInterest / paidThisYear) : 0;
  const flow = buildRentFlow({
    isRental,
    userRent,
    coOwnerRent,
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
    ? [{ kind: "tenant", label: "Tenant pays", value: tenantRent }]
    : [
        { kind: "user", label: "You pay", value: userRent },
        { kind: "coOwner", label: "Co-owner pays", value: coOwnerRent },
      ];
  const gapLabel = flow.topUp > 0 ? "Owners top up the gap" : "Surplus paid out";

  // Gift tax check
  const investorNetAnnualGift = (investorExpenses - investorRentIncome) * 12;
  // Annual exclusion if a married couple gifts to two recipients (2 × 2 × $19k).
  const giftExclusionLimit = 76000;

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

  return (
    <div className="tab-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Total Rent Pot + rent flow */}
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
                <SummaryRow key={p.kind} kind={p.kind} label={p.label} value={p.value} muted />
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
              {owners.map((o) => (
                <SummaryRow
                  key={o.kind}
                  kind={o.kind}
                  label={o.label}
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
          <PiggyBank size={16} /> Cash to close <strong>{formatCurrency(cashToClose.total)}</strong>
        </div>
        <div className="cash-strip-people">
          <span className="cash-strip-person">
            <span>Investor</span> <strong>{formatCurrency(cashToClose.byPerson.investor.total)}</strong>
          </span>
          <span className="cash-strip-person cash-strip-you">
            <span>You</span> <strong>{formatCurrency(cashToClose.byPerson.user.total)}</strong>
          </span>
          <span className="cash-strip-person">
            <span>Co-owner</span> <strong>{formatCurrency(cashToClose.byPerson.coOwner.total)}</strong>
          </span>
        </div>
        <button type="button" className="cash-strip-link" onClick={onShowLoan}>
          Details →
        </button>
      </div>

      {/* Gift Tax Warning */}
      {investorNetAnnualGift > giftExclusionLimit && (
        <div
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
              The investor's net annual contribution is <strong>{formatCurrency(investorNetAnnualGift)}</strong>, above the <strong>{formatCurrency(giftExclusionLimit)}</strong> annual gift exclusion for two donors and two recipients. If that shortfall is a gift, Form 709 is required (usually no tax owed; it reduces the lifetime exemption).
            </p>
          </div>
        </div>
      )}

      {/* 3-Column Grid */}
      <div className="grid-3" style={{ alignItems: "stretch" }}>
        
        {/* INVESTOR CARD */}
        <OwnerCard title="Investor (50%)" net={investorNet}>
          <BreakdownRow icon={Home} label="Property Costs" value={`-${formatCurrency(investorExpenses)}`} />
          <BreakdownRow label={`Mortgage (50%)`} value={`-${formatCurrency(mortgage * investorShare)}`} isNested />
          <BreakdownRow label={`Prop Tax (50%)`} value={`-${formatCurrency(propertyTax * investorShare)}`} isNested />
          <BreakdownRow label={`HOA (50%)`} value={`-${formatCurrency(hoa * investorShare)}`} isNested />
          {isRental && <BreakdownRow label={`OpEx (50%)`} value={`-${formatCurrency(opExMonthly * investorShare)}`} isNested />}
          
          <BreakdownRow icon={Wallet} label="Rent Income" value={`+${formatCurrency(investorRentIncome)}`} color="var(--positive)" />
        </OwnerCard>

        {/* USER CARD */}
        <OwnerCard title="You (25%)" net={userNet} highlight>
          <BreakdownRow icon={Home} label="Property Costs" value={`-${formatCurrency(userExpenses)}`} />
          <BreakdownRow label={`Mortgage (25%)`} value={`-${formatCurrency(mortgage * userShare)}`} isNested />
          <BreakdownRow label={`Prop Tax (25%)`} value={`-${formatCurrency(propertyTax * userShare)}`} isNested />
          <BreakdownRow label={`HOA (25%)`} value={`-${formatCurrency(hoa * userShare)}`} isNested />
          {isRental && <BreakdownRow label={`OpEx (25%)`} value={`-${formatCurrency(opExMonthly * userShare)}`} isNested />}
          
          {!isRental && <BreakdownRow icon={Receipt} label="Rent Paid Out" value={`-${formatCurrency(userRent)}`} />}
          
          <BreakdownRow icon={Wallet} label="Rent Income" value={`+${formatCurrency(userRentIncome)}`} color="var(--positive)" />
          
          {includeTaxSavings && (
            <BreakdownRow icon={TrendingUp} label={userTaxShield >= 0 ? "Tax Savings" : "Tax Cost"} value={userTaxShield > 0 ? `+${formatCurrency(userTaxShield)}` : formatCurrency(userTaxShield)} color={userTaxShield >= 0 ? "var(--positive)" : "var(--negative)"} />
          )}
        </OwnerCard>

        {/* CO-OWNER CARD */}
        <OwnerCard title="Co-owner (25%)" net={coOwnerNet}>
          <BreakdownRow icon={Home} label="Property Costs" value={`-${formatCurrency(coOwnerExpenses)}`} />
          <BreakdownRow label={`Mortgage (25%)`} value={`-${formatCurrency(mortgage * coOwnerShare)}`} isNested />
          <BreakdownRow label={`Prop Tax (25%)`} value={`-${formatCurrency(propertyTax * coOwnerShare)}`} isNested />
          <BreakdownRow label={`HOA (25%)`} value={`-${formatCurrency(hoa * coOwnerShare)}`} isNested />
          {isRental && <BreakdownRow label={`OpEx (25%)`} value={`-${formatCurrency(opExMonthly * coOwnerShare)}`} isNested />}
          
          {!isRental && <BreakdownRow icon={Receipt} label="Rent Paid Out" value={`-${formatCurrency(coOwnerRent)}`} />}
          
          <BreakdownRow icon={Wallet} label="Rent Income" value={`+${formatCurrency(coOwnerRentIncome)}`} color="var(--positive)" />
          
          {includeTaxSavings && (
            <BreakdownRow icon={TrendingUp} label={userTaxShield >= 0 ? "Tax Savings" : "Tax Cost"} value={userTaxShield > 0 ? `+${formatCurrency(userTaxShield)}` : formatCurrency(userTaxShield)} color={userTaxShield >= 0 ? "var(--positive)" : "var(--negative)"} />
          )}
        </OwnerCard>

      </div>
    </div>
  );
}
export default CashFlowTab;
