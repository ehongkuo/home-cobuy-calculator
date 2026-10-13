import React, { useState, useMemo } from "react";
import {
  Home,
  DollarSign,
  Building,
  Calculator,
  TrendingUp,
  Scale,
  Clock,
  Sliders,
  Users,
  User,
  Wrench,
  Percent,
  Activity,
  Landmark,
} from "lucide-react";
import CashFlowTab from "./CashFlowTab";
import LoanTab from "./LoanTab";
import TaxTab from "./TaxTab";
import LongTermTab from "./LongTermTab";
import OpportunityCostTab from "./OpportunityCostTab";
import { formatCurrency } from "./utils";
import {
  buildAmortizationSchedule,
  calculateCumulativeRentalTaxSavings,
  calculateMortgagePayment,
  calculateScheduleATaxSavings,
  TAX_ASSUMPTIONS,
  valueInYear,
} from "./financialModel";

const TAB_CONFIG = [
  { id: "cashflow", icon: DollarSign, label: "Cash Flow" },
  { id: "loan", icon: Building, label: "Loan" },
  { id: "taxes", icon: Calculator, label: "Taxes" },
  { id: "longterm", icon: TrendingUp, label: "Long-Term" },
  { id: "opportunity", icon: Scale, label: "Buy vs Rent" },
];

