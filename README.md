# Resume Builder SaaS

A SaaS-ready resume builder built with Next.js. It includes a live resume editor, ATS score, template switching, CV upload import, browser PDF export, AI resume enhancement, and an AI CV Tailor workflow.

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

Main routes:

- `/` - resume builder/editor and PDF export
- `/tailor` - AI CV Tailor & Enhancer, multilingual CV versions, saved versions, and AI Career Agent
- `/dashboard` - SaaS dashboard for local account state, billing entry, and production integration status
- `/company-intelligence` - AI Company Intelligence Platform portfolio project with website analysis, SWOT, KPI recommendations, competitor context, and executive report exports
- `/revenuepulse` - RevenuePulse, a recruiter-facing revenue growth analytics platform with SaaS KPIs, data-quality checks, anomaly detection, and AI insight reports

## Featured Portfolio Project: RevenuePulse

The `/revenuepulse` route is the flagship Berlin/Germany analyst portfolio project. It is designed for Data Analyst, BI Analyst, Business Analyst, Growth Analyst, Product Analyst, Revenue Analyst, and Analytics Engineer applications.

RevenuePulse simulates a realistic B2B SaaS and marketplace growth analytics environment with:

- MRR, ARR, churn, retention, activation, CAC, LTV, trial-to-paid conversion, and campaign ROI monitoring
- SQL-style metric definitions and an inspectable semantic layer
- Python-style anomaly and root-cause logic for KPI movements
- Data-quality checks for freshness, duplicates, attribution completeness, event reconciliation, and finance reconciliation
- Segment and acquisition-channel performance views
- Stakeholder-ready insight reports generated from grounded metrics, with an OpenAI-backed API when `OPENAI_API_KEY` is configured and a deterministic fallback otherwise

Portfolio pitch:

> Companies do not only need dashboards; they need trustworthy revenue metrics, explainable KPI movement, and clear business recommendations. RevenuePulse shows the full analyst workflow from metric definition to anomaly detection to executive reporting.

Technical files:

- `app/revenuepulse/page.tsx` - live dashboard and insight report UI
- `app/api/revenuepulse/insight/route.ts` - grounded insight report API with local fallback and optional OpenAI generation
- `lib/revenuepulse.ts` - synthetic SaaS growth dataset, KPI definitions, data-quality checks, anomaly logic, and report model
- `docs/revenuepulse-case-study.md` - recruiter-friendly project narrative and demo script

## Featured Portfolio Project: AI Company Intelligence Platform

The `/company-intelligence` route is a recruiter-facing data and AI portfolio project. It converts a company URL into a structured executive intelligence report with:

- Website analysis and business model detection
- Product, service, customer, and location extraction
- SWOT analysis and market gap recommendations
- Competitor positioning table
- KPI recommendations across business, product, marketing, and operations
- Executive dashboard cards and risk indicators
- HTML export, browser PDF print flow, and presentation outline export

Business impact pitch:

> Reduces first-pass company research from 2-3 hours to approximately 5 minutes by converting public website information into a structured executive brief.

Technical files:

- `app/company-intelligence/page.tsx` - interactive dashboard and export UI
- `app/api/company-intelligence/analyze/route.ts` - server-side website analyzer API
- `lib/company-intelligence.ts` - typed report model and intelligence engine
- `data/company-intelligence-sample-report.json` - sample report data
- `docs/company-intelligence-architecture.md` - architecture diagram and extension roadmap
- `docs/company-intelligence-case-study.md` - recruiter-friendly project narrative

## AI Setup

Create a `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The app calls:

- `/api/enhance` to improve summary and experience bullets
- `/api/tailor` to generate job-targeted CV content, ATS score, keyword analysis, suggestions, and cover letter draft
- `/api/agent` to power the AI Career Agent chat assistant
- `/api/import-cv` to extract text from PDF, DOCX, or TXT resumes
- `/api/saas/status` to show OpenAI, Supabase, and Stripe readiness
- `/api/checkout` to create a Stripe Checkout session when Stripe keys are configured
- `/api/webhooks/stripe` to receive Stripe billing lifecycle events
- `/api/resumes` and `/api/cv-versions` to persist user data in Supabase after login

If `OPENAI_API_KEY` is missing, `/api/tailor` returns a clear setup error and safe fallback analysis instead of fabricating content.

## Testing

```powershell
npm.cmd run lint
npm.cmd run build
```

## Current Limitations

- No authentication or database persistence yet.
- "Apply to Resume" and saved CV versions use browser local storage. The data model is structured so database persistence can be added later.
- `lib/resume-schema.ts` defines the production structured resume shape for the next database migration.
- `/dashboard` shows production integration status and a Stripe checkout entry point, but Supabase auth/database and Stripe webhooks still need live keys and tables.
- PDF export uses the browser print/save-as-PDF flow.
- Browser print controls the final PDF filename; the app sets a version-aware document title before opening print.
- AI suggestions are separated from verified resume content when information is missing.

## AI CV Versions

The `/tailor` page supports English, German, French, Spanish, Italian, Dutch, Arabic, and Hindi, with formats such as Global ATS Resume, European CV, German Lebenslauf, UK CV, US Resume, Executive CV, Creative CV, and Entry-Level CV. German Lebenslauf generation uses formal German wording and localized section names such as Profil, Berufserfahrung, Ausbildung, Fähigkeiten, Projekte, Zertifizierungen, and Sprachen.

## Deploy

Deploy to Vercel:

1. Push this repository to GitHub.
2. Go to Vercel and import the GitHub repo.
3. Add `OPENAI_API_KEY` in Vercel project environment variables.
4. Add these SaaS variables when you are ready for production accounts and payments:

```env
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRO_PRICE_ID=your_stripe_subscription_price_id
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

5. Deploy.

The GitHub Pages version can stay as a static demo, but the SaaS version should run on Vercel because it needs an API route.

## Supabase Starter Schema

The starter production schema is in `supabase/schema.sql`. It creates:

- `resumes`
- `cv_versions`
- `subscriptions`
- `billing_events`

It also enables row-level security so users can only access their own resumes and CV versions.
