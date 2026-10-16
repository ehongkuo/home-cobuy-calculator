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
  ArrowLeftRight,
  PiggyBank,
} from "lucide-react";
import CashFlowTab from "./CashFlowTab";
import LoanTab from "./LoanTab";
import TaxTab from "./TaxTab";
import LongTermTab from "./LongTermTab";
import OpportunityCostTab from "./OpportunityCostTab";
import { AssumptionPanel, AssumptionSlider } from "./Assumption";
import { formatCurrency } from "./utils";
import {
  buildAmortizationSchedule,
  calculateCashToClose,
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

function App() {
  const [activeTab, setActiveTab] = useState("cashflow");
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  // Shared state
  const [userRent, setUserRent] = useState(3200);
  const [coOwnerRent, setCoOwnerRent] = useState(3000);
  const [tenantRent, setTenantRent] = useState(6500);
  const [includeTaxSavings, setIncludeTaxSavings] = useState(true);
  const [selectedYear, setSelectedYear] = useState(1);

  // Global Controls State
  const [purchasePrice, setPurchasePrice] = useState(1050000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [baseHOA, setBaseHOA] = useState(1500);
  const [hoaInflation, setHoaInflation] = useState(4.0);
  const [appreciation, setAppreciation] = useState(3.0);
  const [rentInflation, setRentInflation] = useState(3.0);
  const [moveOutYear, setMoveOutYear] = useState(5);
  const [operatingExpenseRate, setOperatingExpenseRate] = useState(0.5);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [loanTermYears] = useState(30);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.18);

  // Opportunity Cost tab state (lifted to App for top bar sliders)
  const [takeHome, setTakeHome] = useState(6000);
  const [nonHousingExpenses, setNonHousingExpenses] = useState(2000);
  const [stockMarketReturn, setStockMarketReturn] = useState(7.0);
  const [equivalentRent, setEquivalentRent] = useState(3300);

  // Owner-occupied vs rental view for Cash Flow and Taxes. Independent of
  // the year; Long-Term and Buy vs Rent follow the Move Out timeline instead.
  const [isRental, setIsRental] = useState(false);
  const toggleOccupancy = () => setIsRental((rental) => !rental);

  // Rental years counted toward cumulative tax savings: after move-out, or
  // from year 1 when viewing a rental year before the planned move-out.
  const rentalStartsAfterYear =
    isRental && selectedYear <= moveOutYear ? 0 : moveOutYear;

  const totalRent = isRental
    ? valueInYear(tenantRent, rentInflation, selectedYear)
    : userRent + coOwnerRent;

  // 1. Property Calculations (Base values)
  const cashToClose = calculateCashToClose({ purchasePrice, downPaymentPercent });
  const loanAmount = purchasePrice - cashToClose.downPayment;
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
      moveOutYear: rentalStartsAfterYear,
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
    rentalStartsAfterYear,
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
  // Cash flow is permanently 50% investor, 25% you, 25% co-owner
  const investorRentIncome = totalRent * 0.5;
  const investorExpenses = isRental
    ? (propertyCosts + totalOperatingExpenses / 12) * 0.5
    : propertyCosts * 0.5;
  const investorNet = investorRentIncome - investorExpenses;

  const userRentIncome = totalRent * 0.25;
  const userExpenses = isRental
    ? (propertyCosts + totalOperatingExpenses / 12) * llcCashFlowShare
    : propertyCosts * 0.25;
  const userNet = isRental
    ? userRentIncome - userExpenses + appliedTaxShield
    : userRentIncome - userRent - userExpenses + appliedTaxShield;

  const coOwnerRentIncome = totalRent * 0.25;
  const coOwnerExpenses = isRental
    ? (propertyCosts + totalOperatingExpenses / 12) * llcCashFlowShare
    : propertyCosts * 0.25;
  const coOwnerNet = isRental
    ? coOwnerRentIncome - coOwnerExpenses + appliedTaxShield
    : coOwnerRentIncome - coOwnerRent - coOwnerExpenses + appliedTaxShield;

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
        <div className="topbar-row">
          <h1 className="topbar-title">Real Estate Co-Buy Calculator</h1>

          <div className="year-control">
            <label htmlFor="projection-year" className="year-control-label">
              <Clock size={14} /> Year <strong>{selectedYear}</strong>
            </label>
            <input
              id="projection-year"
              type="range"
              min={1}
              max={30}
              step={1}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="assumption-range"
              style={{ "--fill": `${((selectedYear - 1) / 29) * 100}%` }}
              aria-label="Projection year"
            />
          </div>

          <div className="topbar-status">
            <button
              type="button"
              className={`topbar-badge occupancy-toggle ${isRental ? "badge-purple" : "badge-blue"}`}
              onClick={toggleOccupancy}
              aria-pressed={isRental}
              title={
                isRental
                  ? "Viewing as a rental property. Click to view as owner-occupied."
                  : "Viewing as owner-occupied. Click to view as a rental property."
              }
            >
              <ArrowLeftRight size={12} />
              {isRental ? "Rental" : "Owner"}
            </button>
            <label className={`topbar-badge tax-toggle ${includeTaxSavings ? "is-on" : ""}`}>
              <input
                type="checkbox"
                checked={includeTaxSavings}
                onChange={(e) => setIncludeTaxSavings(e.target.checked)}
              />
              Tax Savings
            </label>
            <span className={`topbar-badge net-badge ${userNet >= 0 ? "badge-green" : "badge-red"}`}>
              Your net: {formatCurrency(userNet)}/mo
            </span>
          </div>

          <button
            type="button"
            className="mobile-assumptions-toggle"
            aria-expanded={assumptionsOpen}
            aria-controls="global-assumptions"
            onClick={() => setAssumptionsOpen((open) => !open)}
          >
            <Sliders size={16} /> Deal terms
          </button>
        </div>

        <div id="global-assumptions" className="global-assumptions">
          <AssumptionSlider icon={Home} label="Price" value={purchasePrice} setValue={setPurchasePrice} min={900000} max={1500000} step={10000} />
          <AssumptionSlider icon={PiggyBank} label="Down" value={downPaymentPercent} setValue={setDownPaymentPercent} min={10} max={50} step={5} format="percentage" />
          <AssumptionSlider icon={Percent} label="Rate" value={interestRate} setValue={setInterestRate} min={4} max={8} step={0.125} format="percentage" />
          <AssumptionSlider icon={Building} label="HOA" value={baseHOA} setValue={setBaseHOA} min={500} max={2500} step={10} format="currency/mo" />
          <AssumptionSlider icon={Landmark} label="Prop. Tax" value={propertyTaxRate} setValue={setPropertyTaxRate} min={0.5} max={2} step={0.01} format="percentage" />
          <AssumptionSlider icon={Clock} label="Move Out" value={moveOutYear} setValue={setMoveOutYear} min={2} max={10} step={1} format="years" />
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
          <>
          <AssumptionPanel title="Rent" note={isRental ? "Rental view: tenant rent applies" : "Owner-occupied view: your and your co-owner's rent apply"}>
              <AssumptionSlider icon={User} label="Your Rent" hint="owner view" value={userRent} setValue={setUserRent} min={2500} max={4000} step={50} format="currency/mo" />
              <AssumptionSlider icon={User} label="Co-owner's Rent" hint="owner view" value={coOwnerRent} setValue={setCoOwnerRent} min={2500} max={4000} step={50} format="currency/mo" />
              <AssumptionSlider icon={Users} label="Tenant Rent" hint="rental view" value={tenantRent} setValue={setTenantRent} min={5500} max={9000} step={100} format="currency/mo" />
              <AssumptionSlider icon={Wrench} label="Operating Expenses" hint="% of price / yr" value={operatingExpenseRate} setValue={setOperatingExpenseRate} min={0} max={5} step={0.1} format="percentage" />
              <AssumptionSlider icon={TrendingUp} label="Rent Growth" hint="per year" value={rentInflation} setValue={setRentInflation} min={0} max={10} step={0.5} format="percentage" />
          </AssumptionPanel>
          <CashFlowTab
            isRental={isRental}
            userRent={userRent}
            setUserRent={setUserRent}
            coOwnerRent={coOwnerRent}
            setCoOwnerRent={setCoOwnerRent}
            tenantRent={tenantRent}
            setTenantRent={setTenantRent}
            includeTaxSavings={includeTaxSavings}
            totalRent={totalRent}
            investorExpenses={investorExpenses}
            investorRentIncome={investorRentIncome}
            investorNet={investorNet}
            userExpenses={userExpenses}
            userRentIncome={userRentIncome}
            userNet={userNet}
            userTaxShield={appliedTaxShield}
            coOwnerExpenses={coOwnerExpenses}
            coOwnerRentIncome={coOwnerRentIncome}
            coOwnerNet={coOwnerNet}
            propertyCosts={propertyCosts}
            mortgage={mortgage}
            monthlyInterest={monthlyInterest}
            monthlyPrincipal={monthlyPrincipal}
            propertyTax={propertyTax}
            hoa={hoa}
            totalOperatingExpenses={totalOperatingExpenses}
            cashToClose={cashToClose}
            onShowLoan={() => setActiveTab("loan")}
          />
          </>
        )}

        {activeTab === "loan" && (
          <LoanTab
            purchasePrice={purchasePrice}
            downPaymentPercent={downPaymentPercent}
            cashToClose={cashToClose}
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
          <>
          <AssumptionPanel title="Rental Inputs" note="Used in the rental view; tax brackets live in TAX_ASSUMPTIONS">
              <AssumptionSlider icon={Users} label="Tenant Rent" hint="rental view" value={tenantRent} setValue={setTenantRent} min={5500} max={9000} step={100} format="currency/mo" />
              <AssumptionSlider icon={Wrench} label="Operating Expenses" hint="% of price / yr" value={operatingExpenseRate} setValue={setOperatingExpenseRate} min={0} max={5} step={0.1} format="percentage" />
              <AssumptionSlider icon={TrendingUp} label="Rent Growth" hint="per year" value={rentInflation} setValue={setRentInflation} min={0} max={10} step={0.5} format="percentage" />
          </AssumptionPanel>
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
          </>
        )}

        {activeTab === "longterm" && (
          <>
          <AssumptionPanel title="Growth">
              <AssumptionSlider icon={TrendingUp} label="Appreciation" hint="per year" value={appreciation} setValue={setAppreciation} min={0} max={10} step={0.5} format="percentage" />
              <AssumptionSlider icon={Activity} label="HOA Growth" hint="per year" value={hoaInflation} setValue={setHoaInflation} min={1} max={10} step={0.5} format="percentage" />
          </AssumptionPanel>
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
          </>
        )}

        {activeTab === "opportunity" && (
          <>
          <AssumptionPanel title="Your Budget & Markets">
              <AssumptionSlider icon={DollarSign} label="Take-Home Pay" value={takeHome} setValue={setTakeHome} min={2000} max={15000} step={100} format="currency/mo" />
              <AssumptionSlider icon={DollarSign} label="Non-Housing Expenses" value={nonHousingExpenses} setValue={setNonHousingExpenses} min={500} max={8000} step={100} format="currency/mo" />
              <AssumptionSlider icon={Home} label="Equivalent Rent" hint="if you rented instead" value={equivalentRent} setValue={setEquivalentRent} min={500} max={5000} step={50} format="currency/mo" />
              <AssumptionSlider icon={TrendingUp} label="Rent Growth" hint="per year" value={rentInflation} setValue={setRentInflation} min={0} max={10} step={0.5} format="percentage" />
              <AssumptionSlider icon={TrendingUp} label="S&P 500 Return" hint="per year" value={stockMarketReturn} setValue={setStockMarketReturn} min={0} max={15} step={0.5} format="percentage" />
              <AssumptionSlider icon={TrendingUp} label="Appreciation" hint="per year" value={appreciation} setValue={setAppreciation} min={0} max={10} step={0.5} format="percentage" />
          </AssumptionPanel>
          <OpportunityCostTab
            purchasePrice={purchasePrice}
            loanAmount={loanAmount}
            mortgage={mortgage}
            baseHOA={baseHOA}
            basePropertyTaxAnnual={basePropertyTaxAnnual}
            hoaInflation={hoaInflation}
            appreciation={appreciation}
            userRent={userRent}
            coOwnerRent={coOwnerRent}
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
          </>
        )}
      </main>
    </div>
  );
}

export default App;
