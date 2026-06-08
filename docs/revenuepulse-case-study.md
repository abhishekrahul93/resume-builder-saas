# RevenuePulse - AI Revenue Growth Analytics Platform

## Positioning

RevenuePulse is a live AI analytics platform for SaaS and marketplace teams. It monitors revenue, customer, funnel, and campaign KPIs, validates whether the data is trustworthy, detects risky metric movement, and turns the findings into grounded copilot answers and stakeholder-ready insight reports.

The project is built for Berlin and Germany analyst roles where hiring managers expect SQL, BI, KPI reporting, stakeholder communication, data quality, and increasingly AI-assisted analytics. It also speaks to newer AI analyst and analytics engineering expectations: LLM integration, source grounding, caveats, evaluation checks, and business workflow automation.

## Business Problem

Most companies do not lack dashboards. They lack confidence in whether a KPI movement is real, caused by bad tracking, or caused by a specific business driver.

RevenuePulse answers questions such as:

- Did MRR drop because customers churned, acquisition weakened, or finance data is stale?
- Is the activation drop a real product issue or a tracking issue?
- Which channel is damaging CAC and campaign ROI?
- Can an AI assistant answer these questions from trusted metric context without hallucinating?
- What should the business do next?

## What The Demo Shows

- Core SaaS KPIs: MRR, ARR, churn, activation, trial-to-paid conversion, CAC, LTV, and campaign ROI.
- SQL-style metric definitions so the KPI logic is inspectable.
- Data-quality checks for freshness, duplicate subscriptions, attribution completeness, activation event reconciliation, and finance reconciliation.
- Python-style anomaly explanations that connect KPI movement to business causes.
- Segment and acquisition-channel cuts for root-cause analysis.
- Grounded AI copilot answers with source cards, caveats, next actions, and evaluation scores.
- AI-generated or fallback stakeholder reports grounded in the visible data.

## Technical Scope

- Next.js App Router dashboard at `/revenuepulse`.
- TypeScript metric model in `lib/revenuepulse.ts`.
- Deterministic SaaS growth dataset for reproducible demo behavior.
- AI copilot API at `/api/revenuepulse/copilot` with source-grounded context and deterministic fallback.
- Insight report API at `/api/revenuepulse/insight`.
- Optional OpenAI report generation when `OPENAI_API_KEY` is configured.
- Local fallback copilot and report engines so the demo works 24/7 without external dependencies.

## Demo Script

1. Open `/revenuepulse`.
2. Start with the KPI cards and show the May 2026 MRR decline, churn spike, CAC risk, and campaign ROI weakness.
3. Open the anomaly queue and explain how the product separates real business movement from data-quality caveats.
4. Switch to Data Quality and show why revenue is trustworthy but mobile activation needs reconciliation.
5. Switch to Metric Layer and show the SQL-style definitions for MRR, churn, activation, CAC, and campaign ROI.
6. Ask the AI Copilot: "Why did churn increase in May?" and point to source grounding, caveats, and evaluation.
7. Ask: "Which acquisition channel should we cut first?" and show how the answer combines CAC, ROI, and attribution quality.
8. Click Generate Insight Report and walk through findings, decisions, and risks.

## Interview Story

RevenuePulse demonstrates the full analyst workflow:

- Define business metrics clearly.
- Build a trusted data model.
- Check data quality before recommending action.
- Detect anomalies and diagnose causes.
- Communicate findings in business language.
- Use AI as a grounded analyst copilot instead of a black-box answer generator.
- Evaluate AI answers for groundedness, completeness, actionability, and hallucination risk.

## CV Summary

RevenuePulse - AI Revenue Growth Analytics Platform: live analytics system for SaaS and marketplace teams, monitoring MRR, ARR, churn, retention, CAC, LTV, funnel conversion, and campaign ROI with SQL metric definitions, Python anomaly detection, data-quality checks, grounded AI copilot answers, evaluation signals, and business insight reports.
