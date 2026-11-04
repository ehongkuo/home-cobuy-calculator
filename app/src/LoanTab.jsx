import React from "react";
import { CalendarDays, PiggyBank } from "lucide-react";
import { formatCurrency } from "./utils";

function LoanTab({
  owners,
  purchasePrice,
  downPaymentPercent,
  cashToClose,
  loanAmount,
  mortgage,
  propertyTaxRate,
  propertyTax,
  hoa,
  propertyCosts,
  loanTermYears,
  amortizationSchedule,
  selectedYear,
}) {
  return (
    <div className="tab-fade-in">
      <div className="card" style={{ marginBottom: "16px" }}>
        <h2>
          <PiggyBank className="icon" /> Cash needed up front
        </h2>
        <div className="cash-to-close">
          <div className="cash-to-close-totals">
            <div className="math-step">
              <span className="math-label">Down payment ({downPaymentPercent}%):</span>
              <span className="math-value">{formatCurrency(cashToClose.downPayment)}</span>
            </div>
            <div className="math-step">
              <span className="math-label">Closing costs (~2%)</span>
              <span className="math-value">{formatCurrency(cashToClose.closingCosts)}</span>
            </div>
            <div className="math-step total-math">
              <span className="math-label">Total cash to close</span>
              <span className="math-value highlight-large">{formatCurrency(cashToClose.total)}</span>
            </div>
          </div>
          <div className="cash-to-close-split">
            {owners.map((owner) => {
              const person = cashToClose.byPerson[owner.id];
              return (
                <div key={owner.id} className={`cash-person ${owner.isYou ? "cash-person-you" : ""}`}>
                  <div className="cash-person-label">
                    {owner.name} ({Number((person.share * 100).toFixed(2))}%)
                  </div>
                  <div className="cash-person-total">{formatCurrency(person.total)}</div>
                  <div className="cash-person-detail">
                    {formatCurrency(person.downPayment)} down + {formatCurrency(person.closingCosts)} closing
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid">
        <div className="card">
          <h2>How the payment is derived</h2>
          <div className="math-breakdown">
            <div className="math-step">
              <span className="math-label">1. Loan amount</span>
              <span className="math-value">
                {formatCurrency(purchasePrice)} - {downPaymentPercent}% ={" "}
                {formatCurrency(loanAmount)}
              </span>
            </div>
            <div className="math-step">
              <span className="math-label">2. Monthly mortgage</span>
              <span className="math-value highlight">
                {formatCurrency(mortgage)}
              </span>
            </div>
            <hr />
            <div className="math-step">
              <span className="math-label">Property tax ({propertyTaxRate}%, year {selectedYear})</span>
              <span className="math-value">{formatCurrency(propertyTax)}</span>
            </div>
            <div className="math-step">
              <span className="math-label">HOA (year {selectedYear})</span>
              <span className="math-value">{formatCurrency(hoa)}</span>
            </div>
            <div className="math-step total-math">
              <span className="math-label">Total monthly cost (year {selectedYear})</span>
              <span className="math-value highlight-large">
                {formatCurrency(propertyCosts)}
              </span>
            </div>
          </div>
        </div>
        <div className="card amortization-card" style={{ marginTop: 0 }}>
          <h2>
            <CalendarDays className="icon" /> {loanTermYears}-year amortization
          </h2>
          <div className="table-wrapper">
            <table className="amort-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {amortizationSchedule.map((row) => (
                  <tr
                    key={row.year}
                    style={{
                      background:
                        row.year === selectedYear
                          ? "color-mix(in srgb, var(--info) 20%, transparent)"
                          : "transparent",
                    }}
                  >
                    <td>
                      Year {row.year}
                    </td>
                    <td className="positive">
                      {formatCurrency(row.principal)}
                    </td>
                    <td className="negative">{formatCurrency(row.interest)}</td>
                    <td>{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoanTab;
