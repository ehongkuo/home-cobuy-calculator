# SF Condo Financial Model 🏢

Welcome to the financial model for SF condo purchases

This interactive React application was built to simulate the complex financial breakdown of a shared co-investment in San Francisco real estate. It helps clarify exactly how the cash flow, tax deductions, and property math shake out.

## What's Inside?

Start with the **Owners** table on the Cash Flow tab: add 1–5 people with their equity % (splits costs, rent income and cash to close), title % (drives tax deductions), and the rent they pay while living there. Mark which owner is you; the tax views, Buy vs Rent and the top-bar net use your shares.

Every input is saved in the page URL, so **Share** copies a link that reopens the exact scenario. **Export** and **Import** save and load it as JSON, and the reset button restores the example.

The app has five tabs. A **Year** slider in the top bar drives every tab. The **Owner / Rental** toggle switches Cash Flow and Taxes between the owner-occupied and rental views without changing the year; Long-Term and Buy vs Rent follow the **Move Out** year as a timeline. A **Tax Savings** toggle turns the tax shield on or off everywhere.

### 1. Cash Flow 💵
The total monthly payment, how much of it the rent pot covers, and how any gap (or surplus) splits across the owners by equity. A Sankey chart shows where the money goes in owner and rental modes, followed by each person's net monthly cash flow.

### 2. Loan 📈
How the mortgage payment is derived, plus the full 30-year amortization schedule with the selected year highlighted.

### 3. Taxes ⚖️
Owner years: the Schedule A deduction (SALT cap, $750k mortgage debt limit, standard deduction). Rental years: the LLC K-1 view (depreciation, operating expenses, REPS assumption) and depreciation recapture.

### 4. Long-Term 🏗️
A 30-year projection of value, equity, HOA growth, and the Section 121 exclusion window after move-out.

### 5. Buy vs Rent 📊
Month-by-month opportunity cost: buying the condo vs. renting and investing the difference in the S&P 500.

Tax constants (W-2 income, CA state tax, SALT cap, standard deduction) live in `TAX_ASSUMPTIONS` in `app/src/financialModel.js`.

## Getting Started

To run this project locally on your machine:

1. **Install dependencies:**
   ```bash
   cd app
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the localhost URL provided in the terminal (usually `http://localhost:5173`).

4. Run the tests and linter:
   ```bash
   npm test
   npm run lint
   ```
