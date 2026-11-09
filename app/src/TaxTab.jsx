import React from "react";
import { CheckCircle, XCircle, ArrowDown, Info } from "lucide-react";
import { formatCurrency } from "./utils";
import { TAX_ASSUMPTIONS } from "./financialModel";

const { w2Income, caStateTax, saltCap, standardDeduction, mortgageDebtLimit } =
  TAX_ASSUMPTIONS;

function CapCheck({ ok, title, children }) {
  const color = ok ? "var(--positive)" : "var(--warning)";
  const Icon = ok ? CheckCircle : XCircle;
  return (
    <div
      style={{
        flex: 1,
        minWidth: "260px",
        background: ok ? "color-mix(in srgb, var(--positive) 5%, transparent)" : "color-mix(in srgb, var(--warning) 8%, transparent)",
        border: `1px solid ${ok ? "color-mix(in srgb, var(--positive) 30%, transparent)" : "color-mix(in srgb, var(--warning) 40%, transparent)"}`,
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Icon color={color} size={24} />
        <span style={{ color, fontWeight: "bold", fontSize: "1.1rem" }}>
          {title}: {ok ? "CLEAR" : "CAPPED"}
        </span>
      </div>
      {children}
    </div>
  );
}

function TaxTab({
  isRental,
  selectedYear,
  // Owner-occupied props
  monthlyInterest,
  monthlyPrincipal,
  propertyTax,
  hoa,
  mortgage,
  scheduleA,
  // Rental LLC props
  purchasePrice,
  rentalInterest,
  rentalPropertyTax,
  rentalHOA,
  userShareOfDepreciation,
  userShareOfOperatingExpenses,
  totalOperatingExpenses,
  operatingExpenseRate,
  totalRentalDeductions,
  rentalIncome,
  netRentalIncome,
  rentalTaxImpact,
  monthlyRentalTaxCost,
  cumulativeTaxSavings,
  llcShare,
  titleHolders = [],
  youId,
}) {
  if (isRental) {
    const annualTaxSavingsFromLoss = Math.max(0, -rentalTaxImpact);
    const monthlyTaxSavingsFromLoss = annualTaxSavingsFromLoss / 12;

    return (
      <div className="tab-fade-in">
        {/* LLC HEADER */}
        <div
          className="card"
          style={{
            marginBottom: "24px",
            background: "color-mix(in srgb, var(--rental) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--rental) 30%, transparent)",
          }}
        >
          <div
            className="card-header"
            style={{ fontSize: "1.3rem", color: "var(--rental)" }}
          >
            LLC partnership with real estate professional status (REPS)
          </div>
          <div className="card-body">
            <p style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
              This scenario models <strong>{titleHolders.length} LLC{" "}
              {titleHolders.length === 1 ? "member" : "members"}</strong>: the owners
              on title. Each member reports their title share of the rental
              income and deductions; the numbers below are your{" "}
              {(llcShare * 100).toFixed(0)}%.
            </p>
            <p style={{ color: "var(--warning)", marginBottom: "16px" }}>
              <strong>Tax assumption:</strong> The projected W-2 offset only applies
              if the taxpayer qualifies as a real estate professional, materially
              participates in this activity, and clears the at-risk and excess
              business-loss limitations. Confirm the ownership and payment structure
              with a tax professional before relying on this scenario.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {titleHolders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "color-mix(in srgb, var(--info) 6%, transparent)",
                    border: `1px solid ${o.id === youId ? "color-mix(in srgb, var(--accent) 70%, transparent)" : "color-mix(in srgb, var(--info) 30%, transparent)"}`,
                    fontSize: "0.9rem",
                  }}
                >
                  {o.name}, {Number(o.title.toFixed(2))}% member
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 1: Deductible Expenses */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header" style={{ fontSize: "1.3rem" }}>
            Step 1: What can the LLC deduct?
          </div>
          <div className="card-body">
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
              As a business, the LLC can deduct <strong>all</strong> ordinary
              and necessary expenses — including items that were NOT deductible
              when you lived there (HOA, depreciation, and operating costs).
            </p>
            <div className="tax-item-grid">
              <div className="tax-item yes">
                <div className="tax-item-header">
                  <CheckCircle color="var(--positive)" size={20} /> Mortgage interest
                </div>
                <div className="tax-item-amount">
                  {formatCurrency(rentalInterest / 12)} / mo (your {(llcShare * 100).toFixed(0)}%)
                </div>
                <div className="tax-item-note">
                  No $750k TCJA cap — it's a business expense now.
                </div>
              </div>
              <div className="tax-item yes">
                <div className="tax-item-header">
                  <CheckCircle color="var(--positive)" size={20} /> Property tax
                </div>
                <div className="tax-item-amount">
                  {formatCurrency(rentalPropertyTax / 12)} / mo (your {(llcShare * 100).toFixed(0)}%)
                </div>
                <div className="tax-item-note">
                  Bypasses the SALT cap entirely as a rental expense.
                </div>
              </div>
              <div
                className="tax-item yes"
                style={{ border: "1px solid color-mix(in srgb, var(--positive) 40%, transparent)" }}
              >
                <div className="tax-item-header">
                  <CheckCircle color="var(--positive)" size={20} /> HOA dues
                </div>
                <div className="tax-item-amount">
                  {formatCurrency(rentalHOA / 12)} / mo (your {(llcShare * 100).toFixed(0)}%)
                </div>
                <div className="tax-item-note">
                  <strong>Newly deductible!</strong> Not deductible as a
                  homeowner, but fully deductible as a business.
                </div>
              </div>
              <div
                className="tax-item yes"
                style={{ border: "1px solid color-mix(in srgb, var(--positive) 40%, transparent)" }}
              >
                <div className="tax-item-header">
                  <CheckCircle color="var(--positive)" size={20} /> Depreciation
                </div>
                <div className="tax-item-amount">
                  {formatCurrency(userShareOfDepreciation / 12)} / mo (your {(llcShare * 100).toFixed(0)}%)
                </div>
                <div className="tax-item-note">
                  <strong>Phantom deduction!</strong>{" "}
                  {formatCurrency(purchasePrice)} × 80% building ÷ 27.5 years ×
                  your {(llcShare * 100).toFixed(0)}% = {formatCurrency(userShareOfDepreciation)}/yr.
                </div>
              </div>
            </div>

            {/* Operating Expenses Breakdown */}
            <div style={{ marginTop: "24px" }}>
              <h3
                style={{
                  color: "var(--info)",
                  marginBottom: "16px",
                  fontSize: "1.1rem",
                }}
              >
                Operating expenses (your {(llcShare * 100).toFixed(0)}% Share)
              </h3>
              <div
                style={{
                  background: "var(--surface-sunken)", border: "1px solid var(--border)",
                  padding: "16px",
                  borderRadius: "10px",
                }}
              >
                <div className="row" style={{ marginBottom: "8px" }}>
                  <span>
                    Estimated at {operatingExpenseRate.toFixed(2)}% of property
                    value:
                  </span>
                  <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                    {formatCurrency(userShareOfOperatingExpenses)}/yr
                  </span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Covers cleaning, general repairs, maintenance,
                  and landlord insurance. LLC total:{" "}
                  {formatCurrency(totalOperatingExpenses)}/yr (
                  {formatCurrency(totalOperatingExpenses / 12)}/mo).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: Annual P&L */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header" style={{ fontSize: "1.3rem" }}>
            Step 2: Your {(llcShare * 100).toFixed(0)}% K-1 — Annual Rental P&L (Year {selectedYear})
          </div>
          <div className="card-body">
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
              The LLC files Form 1065 and issues each member a K-1. Here's your
              {(llcShare * 100).toFixed(0)}% share:
            </p>

            <div
              style={{
                background: "color-mix(in srgb, var(--positive) 6%, transparent)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid color-mix(in srgb, var(--positive) 30%, transparent)",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  color: "var(--positive)",
                  fontWeight: "bold",
                  marginBottom: "12px",
                }}
              >
                Income (your {(llcShare * 100).toFixed(1)}% of
                rent)
              </div>
              <div className="row">
                <span>
                  {(llcShare * 100).toFixed(1)}% of Tenant Rent:
                </span>{" "}
                <span className="positive">
                  {formatCurrency(rentalIncome)} / yr
                </span>
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                margin: "12px 0",
                color: "var(--text-secondary)",
                fontSize: "1.2rem",
              }}
            >
              minus
            </div>

            <div
              style={{
                background: "color-mix(in srgb, var(--negative) 6%, transparent)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid color-mix(in srgb, var(--negative) 30%, transparent)",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  color: "var(--negative)",
                  fontWeight: "bold",
                  marginBottom: "12px",
                }}
              >
                Deductible expenses (your {(llcShare * 100).toFixed(0)}%)
              </div>
              <div className="row">
                <span>Mortgage interest</span>{" "}
                <span>-{formatCurrency(rentalInterest)}</span>
              </div>
              <div className="row">
                <span>Property tax</span>{" "}
                <span>-{formatCurrency(rentalPropertyTax)}</span>
              </div>
              <div className="row">
                <span>HOA dues</span> <span>-{formatCurrency(rentalHOA)}</span>
              </div>
              <div className="row">
                <span>
                  Depreciation ({formatCurrency(purchasePrice)} × 80% ÷ 27.5 ×{" "}
                  {(llcShare * 100).toFixed(0)}%):
                </span>{" "}
                <span>-{formatCurrency(userShareOfDepreciation)}</span>
              </div>
              <div className="row">
                <span>Operating expenses</span>{" "}
                <span>-{formatCurrency(userShareOfOperatingExpenses)}</span>
              </div>
              <hr style={{ opacity: 0.2 }} />
              <div className="row total">
                <span>Total deductions</span>{" "}
                <span className="negative">
                  -{formatCurrency(totalRentalDeductions)}
                </span>
              </div>
            </div>

            <div style={{ textAlign: "center", margin: "12px 0" }}>
              <ArrowDown color="var(--rental)" size={32} />
            </div>

            <div
              style={{
                background:
                  netRentalIncome >= 0
                    ? "color-mix(in srgb, var(--positive) 10%, transparent)"
                    : "color-mix(in srgb, var(--rental) 10%, transparent)",
                padding: "20px",
                borderRadius: "12px",
                border: `1px solid ${netRentalIncome >= 0 ? "color-mix(in srgb, var(--positive) 30%, transparent)" : "color-mix(in srgb, var(--rental) 30%, transparent)"}`,
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  color: netRentalIncome >= 0 ? "var(--positive)" : "var(--rental)",
                  fontWeight: "bold",
                  marginBottom: "12px",
                  fontSize: "1.1rem",
                }}
              >
                {netRentalIncome >= 0
                  ? "Net taxable rental income"
                  : "Net Rental Loss (Paper Loss)"}
              </div>
              <div className="row total" style={{ fontSize: "1.2rem" }}>
                <span>Net:</span>
                <span
                  className={netRentalIncome >= 0 ? "positive" : "negative"}
                >
                  {formatCurrency(netRentalIncome)} / yr
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3: What this means for your taxes */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header" style={{ fontSize: "1.3rem" }}>
            Step 3: How does this affect your W-2 taxes?
          </div>
          <div className="card-body">
            {netRentalIncome >= 0 ? (
              <>
                <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Your rental made {formatCurrency(netRentalIncome)} of taxable
                  income. You'll owe taxes on this at your 24% marginal rate.
                </p>
                <div
                  style={{
                    background: "var(--surface-sunken)", border: "1px solid var(--border)",
                    padding: "24px",
                    borderRadius: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <div className="row">
                    <span>Net rental income</span>{" "}
                    <span>{formatCurrency(netRentalIncome)}</span>
                  </div>
                  <div className="row">
                    <span>Your tax rate:</span> <span>24%</span>
                  </div>
                  <hr style={{ opacity: 0.2 }} />
                  <div className="row total">
                    <span>Additional tax owed:</span>{" "}
                    <span className="negative">
                      {formatCurrency(rentalTaxImpact)} / yr (
                      {formatCurrency(monthlyRentalTaxCost)} / mo)
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Your rental shows a <strong>"paper loss"</strong> of{" "}
                  {formatCurrency(Math.abs(netRentalIncome))} — mostly thanks to
                  depreciation and operating expense deductions.
                </p>
                <div
                  style={{
                    background: "color-mix(in srgb, var(--positive) 6%, transparent)",
                    padding: "24px",
                    borderRadius: "12px",
                    border: "1px solid color-mix(in srgb, var(--positive) 30%, transparent)",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      color: "var(--positive)",
                      fontWeight: "bold",
                      marginBottom: "12px",
                      fontSize: "1.1rem",
                    }}
                  >
                    Scenario: rental loss offsets W-2 income
                  </div>
                  <p style={{ color: "var(--text-primary)", margin: "0 0 16px 0" }}>
                    This projection assumes the REPS and material-participation
                    tests are satisfied and no other loss limitation applies. If
                    those conditions are not met, some or all of the loss may be
                    suspended instead of reducing W-2 income this year.
                  </p>
                  <div className="row">
                    <span>Your W-2 income</span> <span>{formatCurrency(w2Income)}</span>
                  </div>
                  <div className="row">
                    <span>K-1 rental loss</span>{" "}
                    <span className="positive">
                      -{formatCurrency(Math.abs(netRentalIncome))}
                    </span>
                  </div>
                  <div className="row total">
                    <span>New taxable income</span>{" "}
                    <span>{formatCurrency(w2Income - standardDeduction + netRentalIncome)}</span>
                  </div>
                  <hr style={{ opacity: 0.2, margin: "16px 0" }} />
                  <div className="row">
                    <span>Tax savings at 24%:</span>{" "}
                    <span className="positive">
                      {formatCurrency(annualTaxSavingsFromLoss)} / yr
                    </span>
                  </div>
                  <div
                    className="row total"
                    style={{ fontSize: "1.3rem", marginTop: "8px" }}
                  >
                    <span>Monthly tax savings</span>{" "}
                    <span className="positive">
                      +{formatCurrency(monthlyTaxSavingsFromLoss)} / mo
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: "color-mix(in srgb, var(--info) 6%, transparent)",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)",
                  }}
                >
                  <div
                    style={{
                      color: "var(--info)",
                      fontWeight: "bold",
                      marginBottom: "8px",
                    }}
                  >
                    Cumulative tax savings through year {selectedYear}
                  </div>
                  <div className="row total">
                    <span>Total saved off W-2 taxes:</span>{" "}
                    <span className="positive">
                      {formatCurrency(cumulativeTaxSavings)}
                    </span>
                  </div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      marginTop: "8px",
                      marginBottom: 0,
                    }}
                  >
                    This is real money that stays in your pocket every year
                    instead of going to the IRS.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* STEP 4: Compared to not buying */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header" style={{ fontSize: "1.3rem" }}>
            Step 4: Compared with not buying
          </div>
          <div className="card-body">
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
              Side-by-side: your tax situation with and without the LLC rental.
            </p>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div
                style={{
                  flex: 1,
                  minWidth: "280px",
                  background: "var(--surface-sunken)", border: "1px solid var(--border)",
                  padding: "20px",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontWeight: "bold",
                    marginBottom: "12px",
                  }}
                >
                  Without the house
                </div>
                <div className="row">
                  <span>W-2 income</span> <span>{formatCurrency(w2Income)}</span>
                </div>
                <div className="row">
                  <span>Standard deduction</span> <span>-{formatCurrency(standardDeduction)}</span>
                </div>
                <div className="row total">
                  <span>Taxable income</span> <span>{formatCurrency(w2Income - standardDeduction)}</span>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: "280px",
                  background: "color-mix(in srgb, var(--rental) 6%, transparent)",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid color-mix(in srgb, var(--rental) 30%, transparent)",
                }}
              >
                <div
                  style={{
                    color: "var(--rental)",
                    fontWeight: "bold",
                    marginBottom: "12px",
                  }}
                >
                  With the LLC rental (Year {selectedYear}):
                </div>
                <div className="row">
                  <span>W-2 income</span> <span>{formatCurrency(w2Income)}</span>
                </div>
                <div className="row">
                  <span>Standard deduction</span> <span>-{formatCurrency(standardDeduction)}</span>
                </div>
                <div className="row">
                  <span>K-1 rental net</span>{" "}
                  <span className={netRentalIncome >= 0 ? "" : "positive"}>
                    {formatCurrency(netRentalIncome)}
                    {netRentalIncome < 0 ? " (offsets W-2!)" : ""}
                  </span>
                </div>
                <div className="row total">
                  <span>Taxable income</span>{" "}
                  <span>
                    {formatCurrency(
                      w2Income - standardDeduction + netRentalIncome,
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: "16px",
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
              }}
            >
              <p>
                <strong>Bottom line:</strong>{" "}
                {netRentalIncome >= 0
                  ? `The rental generates ${formatCurrency(rentalIncome)}/yr of income. After deductions, you owe ${formatCurrency(Math.abs(rentalTaxImpact))}/yr in extra taxes. But you're still cash-flow positive from the rent.`
                  : `Under the selected REPS assumptions, the LLC shows a ${formatCurrency(Math.abs(netRentalIncome))}/yr paper loss and an estimated tax benefit of ${formatCurrency(annualTaxSavingsFromLoss)}/yr (${formatCurrency(monthlyTaxSavingsFromLoss)}/mo).`}
              </p>
            </div>
          </div>
        </div>

        {/* Depreciation recapture warning */}
        <div
          style={{
            background: "color-mix(in srgb, var(--warning) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)",
            padding: "16px 20px",
            borderRadius: "8px",
            display: "flex",
            gap: "12px",
          }}
        >
          <Info
            color="var(--warning)"
            size={28}
            style={{ flexShrink: 0, marginTop: "2px" }}
          />
          <div>
            <h3 style={{ color: "var(--warning)", margin: "0 0 8px 0" }}>
              Depreciation recapture
            </h3>
            <p style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.5 }}>
              When you sell, the IRS will "recapture" all depreciation claimed
              and tax it at 25%. For each year you rent, that's{" "}
              <strong>{formatCurrency(userShareOfDepreciation)}</strong> per
              member added to your recapture liability. The Section 121 capital
              gains exclusion does <strong>not</strong> protect you from this
              tax.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // OWNER-OCCUPIED MODE: Schedule A
  const {
    shareOfInterest: userShareOfInterest,
    shareOfPropertyTax: userShareOfPropertyTax,
    shareOfLoan: userShareOfLoan,
    interestFullyDeductible,
    deductibleInterest,
    deductiblePropertyTax,
    saltTotal,
    saltUnderCap,
    totalItemized,
    itemizes,
    incrementalDeduction,
    annualTaxSavings,
    monthlyTaxSavings: userTaxShield,
  } = scheduleA;

  return (
    <div className="tab-fade-in">
      {/* STEP 1 */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header" style={{ fontSize: "1.3rem" }}>
          Step 1: What do we pay every month (Year {selectedYear})?
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
            Every month, we pay 4 things for this house. But the government only
            gives tax breaks on 2 of them.
          </p>
          <div className="tax-item-grid">
            <div className="tax-item yes">
              <div className="tax-item-header">
                <CheckCircle color="var(--positive)" size={20} /> Mortgage interest
              </div>
              <div className="tax-item-amount">
                {formatCurrency(monthlyInterest)} / mo
              </div>
              <div className="tax-item-note">
                This is the fee the bank charges you for borrowing. The IRS lets
                you write this off.
              </div>
            </div>
            <div className="tax-item no">
              <div className="tax-item-header">
                <XCircle color="var(--negative)" size={20} /> Mortgage principal
              </div>
              <div className="tax-item-amount">
                {formatCurrency(monthlyPrincipal)} / mo
              </div>
              <div className="tax-item-note">
                This is money going into your own home equity. It's not an
                expense — it's like putting money in a savings account.
              </div>
            </div>
            <div className="tax-item yes">
              <div className="tax-item-header">
                <CheckCircle color="var(--positive)" size={20} /> Property tax
              </div>
              <div className="tax-item-amount">
                {formatCurrency(propertyTax)} / mo
              </div>
              <div className="tax-item-note">
                The tax you pay to the city of San Francisco. The IRS lets you
                write this off too.
              </div>
            </div>
            <div className="tax-item no">
              <div className="tax-item-header">
                <XCircle color="var(--negative)" size={20} /> HOA dues
              </div>
              <div className="tax-item-amount">{formatCurrency(hoa)} / mo</div>
              <div className="tax-item-note">
                The fee for building maintenance, gym, etc. Not tax deductible
                on a home you live in.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header" style={{ fontSize: "1.3rem" }}>
          Step 2: Each owner on title deducts their share
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
            The IRS only lets you deduct your share of what you pay. The
            mortgage and deed are split by title share:
          </p>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {titleHolders.map((o) => {
              const mine = o.id === youId;
              const accent = mine ? "var(--info)" : "var(--rental)";
              return (
                <div
                  key={o.id}
                  style={{
                    flex: 1,
                    minWidth: "250px",
                    background: mine ? "color-mix(in srgb, var(--info) 10%, transparent)" : "color-mix(in srgb, var(--rental) 10%, transparent)",
                    border: `1px solid ${mine ? "color-mix(in srgb, var(--info) 30%, transparent)" : "color-mix(in srgb, var(--rental) 30%, transparent)"}`,
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div style={{ color: accent, fontWeight: "bold", marginBottom: "12px", fontSize: "1.1rem" }}>
                    {o.name === "You" ? "Your" : `${o.name}'s`} {Number(o.title.toFixed(2))}% share (year {selectedYear})
                  </div>
                  <div className="row">
                    <span>Mortgage interest</span>{" "}
                    <span>{formatCurrency(o.scheduleA.shareOfInterest)} / yr</span>
                  </div>
                  <div className="row">
                    <span>Property tax</span>{" "}
                    <span>{formatCurrency(o.scheduleA.shareOfPropertyTax)} / yr</span>
                  </div>
                  <hr style={{ opacity: 0.2 }} />
                  <div className="row total">
                    <span>Deductible total</span>{" "}
                    <span style={{ color: "var(--positive)" }}>
                      {formatCurrency(o.scheduleA.deductibleInterest + o.scheduleA.deductiblePropertyTax)} / yr
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header" style={{ fontSize: "1.3rem" }}>
          Step 3: Are there any IRS limits that reduce this?
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
            The government puts caps on how much you can deduct. Let's check
            both:
          </p>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <CapCheck ok={interestFullyDeductible} title="Mortgage Interest Cap">
              <div className="row">
                <span>IRS limit</span> <span>{formatCurrency(mortgageDebtLimit)} of debt per person</span>
              </div>
              <div className="row">
                <span>Your share of the loan</span> <span>{formatCurrency(userShareOfLoan)}</span>
              </div>
              <div className="row">
                <span>Deductible interest</span>{" "}
                <span>{formatCurrency(deductibleInterest)} of {formatCurrency(userShareOfInterest)}</span>
              </div>
            </CapCheck>
            <CapCheck ok={saltUnderCap} title="SALT Cap">
              <div className="row">
                <span>IRS limit (2026)</span> <span>{formatCurrency(saltCap)} total</span>
              </div>
              <div className="row">
                <span>CA state tax</span> <span>{formatCurrency(caStateTax)}</span>
              </div>
              <div className="row">
                <span>+ Your property tax</span> <span>{formatCurrency(userShareOfPropertyTax)}</span>
              </div>
              <div className="row">
                <span>Your SALT total</span>{" "}
                <span style={{ color: saltUnderCap ? "var(--positive)" : "var(--warning)" }}>
                  {formatCurrency(saltTotal)} {saltUnderCap ? "≤" : ">"} {formatCurrency(saltCap)}
                </span>
              </div>
            </CapCheck>
          </div>
          <p
            style={{ color: "var(--text-secondary)", marginTop: "16px", fontSize: "0.95rem" }}
          >
            {interestFullyDeductible && saltUnderCap
              ? "Both caps cleared. 100% of your housing deductions are usable."
              : "At least one cap applies, so part of your housing deductions is lost."}
          </p>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header" style={{ fontSize: "1.3rem" }}>
          Step 4: How much money does this actually save you?
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
            A "deduction" doesn't mean free money — it means you tell the IRS
            "don't tax me on this amount of my income." The savings depend on
            your tax bracket.
          </p>

          <div
            style={{
              background: "var(--surface-sunken)", border: "1px solid var(--border)",
              padding: "24px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                marginBottom: "16px",
                fontWeight: "bold",
              }}
            >
              Without the house
            </div>
            <div className="row">
              <span>Your income</span> <span>{formatCurrency(w2Income)}</span>
            </div>
            <div className="row">
              <span>Standard deduction (everyone gets this)</span>{" "}
              <span>- {formatCurrency(standardDeduction)}</span>
            </div>
            <div className="row total">
              <span>Taxable income:</span> <span>{formatCurrency(w2Income - standardDeduction)}</span>
            </div>
            <div className="row" style={{ marginTop: "8px" }}>
              <span>Tax bracket</span>{" "}
              <span style={{ color: "var(--info)" }}>
                24% (covers $105,701 - $201,775)
              </span>
            </div>
          </div>

          <div style={{ textAlign: "center", margin: "16px 0" }}>
            <ArrowDown color="var(--rental)" size={32} />
          </div>

          <div
            style={{
              background: "color-mix(in srgb, var(--rental) 6%, transparent)",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid color-mix(in srgb, var(--rental) 30%, transparent)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                color: "var(--rental)",
                marginBottom: "16px",
                fontWeight: "bold",
              }}
            >
              With the house (Year {selectedYear}):
            </div>
            <div className="row">
              <span>Your income</span> <span>{formatCurrency(w2Income)}</span>
            </div>
            <div className="row">
              <span>CA state tax (SALT)</span> <span>- {formatCurrency(caStateTax)}</span>
            </div>
            <div className="row">
              <span>Your property tax (SALT)</span>{" "}
              <span>- {formatCurrency(deductiblePropertyTax)}</span>
            </div>
            <div className="row">
              <span>Your mortgage interest</span>{" "}
              <span>- {formatCurrency(deductibleInterest)}</span>
            </div>
            {!itemizes && (
              <div className="row" style={{ color: "var(--warning)" }}>
                <span>Itemized total is below the standard deduction:</span>{" "}
                <span>take the {formatCurrency(standardDeduction)} standard</span>
              </div>
            )}
            <div className="row total">
              <span>Taxable income:</span>{" "}
              <span>{formatCurrency(w2Income - Math.max(totalItemized, standardDeduction))}</span>
            </div>
          </div>

          <div
            style={{
              background: "color-mix(in srgb, var(--positive) 6%, transparent)",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid color-mix(in srgb, var(--positive) 30%, transparent)",
            }}
          >
            <div
              style={{
                color: "var(--positive)",
                marginBottom: "16px",
                fontWeight: "bold",
                fontSize: "1.1rem",
              }}
            >
              The savings
            </div>
            <div className="row">
              <span>Income you no longer pay tax on</span>{" "}
              <span>{formatCurrency(incrementalDeduction)}</span>
            </div>
            <div className="row">
              <span>Your tax rate on that income</span> <span>24%</span>
            </div>
            <hr style={{ opacity: 0.2, margin: "12px 0" }} />
            <div className="row">
              <span>Annual tax savings</span>{" "}
              <span className="positive">
                {formatCurrency(annualTaxSavings)} / year
              </span>
            </div>
            <div
              className="row total"
              style={{ fontSize: "1.3rem", marginTop: "8px" }}
            >
              <span>Monthly tax savings</span>
              <span className="positive">
                {formatCurrency(userTaxShield)} / month
              </span>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                marginTop: "16px",
                marginBottom: 0,
              }}
            >
              This is per person. Each owner on title gets their own amount.
            </p>
          </div>
        </div>
      </div>

      {/* WHY IT DECREASES */}
      <div
        style={{
          background: "color-mix(in srgb, var(--info) 6%, transparent)",
          border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)",
          padding: "16px 20px",
          borderRadius: "8px",
          display: "flex",
          gap: "12px",
        }}
      >
        <Info
          color="var(--info)"
          size={28}
          style={{ flexShrink: 0, marginTop: "2px" }}
        />
        <div>
          <h3 style={{ color: "var(--info)", margin: "0 0 8px 0" }}>
            Why does this number shrink over time?
          </h3>
          <p style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.5 }}>
            Your mortgage payment stays the same every month (
            {formatCurrency(mortgage)}), but over time more of it goes toward
            paying off the loan (principal) and less goes to the bank as a fee
            (interest). Since only the interest is deductible, your tax savings
            naturally decrease each year. Try dragging the year slider to see
            this in action.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TaxTab;
