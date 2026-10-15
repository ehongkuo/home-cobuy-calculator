# SF Condo Financial Model 🏢

Welcome to the financial model for SF condo purchases

This interactive React application was built to simulate the complex financial breakdown of a shared co-investment in San Francisco real estate. It helps clarify exactly how the cash flow, tax deductions, and property math shake out.

## What's Inside?

The app has five tabs. A **Year** slider in the top bar drives every tab. The **Owner / Rental** toggle switches Cash Flow and Taxes between the owner-occupied and rental views without changing the year; Long-Term and Buy vs Rent follow the **Move Out** year as a timeline. A **Tax Savings** toggle turns the tax shield on or off everywhere.

### 1. Cash Flow 💵
The total monthly payment, how much of it the rent pot covers, and how any gap (or surplus) splits between an investor (50%), you (25%), and a co-owner (25%). A Sankey chart shows where the money goes in owner and rental modes, followed by each person's net monthly cash flow.

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

## Deploying

The app is a static site with no backend. Scenario inputs live in the URL hash (`#s=…`), which browsers never send to the server.

### Cloudflare Pages (recommended)

In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**, pick this repo, and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None (or Vite) |
| Root directory | `app` |
| Build command | `npm run build` |
| Build output directory | `dist` |

After that:

- Every pull request gets its own preview URL, posted on the PR.
- Merging to `main` deploys production.
- To roll back, open the project's **Deployments** list and choose **Rollback** on an earlier build.

Vercel and Netlify work the same way with the same three settings.

### GitHub Pages (fallback)

`.github/workflows/pages.yml` builds with `BASE_PATH=/<repo>/` and deploys to `https://<user>.github.io/<repo>/` on every push to `main`. It is off by default. To turn it on, set **Settings → Pages → Source** to **GitHub Actions** and add a repository variable `DEPLOY_PAGES` = `true` (**Settings → Secrets and variables → Actions → Variables**). It has no PR previews.

### CI and branch protection

`.github/workflows/ci.yml` runs tests, lint and a build on every PR and push to `main`. Turn on branch protection so nothing broken reaches production: **Settings → Branches → Add rule** for `main`, enable **Require status checks to pass before merging**, and select the `test` check.
