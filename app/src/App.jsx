import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Landmark, Scale, TrendingUp, Wallet } from "lucide-react";
import CashFlowTab from "./CashFlowTab";
import LoanTab from "./LoanTab";
import TaxTab from "./TaxTab";
import LongTermTab from "./LongTermTab";
import OpportunityCostTab from "./OpportunityCostTab";
import { AssumptionPanel, AssumptionSlider } from "./Assumption";
import { formatCurrency } from "./utils";
import {
  annualDepreciation,
  averageLoanBalance,
  buildAmortizationSchedule,
  calculateCashToClose,
  calculateCumulativeRentalTaxSavings,
  calculateOwnerCashFlows,
  calculateMortgagePayment,
  calculateScheduleATaxSavings,
  PROPERTY_TAX_GROWTH,
  rentalTaxForYear,
  TAX_ASSUMPTIONS,
  valueInYear,
} from "./financialModel";
import {
  DEFAULT_INPUTS,
  encodeInputs,
  INPUT_RANGES as R,
  inputsFromHash,
  normalizeInputs,
} from "./scenario";
import OwnersPanel from "./OwnersPanel";
import ScenarioMenu from "./ScenarioMenu";

const TAB_CONFIG = [
  { id: "cashflow", icon: Wallet, label: "Cash flow", title: "Monthly cash flow" },
  { id: "loan", icon: Landmark, label: "Loan", title: "Loan details" },
  { id: "taxes", icon: FileText, label: "Taxes", title: "Tax implications" },
  { id: "longterm", icon: TrendingUp, label: "Long-term", title: "Long-term equity" },
  { id: "opportunity", icon: Scale, label: "Buy vs rent", title: "Buy vs rent" },
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
    PROPERTY_TAX_GROWTH,
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
      loanBalance: averageLoanBalance(amortizationSchedule, loanAmount, selectedYear),
      ownerShare: owner.title / 100,
    });
  const scheduleA = scheduleAFor(you);
  const marginalRate = TAX_ASSUMPTIONS.marginalRate;

  // --- Rental (LLC partnership: cash flow by equity, tax items by title share, REPS active losses) ---
  const llcTaxShare = you.title / 100;

  const depreciation = annualDepreciation(purchasePrice);
  // Operating expenses as a % of property value (covers cleaning, repairs, travel, insurance)
  const totalOperatingExpenses = purchasePrice * (operatingExpenseRate / 100);
  const rentalYearFor = (taxShare) =>
    rentalTaxForYear({
      rentAnnual: totalRent * 12,
      interest: totalInterestForYear,
      propertyTax: propertyTaxAnnual,
      hoaAnnual: currentHOAAnnual,
      opexAnnual: totalOperatingExpenses,
      depreciation,
      taxShare,
      marginalRate,
    });
  // This scenario assumes REPS and material participation requirements are met.
  const rentalYear = rentalYearFor(llcTaxShare);

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
      annualDepreciation: depreciation,
      annualOperatingExpenses: totalOperatingExpenses,
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
    depreciation,
    totalOperatingExpenses,
    llcTaxShare,
    marginalRate,
  ]);

  // Monthly tax effect per owner, added to their net cash flow.
  // Owner: Schedule A savings. Rental LLC: a loss saves tax, a profit costs tax.
  const taxShieldFor = (owner) => {
    if (!includeTaxSavings || owner.title <= 0) return 0;
    return isRental
      ? -rentalYearFor(owner.title / 100).tax / 12
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

  const activeLabel = TAB_CONFIG.find((t) => t.id === activeTab).title;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-row">
          <div className="brand">
            <svg className="brand-mark" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="6" />
              <path d="M8 15.5 16 9l8 6.5V24h-5.5v-5h-5v5H8z" />
            </svg>
            <div>
              <p className="brand-name">Co-Buy Calculator</p>
              <p className="brand-tag">Shared home purchase model</p>
            </div>
          </div>
          <ScenarioMenu
            inputs={inputs}
            onLoad={(next) => setInputs(normalizeInputs(next))}
            onReset={() => setInputs(normalizeInputs(DEFAULT_INPUTS))}
          />
        </div>

        <div className="app-header-row app-subbar">
          <nav className="tabs" aria-label="Sections">
            {TAB_CONFIG.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                className={`tab ${activeTab === id ? "active" : ""}`}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? "page" : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="view-controls">
            <div className="segmented" role="group" aria-label="View">
              <button type="button" aria-pressed={!isRental} onClick={() => isRental && toggleOccupancy()}>
                Owner-occupied
              </button>
              <button type="button" aria-pressed={isRental} onClick={() => !isRental && toggleOccupancy()}>
                Rental
              </button>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={includeTaxSavings}
                onChange={(e) => set("includeTaxSavings")(e.target.checked)}
              />
              Include tax savings
            </label>
            <div className="year-control">
              <label htmlFor="projection-year">
                Year <strong>{selectedYear}</strong>
              </label>
              <input
                id="projection-year"
                type="range"
                min={1}
                max={30}
                step={1}
                value={selectedYear}
                onChange={(e) => set("selectedYear")(Number(e.target.value))}
                className="assumption-range"
                style={{ "--fill": `${((selectedYear - 1) / 29) * 100}%` }}
                aria-label="Projection year"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="main-content" id="main-content" ref={mainRef}>
        <div className="page">
          <section
            id="global-assumptions"
            className={`deal-terms ${assumptionsOpen ? "is-open" : ""}`}
            aria-labelledby="deal-terms-title"
          >
            <div className="deal-terms-head">
              <h2 id="deal-terms-title">Deal terms</h2>
              <span className="deal-terms-note">Applies to every tab</span>
              <button
                type="button"
                className="deal-terms-toggle"
                aria-expanded={assumptionsOpen}
                aria-controls="deal-terms-grid"
                onClick={() => setAssumptionsOpen((open) => !open)}
              >
                <span className="deal-terms-summary">
                  {formatCurrency(purchasePrice)} · {interestRate}%
                </span>
                {assumptionsOpen ? "Done" : "Edit"}
              </button>
            </div>
            <div id="deal-terms-grid" className="deal-terms-grid">
              <AssumptionSlider label="Purchase price" value={purchasePrice} setValue={set("purchasePrice")} {...R.purchasePrice} />
              <AssumptionSlider label="Down payment" value={downPaymentPercent} setValue={set("downPaymentPercent")} {...R.downPaymentPercent} format="percentage" />
              <AssumptionSlider label="Interest rate" value={interestRate} setValue={set("interestRate")} {...R.interestRate} format="percentage" />
              <AssumptionSlider label="HOA" value={baseHOA} setValue={set("baseHOA")} {...R.baseHOA} format="currency/mo" />
              <AssumptionSlider label="Property tax rate" value={propertyTaxRate} setValue={set("propertyTaxRate")} {...R.propertyTaxRate} format="percentage" />
              <AssumptionSlider label="Move-out year" value={moveOutYear} setValue={set("moveOutYear")} {...R.moveOutYear} format="years" />
            </div>
          </section>

          <div className="page-head">
            <h1 className="tab-page-title">{activeLabel}</h1>
            <p className="page-subtitle">
              Year {selectedYear} · {isRental ? "Rental" : "Owner-occupied"} ·{" "}
              {includeTaxSavings ? "With" : "Without"} tax savings ·{" "}
              <strong>
                {you.name === "You" ? "Your" : `${you.name}'s`} net {formatCurrency(userNet)}/mo
              </strong>
            </p>
          </div>

        {activeTab === "cashflow" && (
          <>
          <OwnersPanel owners={owners} setOwners={setOwners} />
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
            rentPanel={
          <AssumptionPanel title="Rent" note={isRental ? "Tenant rent applies" : "Residents' rent applies"}>
              {owners
                .filter((o) => o.rent > 0)
                .map((o) => (
                  <AssumptionSlider
                    key={o.id}
                    label={o.isYou && o.name === "You" ? "Your rent" : `${o.name}'s rent`}
                    hint="while living there"
                    value={o.rent}
                    setValue={(rent) => setOwners((list) => list.map((x) => (x.id === o.id ? { ...x, rent } : x)))}
                    min={500}
                    max={10000}
                    step={50}
                    format="currency/mo"
                  />
                ))}
              <AssumptionSlider label="Tenant rent" hint="rental years" value={tenantRent} setValue={set("tenantRent")} {...R.tenantRent} format="currency/mo" />
              <AssumptionSlider label="Operating costs" hint="% of price a year" value={operatingExpenseRate} setValue={set("operatingExpenseRate")} {...R.operatingExpenseRate} format="percentage" />
              <AssumptionSlider label="Rent growth" hint="per year" value={rentInflation} setValue={set("rentInflation")} {...R.rentInflation} format="percentage" />
          </AssumptionPanel>
            }
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
          <AssumptionPanel title="Rental inputs" note="Used in rental years">
              <AssumptionSlider label="Tenant rent" hint="rental years" value={tenantRent} setValue={set("tenantRent")} {...R.tenantRent} format="currency/mo" />
              <AssumptionSlider label="Operating costs" hint="% of price a year" value={operatingExpenseRate} setValue={set("operatingExpenseRate")} {...R.operatingExpenseRate} format="percentage" />
              <AssumptionSlider label="Rent growth" hint="per year" value={rentInflation} setValue={set("rentInflation")} {...R.rentInflation} format="percentage" />
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
            rentalInterest={totalInterestForYear * llcTaxShare}
            rentalPropertyTax={propertyTaxAnnual * llcTaxShare}
            rentalHOA={currentHOAAnnual * llcTaxShare}
            userShareOfDepreciation={depreciation * llcTaxShare}
            userShareOfOperatingExpenses={totalOperatingExpenses * llcTaxShare}
            totalOperatingExpenses={totalOperatingExpenses}
            operatingExpenseRate={operatingExpenseRate}
            totalRentalDeductions={rentalYear.deductions}
            rentalIncome={rentalYear.rentalIncome}
            netRentalIncome={rentalYear.netRentalIncome}
            rentalTaxImpact={rentalYear.tax}
            monthlyRentalTaxCost={rentalYear.tax / 12}
            cumulativeTaxSavings={cumulativeTaxSavings}
            llcShare={llcTaxShare}
            titleHolders={titleHolders}
            youId={you.id}
          />
          </>
        )}

        {activeTab === "longterm" && (
          <>
          <AssumptionPanel title="Growth">
              <AssumptionSlider label="Appreciation" hint="per year" value={appreciation} setValue={set("appreciation")} {...R.appreciation} format="percentage" />
              <AssumptionSlider label="HOA growth" hint="per year" value={hoaInflation} setValue={set("hoaInflation")} {...R.hoaInflation} format="percentage" />
          </AssumptionPanel>
          <LongTermTab
            selectedYear={selectedYear}
            purchasePrice={purchasePrice}
            amortizationSchedule={amortizationSchedule}
            baseHOA={baseHOA}
            hoaInflation={hoaInflation}
            appreciation={appreciation}
            moveOutYear={moveOutYear}
            owners={owners}
          />
          </>
        )}

        {activeTab === "opportunity" && (
          <>
          <AssumptionPanel title="Budget and markets">
              <AssumptionSlider label="Take-home pay" value={takeHome} setValue={set("takeHome")} {...R.takeHome} format="currency/mo" />
              <AssumptionSlider label="Non-housing expenses" value={nonHousingExpenses} setValue={set("nonHousingExpenses")} {...R.nonHousingExpenses} format="currency/mo" />
              <AssumptionSlider label="Equivalent rent" hint="if you rented instead" value={equivalentRent} setValue={set("equivalentRent")} {...R.equivalentRent} format="currency/mo" />
              <AssumptionSlider label="Rent growth" hint="per year" value={rentInflation} setValue={set("rentInflation")} {...R.rentInflation} format="percentage" />
              <AssumptionSlider label="S&P 500 return" hint="per year" value={stockMarketReturn} setValue={set("stockMarketReturn")} {...R.stockMarketReturn} format="percentage" />
              <AssumptionSlider label="Appreciation" hint="per year" value={appreciation} setValue={set("appreciation")} {...R.appreciation} format="percentage" />
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
        </div>
      </main>
    </div>
  );
}

export default App;
