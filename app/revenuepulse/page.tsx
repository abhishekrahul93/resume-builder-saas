"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getRevenuePulseCopilotResponse, getRevenuePulseSnapshot, type CopilotResponse, type InsightReport, type Status } from "@/lib/revenuepulse";

type ReportState = "idle" | "loading" | "ready" | "error";
type CopilotState = "idle" | "loading" | "ready" | "error";

const snapshot = getRevenuePulseSnapshot();

function statusLabel(status: Status) {
  if (status === "good") return "Healthy";
  if (status === "watch") return "Watch";
  return "Risk";
}

function statusClass(status: Status) {
  return `rp-status rp-${status}`;
}

function formatChange(change: number) {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-DE").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: "compact"
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(new Date(value));
}

export default function RevenuePulsePage() {
  const [activeView, setActiveView] = useState<"overview" | "quality" | "definitions">("overview");
  const [report, setReport] = useState<InsightReport>(snapshot.insightReport);
  const [reportState, setReportState] = useState<ReportState>("idle");
  const [copilotQuestion, setCopilotQuestion] = useState(snapshot.copilotQuestions[0].question);
  const [copilotResponse, setCopilotResponse] = useState<CopilotResponse>(getRevenuePulseCopilotResponse(snapshot.copilotQuestions[0].question));
  const [copilotState, setCopilotState] = useState<CopilotState>("idle");

  const maxMrr = useMemo(() => Math.max(...snapshot.monthlyMetrics.map((month) => month.mrr)), []);
  const latest = snapshot.monthlyMetrics[snapshot.monthlyMetrics.length - 1];
  const previous = snapshot.monthlyMetrics[snapshot.monthlyMetrics.length - 2];

  async function refreshInsightReport() {
    setReportState("loading");

    try {
      const response = await fetch("/api/revenuepulse/insight", { method: "POST" });
      const nextReport = (await response.json()) as InsightReport;

      if (!response.ok) {
        setReportState("error");
        return;
      }

      setReport(nextReport);
      setReportState("ready");
    } catch {
      setReportState("error");
    }
  }

  async function askCopilot(question = copilotQuestion) {
    const trimmed = question.trim();
    if (!trimmed) return;

    setCopilotQuestion(trimmed);
    setCopilotState("loading");

    try {
      const response = await fetch("/api/revenuepulse/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });
      const result = (await response.json()) as CopilotResponse;

      if (!response.ok) {
        setCopilotState("error");
        return;
      }

      setCopilotResponse(result);
      setCopilotState("ready");
    } catch {
      setCopilotState("error");
    }
  }

  return (
    <main className="rp-shell">
      <nav className="rp-nav" aria-label="RevenuePulse navigation">
        <Link className="rp-brand" href="/revenuepulse">
          <span>RP</span>
          <div>
            <strong>RevenuePulse</strong>
            <small>Growth analytics platform</small>
          </div>
        </Link>
        <div className="rp-nav-actions">
          <a href="#rp-dashboard">Dashboard</a>
          <a href="#rp-copilot">AI Copilot</a>
          <a href="#rp-report">Insight Report</a>
          <button type="button" onClick={() => setActiveView("definitions")}>Metric Layer</button>
        </div>
      </nav>

      <section className="rp-hero">
        <div className="rp-hero-copy">
          <p className="eyebrow">Revenue Growth Analytics Platform</p>
          <h1>RevenuePulse</h1>
          <h2>Growth metrics, anomaly detection, and stakeholder-ready insight reports in one live demo.</h2>
          <p>
            Built for Berlin data, BI, growth, product, and analytics engineering roles. RevenuePulse combines SQL-style metric definitions, Python anomaly logic, data-quality checks, and AI-assisted reporting for SaaS and marketplace teams.
          </p>
          <div className="rp-hero-actions">
            <a className="rp-primary-link" href="#rp-dashboard">View live dashboard</a>
            <a className="rp-secondary-link" href="#rp-copilot">Ask AI copilot</a>
            <button type="button" onClick={() => void refreshInsightReport()} disabled={reportState === "loading"}>
              {reportState === "loading" ? "Generating..." : "Generate report"}
            </button>
          </div>
          <div className="rp-proof-row" aria-label="RevenuePulse capabilities">
            <span>SQL metric layer</span>
            <span>Data-quality checks</span>
            <span>Python anomaly logic</span>
            <span>Grounded AI copilot</span>
            <span>Evaluation panel</span>
          </div>
        </div>

        <div className="rp-hero-product" aria-label="RevenuePulse live product preview">
          <div className="rp-product-top">
            <div>
              <span>Live growth review</span>
              <strong>{latest.month}</strong>
            </div>
            <span className="rp-status rp-risk">Risk detected</span>
          </div>
          <div className="rp-product-metrics">
            <div>
              <span>MRR</span>
              <strong>{formatCurrency(latest.mrr)}</strong>
              <small>{formatChange(((latest.mrr - previous.mrr) / previous.mrr) * 100)} MoM</small>
            </div>
            <div>
              <span>Gross churn</span>
              <strong>{((latest.churnedCustomers / previous.activeCustomers) * 100).toFixed(1)}%</strong>
              <small>{latest.churnedCustomers} churned accounts</small>
            </div>
            <div>
              <span>CAC</span>
              <strong>{formatCurrency(latest.marketingSpend / latest.paidConversions)}</strong>
              <small>above target</small>
            </div>
          </div>
          <div className="rp-product-chart" aria-label="Mini MRR trend">
            {snapshot.monthlyMetrics.slice(-8).map((month) => (
              <span key={month.month} style={{ height: `${Math.max(18, (month.mrr / maxMrr) * 104)}px` }} />
            ))}
          </div>
          <div className="rp-product-report">
            <span>Recommended decision</span>
            <p>Pause weakest paid campaigns, investigate activation tracking, and launch a Seed SaaS retention save motion.</p>
          </div>
        </div>
      </section>

      <section id="rp-dashboard" className="rp-kpi-grid" aria-label="RevenuePulse KPI summary">
        {snapshot.kpis.map((kpi) => (
          <article className="rp-kpi-card" key={kpi.label}>
            <div>
              <span className={statusClass(kpi.status)}>{statusLabel(kpi.status)}</span>
              <small>{kpi.category}</small>
            </div>
            <strong>{kpi.value}</strong>
            <p>{kpi.label}</p>
            <div className="rp-kpi-meta">
              <span>{formatChange(kpi.change)} vs previous month</span>
              <span>{kpi.target}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="rp-workspace">
        <aside className="rp-sidebar" aria-label="RevenuePulse workflow controls">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>Analyst command center</h2>
          </div>
          <div className="rp-tabs" role="tablist" aria-label="Dashboard views">
            <button className={activeView === "overview" ? "active" : ""} type="button" onClick={() => setActiveView("overview")}>Overview</button>
            <button className={activeView === "quality" ? "active" : ""} type="button" onClick={() => setActiveView("quality")}>Data Quality</button>
            <button className={activeView === "definitions" ? "active" : ""} type="button" onClick={() => setActiveView("definitions")}>Metric Layer</button>
          </div>
          <div className="rp-context-box">
            <strong>{snapshot.companyContext.company}</strong>
            <span>{snapshot.companyContext.model}</span>
          </div>
          <div className="rp-context-box muted">
            <strong>Hiring signal</strong>
            <span>{snapshot.companyContext.audience}</span>
          </div>
          <button className="rp-primary-action" type="button" onClick={() => void refreshInsightReport()} disabled={reportState === "loading"}>
            {reportState === "loading" ? "Generating..." : "Generate Insight Report"}
          </button>
          <p className="rp-helper">Report generation is grounded in the visible metrics, anomalies, and quality checks. It falls back locally when no AI key is configured.</p>
        </aside>

        <section className="rp-main-panel">
          {activeView === "overview" ? (
            <>
              <section className="rp-section rp-two-column">
                <article>
                  <div className="rp-section-heading">
                    <div>
                      <p className="eyebrow">Trend</p>
                      <h2>MRR by month</h2>
                    </div>
                    <span>Updated {formatDate(snapshot.generatedAt)}</span>
                  </div>
                  <div className="rp-bar-chart" aria-label="Monthly recurring revenue trend">
                    {snapshot.monthlyMetrics.map((month) => (
                      <div className="rp-bar-item" key={month.month}>
                        <div style={{ height: `${Math.max(16, (month.mrr / maxMrr) * 180)}px` }} />
                        <span>{month.month.replace(" 202", " '2")}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article>
                  <div className="rp-section-heading">
                    <div>
                      <p className="eyebrow">Funnel</p>
                      <h2>Lead to paid conversion</h2>
                    </div>
                    <span>{formatNumber(latest.leads)} leads</span>
                  </div>
                  <div className="rp-funnel">
                    {snapshot.funnel.map((step) => (
                      <div className="rp-funnel-step" key={step.label}>
                        <div>
                          <strong>{step.label}</strong>
                          <span>{formatNumber(step.value)}</span>
                        </div>
                        <div className="rp-funnel-track">
                          <span className={`rp-funnel-fill rp-${step.health}`} style={{ width: `${Math.max(12, step.conversionFromPrevious ?? 100)}%` }} />
                        </div>
                        <small>{step.conversionFromPrevious === null ? "Starting volume" : `${step.conversionFromPrevious.toFixed(1)}% from previous step`}</small>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="rp-section">
                <div className="rp-section-heading">
                  <div>
                    <p className="eyebrow">Root cause</p>
                    <h2>Anomaly explanation queue</h2>
                  </div>
                  <span>{snapshot.anomalies.length} detected issues</span>
                </div>
                <div className="rp-anomaly-list">
                  {snapshot.anomalies.map((anomaly) => (
                    <article className="rp-anomaly" key={anomaly.metric}>
                      <div>
                        <span className={statusClass(anomaly.severity)}>{statusLabel(anomaly.severity)}</span>
                        <h3>{anomaly.metric}</h3>
                      </div>
                      <p><strong>Detected:</strong> {anomaly.detectedChange}</p>
                      <p><strong>Likely cause:</strong> {anomaly.likelyCause}</p>
                      <p><strong>Impact:</strong> {anomaly.businessImpact}</p>
                      <p><strong>Action:</strong> {anomaly.recommendedAction}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rp-section rp-two-column">
                <article>
                  <div className="rp-section-heading">
                    <div>
                      <p className="eyebrow">Segments</p>
                      <h2>Customer health</h2>
                    </div>
                  </div>
                  <div className="rp-table">
                    <div className="rp-table-row heading">
                      <span>Segment</span>
                      <span>MRR</span>
                      <span>Churn</span>
                      <span>NRR</span>
                    </div>
                    {snapshot.segments.map((segment) => (
                      <div className="rp-table-row" key={segment.segment}>
                        <strong>{segment.segment}</strong>
                        <span>{formatCurrency(segment.mrr)}</span>
                        <span>{(segment.churnRate * 100).toFixed(1)}%</span>
                        <span>{(segment.netRevenueRetention * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article>
                  <div className="rp-section-heading">
                    <div>
                      <p className="eyebrow">Channels</p>
                      <h2>Spend efficiency</h2>
                    </div>
                  </div>
                  <div className="rp-channel-list">
                    {snapshot.channels.map((channel) => (
                      <div className="rp-channel" key={channel.channel}>
                        <div>
                          <strong>{channel.channel}</strong>
                          <span className={statusClass(channel.status)}>{statusLabel(channel.status)}</span>
                        </div>
                        <div className="rp-channel-metrics">
                          <span>CAC {formatCurrency(channel.cac)}</span>
                          <span>ROI {channel.roi.toFixed(1)}x</span>
                          <span>{channel.customers} customers</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : null}

          {activeView === "quality" ? (
            <section className="rp-section">
              <div className="rp-section-heading">
                <div>
                  <p className="eyebrow">Trust layer</p>
                  <h2>Data-quality checks before business action</h2>
                </div>
                <span>{snapshot.dataQuality.length} checks</span>
              </div>
              <div className="rp-quality-grid">
                {snapshot.dataQuality.map((check) => (
                  <article className="rp-quality-card" key={check.check}>
                    <div>
                      <span className={statusClass(check.status)}>{statusLabel(check.status)}</span>
                      <small>{check.owner}</small>
                    </div>
                    <h3>{check.check}</h3>
                    <p>{check.result}</p>
                    <strong>{check.impact}</strong>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === "definitions" ? (
            <section className="rp-section">
              <div className="rp-section-heading">
                <div>
                  <p className="eyebrow">Semantic layer</p>
                  <h2>Metric definitions recruiters can inspect</h2>
                </div>
                <span>{snapshot.metricDefinitions.length} core metrics</span>
              </div>
              <div className="rp-definition-list">
                {snapshot.metricDefinitions.map((definition) => (
                  <article className="rp-definition" key={definition.name}>
                    <div>
                      <h3>{definition.name}</h3>
                      <span>{definition.owner}</span>
                    </div>
                    <p>{definition.definition}</p>
                    <pre>{definition.sql}</pre>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section id="rp-copilot" className="rp-copilot">
            <div className="rp-section-heading">
              <div>
                <p className="eyebrow">Grounded AI Copilot</p>
                <h2>Ask revenue questions with sources and evaluation.</h2>
              </div>
              <span>{copilotResponse.source === "openai" ? "OpenAI + grounded context" : "Grounded demo engine"}</span>
            </div>

            <div className="rp-question-grid" aria-label="Suggested copilot questions">
              {snapshot.copilotQuestions.map((item) => (
                <button
                  className={copilotQuestion === item.question ? "active" : ""}
                  key={item.question}
                  type="button"
                  onClick={() => void askCopilot(item.question)}
                  disabled={copilotState === "loading"}
                >
                  <span>{item.label}</span>
                  {item.question}
                </button>
              ))}
            </div>

            <form
              className="rp-copilot-form"
              onSubmit={(event) => {
                event.preventDefault();
                void askCopilot();
              }}
            >
              <input
                aria-label="Ask RevenuePulse Copilot"
                value={copilotQuestion}
                onChange={(event) => setCopilotQuestion(event.target.value)}
                placeholder="Ask why churn moved, whether MRR is real, or what to do next..."
              />
              <button type="submit" disabled={copilotState === "loading"}>
                {copilotState === "loading" ? "Thinking..." : "Ask"}
              </button>
            </form>

            <div className="rp-copilot-answer">
              <article>
                <div className="rp-answer-top">
                  <span className="rp-status rp-good">Grounded answer</span>
                  <small>{copilotState === "error" ? "Fallback shown" : "Ready"}</small>
                </div>
                <h3>{copilotResponse.question}</h3>
                <p>{copilotResponse.answer}</p>
                <div className="rp-answer-columns">
                  <div>
                    <h4>Next actions</h4>
                    <ul>{copilotResponse.nextActions.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <h4>Caveats</h4>
                    <ul>{copilotResponse.caveats.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
              </article>

              <aside>
                <h3>Source grounding</h3>
                <div className="rp-source-list">
                  {copilotResponse.sources.map((item) => (
                    <div key={`${item.type}-${item.label}`}>
                      <span>{item.type}</span>
                      <strong>{item.label}</strong>
                      <p>{item.detail}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <div className="rp-eval-panel">
              <div>
                <span>{copilotResponse.evaluation.groundedness}</span>
                <strong>Groundedness</strong>
              </div>
              <div>
                <span>{copilotResponse.evaluation.completeness}</span>
                <strong>Completeness</strong>
              </div>
              <div>
                <span>{copilotResponse.evaluation.actionability}</span>
                <strong>Actionability</strong>
              </div>
              <div>
                <span>{copilotResponse.evaluation.hallucinationRisk}</span>
                <strong>Hallucination risk</strong>
              </div>
            </div>

            <div className="rp-eval-checks">
              {copilotResponse.evaluation.checks.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section id="rp-report" className="rp-report">
            <div className="rp-section-heading">
              <div>
                <p className="eyebrow">{report.source === "openai" ? "AI-generated" : "Grounded demo engine"}</p>
                <h2>{report.title}</h2>
              </div>
              <span>{reportState === "ready" ? "Refreshed" : reportState === "error" ? "Fallback shown" : "Ready"}</span>
            </div>
            <p className="rp-report-summary">{report.executiveSummary}</p>
            <div className="rp-report-grid">
              <div>
                <h3>Findings</h3>
                <ul>{report.findings.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h3>Decisions</h3>
                <ul>{report.decisions.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h3>Risks</h3>
                <ul>{report.risks.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
