import React, { useEffect, useMemo, useRef, useState } from "react";
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
  calculateOwnerCashFlows,
  calculateMortgagePayment,
  calculateScheduleATaxSavings,
  TAX_ASSUMPTIONS,
  valueInYear,
} from "./financialModel";
import {
  DEFAULT_INPUTS,
  encodeInputs,
  inputsFromHash,
  normalizeInputs,
} from "./scenario";
import OwnersPanel from "./OwnersPanel";
import ScenarioMenu from "./ScenarioMenu";

const TAB_CONFIG = [
  { id: "cashflow", icon: DollarSign, label: "Cash Flow" },
  { id: "loan", icon: Building, label: "Loan" },
  { id: "taxes", icon: Calculator, label: "Taxes" },
  { id: "longterm", icon: TrendingUp, label: "Long-Term" },
  { id: "opportunity", icon: Scale, label: "Buy vs Rent" },
];

const loadInputs = () =>
  inputsFromHash(typeof window === "undefined" ? "" : window.location.hash) ??
  normalizeInputs(DEFAULT_INPUTS);

function App() {
  const [activeTab, setActiveTab] = useState("cashflow");
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const mainRef = useRef(null);

  // Each tab starts at the top instead of keeping the last tab's scroll position.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activeTab]);

  // Every input lives in one scenario object so it can be shared by URL
  // and exported/imported as JSON.
  const [inputs, setInputs] = useState(loadInputs);
  const set = (key) => (value) =>
    setInputs((prev) => ({
      ...prev,
      [key]: typeof value === "function" ? value(prev[key]) : value,
    }));
  const {
    owners,
    tenantRent,
    includeTaxSavings,
    isRental,
    selectedYear,
    purchasePrice,
    interestRate,
    baseHOA,
    hoaInflation,
    appreciation,
    rentInflation,
    moveOutYear,
    operatingExpenseRate,
    downPaymentPercent,
    propertyTaxRate,
    takeHome,
    nonHousingExpenses,
    stockMarketReturn,
    equivalentRent,
  } = inputs;
  const setOwners = set("owners");
  const setTenantRent = set("tenantRent");
  const setIncludeTaxSavings = set("includeTaxSavings");
  const setSelectedYear = set("selectedYear");
  const setPurchasePrice = set("purchasePrice");
  const setInterestRate = set("interestRate");
  const setBaseHOA = set("baseHOA");
  const setHoaInflation = set("hoaInflation");
  const setAppreciation = set("appreciation");
  const setRentInflation = set("rentInflation");
  const setMoveOutYear = set("moveOutYear");
  const setOperatingExpenseRate = set("operatingExpenseRate");
  const setDownPaymentPercent = set("downPaymentPercent");
  const setPropertyTaxRate = set("propertyTaxRate");
  const setTakeHome = set("takeHome");
  const setNonHousingExpenses = set("nonHousingExpenses");
  const setStockMarketReturn = set("stockMarketReturn");
  const setEquivalentRent = set("equivalentRent");
  const loanTermYears = 30;

  // Keep the URL in sync so the current scenario is always shareable, and
  // follow the hash when someone pastes a different shared link.
  useEffect(() => {
    const hash = `#s=${encodeInputs(inputs)}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
  }, [inputs]);
  useEffect(() => {
    const onHash = () => {
      const next = inputsFromHash(window.location.hash);
      if (next) setInputs(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // "You" is the perspective for the tax views, Buy vs Rent and the top bar.
  const you = owners.find((o) => o.isYou) ?? owners[0];

  // Owner-occupied vs rental view for Cash Flow and Taxes. Independent of
  // the year; Long-Term and Buy vs Rent follow the Move Out timeline instead.
  const toggleOccupancy = () => set("isRental")((rental) => !rental);

  // Rental years counted toward cumulative tax savings: after move-out, or
  // from year 1 when viewing a rental year before the planned move-out.
  const rentalStartsAfterYear =
    isRental && selectedYear <= moveOutYear ? 0 : moveOutYear;

  const ownerRentTotal = owners.reduce((sum, o) => sum + o.rent, 0);
  const totalRent = isRental
    ? valueInYear(tenantRent, rentInflation, selectedYear)
    : ownerRentTotal;

  // 1. Property Calculations (Base values)
  const cashToClose = calculateCashToClose({ purchasePrice, downPaymentPercent, owners });
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
  // Deductions follow each owner's share of the title and loan.
  const scheduleAFor = (owner) =>
    calculateScheduleATaxSavings({
      annualInterest: totalInterestForYear,
      annualPropertyTax: propertyTaxAnnual,
      loanAmount,
      ownerShare: owner.title / 100,
    });
  const scheduleA = scheduleAFor(you);
  const marginalRate = TAX_ASSUMPTIONS.marginalRate;

  // --- Rental (LLC partnership: cash flow by equity, tax items by title share, REPS active losses) ---
  const llcTaxShare = you.title / 100;

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

  // Monthly tax effect per owner, added to their net cash flow.
  // Owner: Schedule A savings. Rental LLC: a loss saves tax, a profit costs tax.
  const fullRentalNetIncome =
    totalRent * 12 -
    (totalInterestForYear +
      propertyTaxAnnual +
      currentHOAAnnual +
      annualDepreciation +
      totalOperatingExpenses);
  const taxShieldFor = (owner) => {
    if (!includeTaxSavings || owner.title <= 0) return 0;
    return isRental
      ? -(fullRentalNetIncome * (owner.title / 100) * marginalRate) / 12
      : scheduleAFor(owner).monthlyTaxSavings;
  };

  // 4. Distributions: costs and rent income split by each owner's equity.
  const ownerFlows = calculateOwnerCashFlows({
    owners,
    isRental,
    totalRent,
    costs: {
      mortgage,
      propertyTax,
      hoa,
      opex: totalOperatingExpenses / 12,
    },
    taxShieldFor,
  });
  const userNet = ownerFlows.find((o) => o.id === you.id).net;
  const titleHolders = owners
    .filter((o) => o.title > 0)
    .map((o) => ({ ...o, scheduleA: scheduleAFor(o) }));
  // Section 121: each owner on title who lived there gets their own exclusion.
  const exclusionOwners = owners.filter((o) => o.title > 0 && o.rent > 0).length;

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
            <ScenarioMenu
              inputs={inputs}
              onLoad={(next) => setInputs(normalizeInputs(next))}
              onReset={() => setInputs(normalizeInputs(DEFAULT_INPUTS))}
            />
            <span className={`topbar-badge net-badge ${userNet >= 0 ? "badge-green" : "badge-red"}`}>
              <span className="net-label-long">{you.name === "You" ? "Your" : `${you.name}'s`} net:</span>
              <span className="net-label-short">Net</span> {formatCurrency(userNet)}/mo
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
          <AssumptionSlider icon={Home} label="Price" value={purchasePrice} setValue={setPurchasePrice} min={100000} max={5000000} step={5000} />
          <AssumptionSlider icon={PiggyBank} label="Down" value={downPaymentPercent} setValue={setDownPaymentPercent} min={10} max={50} step={5} format="percentage" />
          <AssumptionSlider icon={Percent} label="Rate" value={interestRate} setValue={setInterestRate} min={4} max={8} step={0.125} format="percentage" />
          <AssumptionSlider icon={Building} label="HOA" value={baseHOA} setValue={setBaseHOA} min={0} max={3000} step={10} format="currency/mo" />
          <AssumptionSlider icon={Landmark} label="Prop. Tax" value={propertyTaxRate} setValue={setPropertyTaxRate} min={0.5} max={2} step={0.01} format="percentage" />
          <AssumptionSlider icon={Clock} label="Move Out" value={moveOutYear} setValue={setMoveOutYear} min={2} max={10} step={1} format="years" />
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content" id="main-content" ref={mainRef}>
        <h2 className="tab-page-title">
          {activeTab === "cashflow" && "Monthly Cash Flow"}
          {activeTab === "loan" && "Loan Details"}
          {activeTab === "taxes" && "Tax Implications"}
          {activeTab === "longterm" && "Long-Term Equity"}
          {activeTab === "opportunity" && "Opportunity Cost"}
        </h2>
        {activeTab === "cashflow" && (
          <>
          <OwnersPanel owners={owners} setOwners={setOwners} isRental={isRental} />
          <AssumptionPanel title="Rent" note={isRental ? "Rental view: tenant rent applies" : "Owner-occupied view: residents' rent from the owners table applies"}>
              <AssumptionSlider icon={Users} label="Tenant Rent" hint="rental view" value={tenantRent} setValue={setTenantRent} min={1000} max={20000} step={100} format="currency/mo" />
              <AssumptionSlider icon={Wrench} label="Operating Expenses" hint="% of price / yr" value={operatingExpenseRate} setValue={setOperatingExpenseRate} min={0} max={5} step={0.1} format="percentage" />
              <AssumptionSlider icon={TrendingUp} label="Rent Growth" hint="per year" value={rentInflation} setValue={setRentInflation} min={0} max={10} step={0.5} format="percentage" />
          </AssumptionPanel>
          <CashFlowTab
            isRental={isRental}
            owners={ownerFlows}
            includeTaxSavings={includeTaxSavings}
            totalRent={totalRent}
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
            owners={owners}
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
              <AssumptionSlider icon={Users} label="Tenant Rent" hint="rental view" value={tenantRent} setValue={setTenantRent} min={1000} max={20000} step={100} format="currency/mo" />
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
            titleHolders={titleHolders}
            youId={you.id}
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
            exclusionOwners={exclusionOwners}
          />
          </>
        )}

        {activeTab === "opportunity" && (
          <>
          <AssumptionPanel title="Your Budget & Markets">
              <AssumptionSlider icon={DollarSign} label="Take-Home Pay" value={takeHome} setValue={setTakeHome} min={2000} max={15000} step={100} format="currency/mo" />
              <AssumptionSlider icon={DollarSign} label="Non-Housing Expenses" value={nonHousingExpenses} setValue={setNonHousingExpenses} min={500} max={8000} step={100} format="currency/mo" />
              <AssumptionSlider icon={Home} label="Equivalent Rent" hint="if you rented instead" value={equivalentRent} setValue={setEquivalentRent} min={500} max={10000} step={50} format="currency/mo" />
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
            youShare={you.equity / 100}
            youTitleShare={you.title / 100}
            youRent={you.rent}
            ownerRentTotal={ownerRentTotal}
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
