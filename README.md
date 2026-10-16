# Real Estate Co-Buy Calculator 🏢

**Try it:** https://home-cobuy-calculator.ehongkuo.workers.dev

Buying a home with other people raises questions a normal mortgage calculator can't answer. Who covers the gap when rent doesn't cover the payment? What does each owner actually pay each month? What happens to taxes when the people living there move out and it becomes a rental? Would you be better off just renting?

This calculator models one specific arrangement and walks through the math in plain numbers:

- **Three owners:** an investor who puts in 50% and two owner-occupants (you and a co-owner) at 25% each.
- **The two of you live there and pay rent** into a shared pot that goes toward the mortgage, HOA and property tax.
- **After you move out**, the place is rented to a tenant and held in an LLC.

It works on a phone or a computer. Nothing you enter is saved or sent anywhere. Reloading the page resets everything to the defaults.

## How to use it

1. **Set the deal terms:** price, down payment, interest rate, HOA, property tax and the year you plan to move out. On a phone, tap **Deal terms** at the top.
2. **Pick a year** with the **Year** slider. Every tab shows that year's numbers.
3. **Switch between Owner and Rental** to compare living there with renting it out.
4. **Turn Tax Savings on or off** to see the numbers with or without tax deductions.
5. **Fill in the inputs on each tab:** rents, growth rates, your budget. On a phone, tap a value to open a scroll wheel.
6. **Hover over (or tap) any dotted-underlined number** to see how it was calculated.

## What each tab answers

| Tab | The question it answers |
| --- | --- |
| 💵 **Cash Flow** | What's the monthly payment, how much does rent cover, and what does each owner pay or receive? |
| 📈 **Loan** | How is the mortgage payment calculated, and how much is interest vs. principal each year? |
| ⚖️ **Taxes** | How much do mortgage interest and property tax deductions save? In rental years, what do depreciation and expenses do to the LLC's taxes? |
| 🏗️ **Long-Term** | What's the home worth and how much equity is there over 30 years? How long can you sell without capital gains tax after moving out? |
| 📊 **Buy vs Rent** | Would you come out ahead buying, or renting and investing the difference in the S&P 500? |

The Cash Flow tab also warns you if the investor's yearly contribution is big enough that gift tax rules might apply.

## Things to know

- **The ownership split is fixed** at 50 / 25 / 25.
- **Tax rules are simplified.** The tax math uses fixed assumptions: $200k W-2 income, California state tax, the SALT cap, the standard deduction, the $750k mortgage debt limit and a 24% bracket. It also assumes real estate professional status for rental losses. If your situation differs, the tax numbers will too. Developers can change these in `TAX_ASSUMPTIONS` in `app/src/financialModel.js`.
- **It's a model, not advice.** Use it to understand the shape of a deal and to have better conversations with your co-buyers, lender and tax professional. Don't use it as financial, tax or legal advice.

## For developers

### Tabs in detail

The **Year** slider drives every tab. The **Owner / Rental** toggle switches Cash Flow and Taxes between views. Long-Term and Buy vs Rent follow the **Move Out** year as a timeline. **Tax Savings** turns the tax shield on or off everywhere.

- **Cash Flow:** total payment, rent-pot coverage, and the gap or surplus split 50/25/25. Includes a Sankey chart and each owner's net.
- **Loan:** how the payment is derived, plus the 30-year amortization schedule.
- **Taxes:** Schedule A in owner years (SALT cap, $750k debt limit, standard deduction). The LLC K-1 view in rental years (depreciation, operating expenses, REPS) and depreciation recapture.
- **Long-Term:** value, equity, HOA growth and the Section 121 exclusion window.
- **Buy vs Rent:** month-by-month opportunity cost against the S&P 500.

### Running locally

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

In the Cloudflare dashboard, go to **Workers & Pages → Create application → Import a repository**, connect GitHub (choose **Only select repositories**), pick this repo, and set the **Production** build settings:

| Setting | Value |
| --- | --- |
| Project name | `home-cobuy-calculator` (must match `name` in `wrangler.jsonc`) |
| Root directory | `/app` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

The site is served at `https://home-cobuy-calculator.<your-subdomain>.workers.dev`.

### Preview builds

PR previews come from a second build trigger named **Preview builds**, created through the [Workers Builds API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/). It doesn't appear on the dashboard's Builds page:

| Setting | Value |
| --- | --- |
| Branches | all except `main` |
| Root directory | `/app` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler versions upload` |

The dashboard's **Previews Base** builds (the `npx wrangler preview` beta) are turned off. Each branch got its own copy of those settings, and the copies didn't pick up later edits. If both are on, every PR gets a second, failing Cloudflare check.

To inspect or change the trigger, call `GET`/`PATCH /accounts/<account_id>/builds/triggers` with a user API token that has **Workers CI: Edit**.

### How updates ship

- Every pull request gets a preview URL, linked from the PR's Cloudflare check.
- Merging to `main` deploys production.
- To roll back, open the Worker's **Deployments** tab and choose **Rollback** on an earlier version.

### Limiting who can open it

The site is public by default. Anyone with a **Share** link also sees that scenario's numbers. To restrict it to the owners, open the Worker's **Settings → Domains & Routes** and enable **Cloudflare Access** on the `workers.dev` route and on Preview URLs, then allow the owners' emails in the Access policy (free for up to 50 users).

### CI and branch protection

`.github/workflows/ci.yml` runs tests, lint and a build on every PR and push to `main`. Turn on branch protection so nothing broken reaches production: **Settings → Branches → Add rule** for `main`, enable **Require status checks to pass before merging**, and select the `test` check.
