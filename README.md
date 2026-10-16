# Real Estate Co-Buy Calculator 🏢

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

The app is a static site hosted on Cloudflare Workers. `app/wrangler.jsonc` tells Cloudflare to serve the Vite build in `dist/`. No server code runs: scenario inputs live in the URL hash (`#s=…`), which browsers never send to the server.

### One-time setup

In the Cloudflare dashboard, go to **Workers & Pages → Create application → Import a repository**, connect GitHub (choose **Only select repositories**), pick this repo, and use:

| Setting | Value |
| --- | --- |
| Project name | `home-cobuy-calculator` (must match `name` in `wrangler.jsonc`) |
| Root directory | `app` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |

The site is served at `https://home-cobuy-calculator.<your-subdomain>.workers.dev`. Under the Worker's **Settings → Domains & Routes**, make sure **Preview URLs** is enabled.

### How updates ship

- Every pull request gets a preview URL, linked from the PR's Cloudflare check.
- Merging to `main` deploys production.
- To roll back, open the Worker's **Deployments** tab and choose **Rollback** on an earlier version.

### Limiting who can open it

The site is public by default. Anyone with a **Share** link also sees that scenario's numbers. To restrict it to the owners, open the Worker's **Settings → Domains & Routes** and enable **Cloudflare Access** on the `workers.dev` route and on Preview URLs, then allow the owners' emails in the Access policy (free for up to 50 users).

### CI and branch protection

`.github/workflows/ci.yml` runs tests, lint and a build on every PR and push to `main`. Turn on branch protection so nothing broken reaches production: **Settings → Branches → Add rule** for `main`, enable **Require status checks to pass before merging**, and select the `test` check.