const ContextualSlider = ({ icon: Icon, label, value, setValue, min, max, step, format = "currency" }) => {
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef(null);

  let displayValue = value;
  if (format.startsWith("currency")) {
    displayValue = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  } else if (format.startsWith("percentage")) {
    displayValue = `${value}%`;
  }
  if (format === "currency/mo") displayValue += "/mo";
  if (format === "years") displayValue += " yrs";

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleClick = (e) => {
    e.stopPropagation();
    setInputValue(String(value));
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      setValue(Math.min(max, Math.max(min, parsed)));
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <div className="year-badge-container">
      <div className="year-text">
        <Icon size={13} />
        {label}:{" "}
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            className="compact-input"
            aria-label={`${label} value`}
            style={{ width: "56px", fontSize: "0.72rem", padding: "2px 4px", height: "20px" }}
          />
        ) : (
          <button
            type="button"
            className="compact-value-button"
            onClick={handleClick}
            title="Click to type a value"
            aria-label={`Edit ${label}, current value ${displayValue}`}
          >
            {displayValue}
          </button>
        )}
      </div>
      <div className="year-slider-inline">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="slider blue-slider"
          aria-label={label}
          style={{ width: "140px", margin: 0, flexShrink: 0 }}
        />
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState("cashflow");
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  // Shared state
  const [userRent, setUserRent] = useState(3200);
  const [brotherRent, setBrotherRent] = useState(3000);
  const [tenantRent, setTenantRent] = useState(6500);
  const [includeTaxSavings, setIncludeTaxSavings] = useState(true);
  const [selectedYear, setSelectedYear] = useState(1);

  // Global Controls State
  const [purchasePrice, setPurchasePrice] = useState(1050000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [baseHOA, setBaseHOA] = useState(1556.0);
  const [hoaInflation, setHoaInflation] = useState(4.0);
  const [appreciation, setAppreciation] = useState(3.0);
  const [rentInflation, setRentInflation] = useState(3.0);
  const [moveOutYear, setMoveOutYear] = useState(5);
  const [operatingExpenseRate, setOperatingExpenseRate] = useState(0.5);
  const [downPaymentPercent] = useState(20);
  const [loanTermYears] = useState(30);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.18);

  // Opportunity Cost tab state (lifted to App for top bar sliders)
  const [takeHome, setTakeHome] = useState(6000);
  const [nonHousingExpenses, setNonHousingExpenses] = useState(2000);
  const [stockMarketReturn, setStockMarketReturn] = useState(7.0);
  const [equivalentRent, setEquivalentRent] = useState(3300);

  const isRental = selectedYear > moveOutYear;

  const totalRent = isRental
    ? valueInYear(tenantRent, rentInflation, selectedYear)
    : userRent + brotherRent;

  // 1. Property Calculations (Base values)
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = purchasePrice - downPayment;
  const mortgage = calculateMortgagePayment(
    loanAmount,
    interestRate,
    loanTermYears,
  );

  // Dynamic Property Costs based on selectedYear
  const basePropertyTaxAnnual = purchasePrice * (propertyTaxRate / 100);
  const propertyTaxAnnual = valueInYear(
    basePropertyTaxAnnual,
    2,
    selectedYear,
  );
  const propertyTax = propertyTaxAnnual / 12;


  const currentHOAAnnual =
    valueInYear(baseHOA, hoaInflation, selectedYear) * 12;
  const hoa = currentHOAAnnual / 12;

  const propertyCosts = mortgage + propertyTax + hoa;

  // 2. Amortization Schedule
  const amortizationSchedule = useMemo(() => {
    return buildAmortizationSchedule(
      loanAmount,
      interestRate,
      loanTermYears,
      mortgage,
    );
  }, [loanAmount, interestRate, mortgage, loanTermYears]);

  // 3. Tax Calculations
  const currentYearData = amortizationSchedule[selectedYear - 1] || {
    interest: 0,
    principal: 0,
  };
  const totalInterestForYear = currentYearData.interest;
  const totalPrincipalForYear = currentYearData.principal;
  const monthlyInterest = totalInterestForYear / 12;
  const monthlyPrincipal = totalPrincipalForYear / 12;

  // --- Owner Occupied (Schedule A) ---
  const scheduleA = calculateScheduleATaxSavings({
    annualInterest: totalInterestForYear,
    annualPropertyTax: propertyTaxAnnual,
    loanAmount,
  });
  const marginalRate = TAX_ASSUMPTIONS.marginalRate;
  const userTaxShieldScheduleA = scheduleA.monthlyTaxSavings;

  // --- Rental (LLC Partnership — 25% cash flow, 50% tax benefits, REPS active losses) ---
  const llcCashFlowShare = 0.25;
  const llcTaxShare = 0.50;
  
  const buildingRatio = 0.8;
  const depreciationBasis = purchasePrice * buildingRatio;
  const annualDepreciation = depreciationBasis / 27.5;
  const userShareOfDepreciation = annualDepreciation * llcTaxShare;

  const rentalInterest = totalInterestForYear * llcTaxShare;
  const rentalPropertyTax = propertyTaxAnnual * llcTaxShare;
  const rentalHOA = currentHOAAnnual * llcTaxShare;

  // Operating expenses as a % of property value (covers cleaning, repairs, travel, insurance)
  const totalOperatingExpenses = purchasePrice * (operatingExpenseRate / 100);
  const userShareOfOperatingExpenses = totalOperatingExpenses * llcTaxShare;

  const totalRentalDeductions =
    rentalInterest +
    rentalPropertyTax +
    rentalHOA +
    userShareOfDepreciation +
    userShareOfOperatingExpenses;

  // Tax ownership is modeled as two equal LLC members.
  const userShareOfRentIncomeTax = llcTaxShare; 
  const rentalIncomeTax = totalRent * 12 * userShareOfRentIncomeTax;
  const netRentalIncomeTax = rentalIncomeTax - totalRentalDeductions;

  // This scenario assumes REPS and material participation requirements are met.
  const rentalTaxImpact = netRentalIncomeTax * marginalRate; // positive = owe, negative = savings
  const monthlyRentalTaxCost = rentalTaxImpact / 12; // positive = cost, negative = savings

  // Calculate cumulative tax savings from LLC losses up to selectedYear
  const cumulativeTaxSavings = useMemo(() => {
    return calculateCumulativeRentalTaxSavings({
      throughYear: selectedYear,
      moveOutYear,
      amortizationSchedule,
      basePropertyTaxAnnual,
      baseHOAMonthly: baseHOA,
      hoaInflationPercent: hoaInflation,
      tenantRentMonthly: tenantRent,
      rentInflationPercent: rentInflation,
      annualDepreciationShare: userShareOfDepreciation,
      annualOperatingExpenseShare: userShareOfOperatingExpenses,
      taxShare: llcTaxShare,
      marginalRate,
    }).totalSavings;
  }, [
    selectedYear,
    moveOutYear,
    amortizationSchedule,
    basePropertyTaxAnnual,
    baseHOA,
    hoaInflation,
    tenantRent,
    rentInflation,
    userShareOfDepreciation,
    userShareOfOperatingExpenses,
    llcTaxShare,
    marginalRate,
  ]);

  // The actual applied tax shield (added to net cash flow)
  // Owner: positive savings from Schedule A.
  // Rental LLC: if loss → positive savings (reduces W-2 tax). If profit → negative cost.
  const appliedTaxShield = includeTaxSavings
    ? isRental
      ? -monthlyRentalTaxCost // negative * negative = positive savings; or negative cost if profit
      : userTaxShieldScheduleA
    : 0;

  // 4. Distributions
  // Cash flow is permanently 50% Dad, 25% User, 25% Brother
  const dadRentIncome = totalRent * 0.5;
  const dadExpenses = isRental
    ? (propertyCosts + totalOperatingExpenses / 12) * 0.5
    : propertyCosts * 0.5;
  const dadNet = dadRentIncome - dadExpenses;

  const userRentIncome = totalRent * 0.25;
  const userExpenses = isRental
    ? (propertyCosts + totalOperatingExpenses / 12) * llcCashFlowShare
    : propertyCosts * 0.25;
  const userNet = isRental
    ? userRentIncome - userExpenses + appliedTaxShield
    : userRentIncome - userRent - userExpenses + appliedTaxShield;

  const brotherRentIncome = totalRent * 0.25;
  const brotherExpenses = isRental
    ? (propertyCosts + totalOperatingExpenses / 12) * llcCashFlowShare
    : propertyCosts * 0.25;
  const brotherNet = isRental
    ? brotherRentIncome - brotherExpenses + appliedTaxShield
    : brotherRentIncome - brotherRent - brotherExpenses + appliedTaxShield;

  return (
    <div className="app-layout">
      {/* ─── SIDEBAR ─── */}
      <nav className="sidebar" aria-label="Financial model views">
        <div className="sidebar-logo">
          <Home size={22} />
        </div>
        {TAB_CONFIG.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`sidebar-btn ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)}
            title={label}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon size={20} />
            <span className="sidebar-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* ─── TOP BAR ─── */}
      <header className={`topbar ${assumptionsOpen ? "assumptions-open" : ""}`}>
        <div className="topbar-left" style={{ gap: "16px" }}>
          <h1 className="topbar-title">SF Condo Financial Model</h1>

          <button
            type="button"
            className="mobile-assumptions-toggle"
            aria-expanded={assumptionsOpen}
            aria-controls="contextual-assumptions"
            onClick={() => setAssumptionsOpen((open) => !open)}
          >
            <Sliders size={16} /> Assumptions
          </button>

          <div
            id="contextual-assumptions"
            className="contextual-assumptions"
          >
            <ContextualSlider icon={Home} label="Price" value={purchasePrice} setValue={setPurchasePrice} min={900000} max={1500000} step={10000} format="currency" />
            
            {activeTab === "cashflow" && (
              <>
                <ContextualSlider icon={Building} label="HOA" value={baseHOA} setValue={setBaseHOA} min={500} max={2500} step={1} format="currency/mo" />
                <ContextualSlider icon={Clock} label="Move Out" value={moveOutYear} setValue={setMoveOutYear} min={2} max={10} step={1} format="years" />
                {isRental ? (
                  <>
                    <ContextualSlider icon={Users} label="Tenant Rent" value={tenantRent} setValue={setTenantRent} min={5500} max={9000} step={100} format="currency/mo" />
                    <ContextualSlider icon={Wrench} label="OpEx" value={operatingExpenseRate} setValue={setOperatingExpenseRate} min={0} max={5} step={0.1} format="percentage" />
                  </>
                ) : (
                  <>
                    <ContextualSlider icon={User} label="You" value={userRent} setValue={setUserRent} min={2500} max={4000} step={50} format="currency/mo" />
                    <ContextualSlider icon={User} label="Brother" value={brotherRent} setValue={setBrotherRent} min={2500} max={4000} step={50} format="currency/mo" />
                  </>
                )}
              </>
            )}
            
            {activeTab === "loan" && (
              <>
                <ContextualSlider icon={Percent} label="Rate" value={interestRate} setValue={setInterestRate} min={4.0} max={8.0} step={0.125} format="percentage" />
                <ContextualSlider icon={Activity} label="HOA Infl." value={hoaInflation} setValue={setHoaInflation} min={1} max={10} step={0.5} format="percentage" />
              </>
            )}
            
            {activeTab === "taxes" && (
              <>
                <ContextualSlider icon={Landmark} label="Tax Rate" value={propertyTaxRate} setValue={setPropertyTaxRate} min={0.5} max={2.0} step={0.01} format="percentage" />
                <ContextualSlider icon={Clock} label="Move Out" value={moveOutYear} setValue={setMoveOutYear} min={2} max={10} step={1} format="years" />
              </>
            )}
            
            {activeTab === "longterm" && (
              <>
                <ContextualSlider icon={TrendingUp} label="Appreciation" value={appreciation} setValue={setAppreciation} min={0} max={10} step={0.5} format="percentage" />
                <ContextualSlider icon={Clock} label="Move Out" value={moveOutYear} setValue={setMoveOutYear} min={2} max={10} step={1} format="years" />
                <ContextualSlider icon={Activity} label="HOA Infl." value={hoaInflation} setValue={setHoaInflation} min={1} max={10} step={0.5} format="percentage" />
              </>
            )}
            
            {activeTab === "opportunity" && (
              <>
                <ContextualSlider icon={DollarSign} label="Take-Home" value={takeHome} setValue={setTakeHome} min={2000} max={15000} step={100} format="currency/mo" />
                <ContextualSlider icon={DollarSign} label="Expenses" value={nonHousingExpenses} setValue={setNonHousingExpenses} min={500} max={8000} step={100} format="currency/mo" />
                <ContextualSlider icon={TrendingUp} label="S&P 500" value={stockMarketReturn} setValue={setStockMarketReturn} min={0} max={15} step={0.5} format="percentage" />
                <ContextualSlider icon={Home} label="Eq. Rent" value={equivalentRent} setValue={setEquivalentRent} min={500} max={5000} step={50} format="currency/mo" />
                <ContextualSlider icon={TrendingUp} label="Rent Infl." value={rentInflation} setValue={setRentInflation} min={0} max={10} step={0.5} format="percentage" />
                <ContextualSlider icon={TrendingUp} label="Apprec." value={appreciation} setValue={setAppreciation} min={0} max={10} step={0.5} format="percentage" />
              </>
            )}
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-badges">
            <div className="year-badge-container">
              <div className="year-text">
                <Clock size={13} />
                Year {selectedYear}
              </div>
              <div className="year-slider-inline">
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="slider blue-slider"
                  aria-label="Projection year"
                  style={{ width: "140px", margin: 0, flexShrink: 0 }}
                />
              </div>
            </div>
            <label 
              className="topbar-badge" 
              style={{ 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                gap: "6px",
                background: includeTaxSavings ? "rgba(52, 211, 153, 0.1)" : "rgba(255, 255, 255, 0.05)",
                borderColor: includeTaxSavings ? "rgba(52, 211, 153, 0.3)" : "rgba(255, 255, 255, 0.08)",
                color: includeTaxSavings ? "var(--positive)" : "var(--text-secondary)"
              }}
            >
              <input 
                type="checkbox" 
                checked={includeTaxSavings} 
                onChange={(e) => setIncludeTaxSavings(e.target.checked)} 
                style={{ margin: 0, cursor: "pointer" }} 
              />
              Tax Savings
            </label>
            <span 
              className={`topbar-badge ${isRental ? "badge-purple" : "badge-blue"}`}
              style={{ cursor: "default", width: "64px", display: "inline-flex", justifyContent: "center" }}
              title="Automatically toggles based on Year > Move Out Year"
            >
              {isRental ? "Rental" : "Owner"}
            </span>
            <span className={`topbar-badge ${userNet >= 0 ? "badge-green" : "badge-red"}`} style={{ width: "125px", display: "inline-flex", justifyContent: "center" }}>
              Net: {formatCurrency(userNet)}/mo
            </span>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content" id="main-content">
        <h2 className="tab-page-title">
          {activeTab === "cashflow" && "Monthly Cash Flow"}
          {activeTab === "loan" && "Loan Details"}
          {activeTab === "taxes" && "Tax Implications"}
          {activeTab === "longterm" && "Long-Term Equity"}
          {activeTab === "opportunity" && "Opportunity Cost"}
        </h2>
        {activeTab === "cashflow" && (
          <CashFlowTab
            isRental={isRental}
            userRent={userRent}
            setUserRent={setUserRent}
            brotherRent={brotherRent}
            setBrotherRent={setBrotherRent}
            tenantRent={tenantRent}
            setTenantRent={setTenantRent}
            includeTaxSavings={includeTaxSavings}
            totalRent={totalRent}
            dadExpenses={dadExpenses}
            dadRentIncome={dadRentIncome}
            dadNet={dadNet}
            userExpenses={userExpenses}
            userRentIncome={userRentIncome}
            userNet={userNet}
            userTaxShield={appliedTaxShield}
            brotherExpenses={brotherExpenses}
            brotherRentIncome={brotherRentIncome}
            brotherNet={brotherNet}
            propertyCosts={propertyCosts}
            mortgage={mortgage}
            propertyTax={propertyTax}
            hoa={hoa}
            totalOperatingExpenses={totalOperatingExpenses}
          />
        )}

        {activeTab === "loan" && (
          <LoanTab
            purchasePrice={purchasePrice}
            downPaymentPercent={downPaymentPercent}
            loanAmount={loanAmount}
            mortgage={mortgage}
            propertyTaxRate={propertyTaxRate}
            propertyTax={propertyTax}
            hoa={hoa}
            propertyCosts={propertyCosts}
            loanTermYears={loanTermYears}
            amortizationSchedule={amortizationSchedule}
            selectedYear={selectedYear}
          />
        )}

        {activeTab === "taxes" && (
          <TaxTab
            isRental={isRental}
            selectedYear={selectedYear}
            monthlyInterest={monthlyInterest}
            monthlyPrincipal={monthlyPrincipal}
            propertyTax={propertyTax}
            hoa={hoa}
            mortgage={mortgage}
            scheduleA={scheduleA}
            // Rental LLC props passed down from App
            purchasePrice={purchasePrice}
            rentalInterest={rentalInterest}
            rentalPropertyTax={rentalPropertyTax}
            rentalHOA={rentalHOA}
            userShareOfDepreciation={userShareOfDepreciation}
            userShareOfOperatingExpenses={userShareOfOperatingExpenses}
            totalOperatingExpenses={totalOperatingExpenses}
            operatingExpenseRate={operatingExpenseRate}
            totalRentalDeductions={totalRentalDeductions}
            rentalIncome={rentalIncomeTax}
            netRentalIncome={netRentalIncomeTax}
            rentalTaxImpact={rentalTaxImpact}
            monthlyRentalTaxCost={monthlyRentalTaxCost}
            cumulativeTaxSavings={cumulativeTaxSavings}
            llcShare={llcTaxShare}
            userShareOfRentIncome={userShareOfRentIncomeTax}
          />
        )}

        {activeTab === "longterm" && (
          <LongTermTab
            selectedYear={selectedYear}
            purchasePrice={purchasePrice}
            amortizationSchedule={amortizationSchedule}
            baseHOA={baseHOA}
            basePropertyTaxAnnual={basePropertyTaxAnnual}
            hoaInflation={hoaInflation}
            appreciation={appreciation}
            moveOutYear={moveOutYear}
          />
        )}

        {activeTab === "opportunity" && (
          <OpportunityCostTab
            purchasePrice={purchasePrice}
            loanAmount={loanAmount}
            mortgage={mortgage}
            baseHOA={baseHOA}
            basePropertyTaxAnnual={basePropertyTaxAnnual}
            hoaInflation={hoaInflation}
            appreciation={appreciation}
            userRent={userRent}
            brotherRent={brotherRent}
            tenantRent={tenantRent}
            operatingExpenseRate={operatingExpenseRate}
            moveOutYear={moveOutYear}
            selectedYear={selectedYear}
            amortizationSchedule={amortizationSchedule}
            rentInflation={rentInflation}
            takeHome={takeHome}
            nonHousingExpenses={nonHousingExpenses}
            stockMarketReturn={stockMarketReturn}
            equivalentRent={equivalentRent}
            includeTaxSavings={includeTaxSavings}
          />
        )}
      </main>
    </div>
  );
}

export default App;
