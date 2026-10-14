import React from "react";
import { Info, Home, Receipt, Wallet, TrendingUp, PiggyBank } from "lucide-react";
import { formatCurrency } from "./utils";

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
      
      {/* Total Rent Pot - Premium Banner */}
      <div 
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div>
          <div style={{ textTransform: "uppercase", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "1px", color: "var(--accent-blue)", marginBottom: "4px" }}>Total Rent Pot</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(totalRent)}<span style={{fontSize: "1rem", color: "var(--text-muted)", fontWeight: 500}}>/mo</span></div>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          {!isRental && (
            <>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>You Pay</div>
                <div style={{ fontWeight: 600 }}>{formatCurrency(userRent)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Co-owner Pays</div>
                <div style={{ fontWeight: 600 }}>{formatCurrency(coOwnerRent)}</div>
              </div>
            </>
          )}
          {isRental && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Tenant Pays</div>
              <div style={{ fontWeight: 600, color: "var(--positive)" }}>{formatCurrency(tenantRent)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Upfront cash */}
      <div className="cash-strip">
        <div className="cash-strip-title">
          <PiggyBank size={16} /> Cash to close: {formatCurrency(cashToClose.total)}
        </div>
        <div className="cash-strip-people">
          <span>Investor {formatCurrency(cashToClose.byPerson.investor.total)}</span>
          <span className="cash-strip-you">You {formatCurrency(cashToClose.byPerson.user.total)}</span>
          <span>Co-owner {formatCurrency(cashToClose.byPerson.coOwner.total)}</span>
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
        <div className="card hover-card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "1px" }}>Investor (50%)</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: investorNet >= 0 ? "var(--positive)" : "var(--text-primary)", marginTop: "4px" }}>
              {formatCurrency(investorNet)}<span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}>/mo</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <BreakdownRow icon={Home} label="Property Costs" value={`-${formatCurrency(investorExpenses)}`} />
            <BreakdownRow label={`Mortgage (50%)`} value={`-${formatCurrency(mortgage * investorShare)}`} isNested />
            <BreakdownRow label={`Prop Tax (50%)`} value={`-${formatCurrency(propertyTax * investorShare)}`} isNested />
            <BreakdownRow label={`HOA (50%)`} value={`-${formatCurrency(hoa * investorShare)}`} isNested />
            {isRental && <BreakdownRow label={`OpEx (50%)`} value={`-${formatCurrency(opExMonthly * investorShare)}`} isNested />}
            
            <BreakdownRow icon={Wallet} label="Rent Income" value={`+${formatCurrency(investorRentIncome)}`} color="var(--positive)" />
          </div>
        </div>

        {/* USER CARD */}
        <div className="card hover-card" style={{ display: "flex", flexDirection: "column", border: "1px solid rgba(99, 102, 241, 0.3)", boxShadow: "0 0 20px rgba(99, 102, 241, 0.05)" }}>
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--accent-blue)", fontWeight: 700, letterSpacing: "1px" }}>You (25%)</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: userNet >= 0 ? "var(--positive)" : "var(--text-primary)", marginTop: "4px" }}>
              {formatCurrency(userNet)}<span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}>/mo</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
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
          </div>
        </div>

        {/* CO-OWNER CARD */}
        <div className="card hover-card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "1px" }}>Co-owner (25%)</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: coOwnerNet >= 0 ? "var(--positive)" : "var(--text-primary)", marginTop: "4px" }}>
              {formatCurrency(coOwnerNet)}<span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}>/mo</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
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
          </div>
        </div>

      </div>
    </div>
  );
}
export default CashFlowTab;
