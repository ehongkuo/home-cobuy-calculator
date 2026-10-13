import React from "react";
import { CalendarDays } from "lucide-react";
import { formatCurrency } from "./utils";

function LoanTab({
  purchasePrice,
  downPaymentPercent,
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
      <div className="grid">
        <div className="card">
          <h2>How Payments Are Derived</h2>
          <div className="math-breakdown">
            <div className="math-step">
              <span className="math-label">1. Loan Amount:</span>
              <span className="math-value">
                {formatCurrency(purchasePrice)} - {downPaymentPercent}% ={" "}
                {formatCurrency(loanAmount)}
              </span>
            </div>
            <div className="math-step">
              <span className="math-label">2. Monthly Mortgage:</span>
              <span className="math-value highlight">
                {formatCurrency(mortgage)}
              </span>
            </div>
            <hr />
            <div className="math-step">
              <span className="math-label">Property Tax ({propertyTaxRate}%, Year {selectedYear}):</span>
              <span className="math-value">{formatCurrency(propertyTax)}</span>
            </div>
            <div className="math-step">
              <span className="math-label">HOA (Year {selectedYear}):</span>
              <span className="math-value">{formatCurrency(hoa)}</span>
            </div>
            <div className="math-step total-math">
              <span className="math-label">Total Monthly Cost (Year {selectedYear}):</span>
              <span className="math-value highlight-large">
                {formatCurrency(propertyCosts)}
              </span>
            </div>
          </div>
        </div>
        <div className="card amortization-card" style={{ marginTop: 0 }}>
          <h2>
            <CalendarDays className="icon" /> {loanTermYears}-Year Amortization
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
                          ? "rgba(96, 165, 250, 0.2)"
                          : "transparent",
                    }}
                  >
                    <td>
                      Year {row.year} {row.year === selectedYear && "👈"}
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
