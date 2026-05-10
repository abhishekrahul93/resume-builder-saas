"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RiskLevel = "High" | "Medium" | "Low";

type ContractRisk = {
  title: string;
  level: RiskLevel;
  clause: string;
  whyItMatters: string;
  suggestedEdit: string;
};

type ContractAnalysis = {
  riskScore: number;
  verdict: string;
  contractType: string;
  counterparty: string;
  keyConcerns: string[];
  indiaSpecificFlags: ContractRisk[];
  risks: ContractRisk[];
  missingProtections: string[];
  negotiationEmail: string;
  pilotSummary: string;
  source: "gemini" | "demo-engine";
};

type ReviewPerspective = "vendor" | "client";

const sampleContract = `Vendor Services Agreement

The Client shall pay the Vendor within 90 days from receipt of invoice. Any disputes shall be subject to arbitration in Singapore. The Vendor shall indemnify the Client for all losses, claims, penalties, indirect damages, and consequential losses arising from the services. Either party may terminate this agreement with 5 days written notice. The Vendor shall maintain confidentiality. Cheque payments may be accepted at Client discretion. GST will be paid as applicable.`;

function levelClass(level: RiskLevel) {
  return level.toLowerCase();
}

function reportShareText(analysis: ContractAnalysis) {
  const concerns = analysis.keyConcerns.slice(0, 4).join(", ");
  return [
    "ClauseRisk India contract review",
    "",
    `Verdict: ${analysis.verdict}`,
    `Risk score: ${analysis.riskScore}/100`,
    concerns ? `Key concerns: ${concerns}` : "",
    "",
    "Review link: https://clauserisk-india.vercel.app"
  ].filter(Boolean).join("\n");
}

export default function ContractAnalyzerPage() {
  const [contractText, setContractText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [perspective, setPerspective] = useState<ReviewPerspective>("vendor");
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState("");

  const allRisks = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.indiaSpecificFlags, ...analysis.risks];
  }, [analysis]);

  async function analyzeContract(useSample = false) {
    setIsAnalyzing(true);
    setMessage("");

    try {
      const formData = new FormData();
      if (file && !useSample) {
        formData.append("file", file);
      }
      formData.append("text", useSample ? sampleContract : contractText);
      formData.append("perspective", perspective);
      if (useSample) {
        formData.append("sample", "true");
      }

      const response = await fetch("/api/contract-analyze", {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Could not analyze this contract.");
        return;
      }

      setAnalysis(result);
      if (useSample) {
        setContractText(sampleContract);
        setFile(null);
      }
    } catch {
      setMessage("Could not reach the analysis service. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function shareOnWhatsApp() {
    if (!analysis) return;
    const message = encodeURIComponent(reportShareText(analysis));
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="contractShell">
      <nav className="contractNav" aria-label="Contract review navigation">
        <Link className="contractBrand" href="/contract">
          <span>CR</span>
          <strong>ClauseRisk India</strong>
        </Link>
        <div>
          <Link className="secondaryButton" href="/">
            Resume app
          </Link>
          <a className="primaryButton" href="https://goo.gle/gfs_immersion2026" target="_blank" rel="noreferrer">
            Apply to GFS
          </a>
        </div>
      </nav>

      <section className="contractHero">
        <div>
          <p className="eyebrow">AI contract copilot for Indian SMEs</p>
          <h1>Review risky vendor clauses before you sign.</h1>
          <p>
            Upload a contract or paste text. The analyzer flags MSME payment exposure, Section 138 cheque risk, GST gaps, foreign jurisdiction, liability traps, and missing protections.
          </p>
          <div className="pilotSignal" aria-label="Target pilot segments">
            <span>Built for early pilots in SaaS, agencies, retail, and services</span>
          </div>
        </div>
        <div className="contractMetrics" aria-label="Product proof points">
          <article>
            <strong>10 min</strong>
            <span>pilot review workflow</span>
          </article>
          <article>
            <strong>45 day</strong>
            <span>MSME payment check</span>
          </article>
          <article>
            <strong>Gemini</strong>
            <span>document reasoning ready</span>
          </article>
        </div>
      </section>

      <section className="pilotLearningStrip" aria-label="Pilot learning focus">
        <div>
          <p className="eyebrow">Pilot hypothesis</p>
          <h2>Payment exposure is the first risk most SMEs understand instantly.</h2>
        </div>
        <div className="pilotLearningGrid">
          <article>
            <strong>Cash-flow risk</strong>
            <span>Flags 60-120 day payment terms and unpaid work exposure.</span>
          </article>
          <article>
            <strong>MSME protection</strong>
            <span>Checks whether payment language should align with 45-day MSME expectations.</span>
          </article>
          <article>
            <strong>Willingness to pay</strong>
            <span>Beta feedback asks whether Rs. 499, Rs. 999, or Rs. 1,999 feels fair.</span>
          </article>
        </div>
      </section>

      <section className="contractWorkspace">
        <aside className="contractInputPanel" aria-label="Upload or paste contract">
          <div>
            <p className="eyebrow">Review</p>
            <h2>Contract input</h2>
          </div>

          <div className="trustSignal">
            <strong>Privacy-first beta</strong>
            <span>Your contract is processed for this review and not stored in a database.</span>
          </div>

          <label className="contractDrop">
            <span>{file ? file.name : "Upload PDF, DOCX, or TXT"}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setMessage("");
              }}
            />
          </label>

          <fieldset className="perspectiveControl">
            <legend>Reviewing as</legend>
            <div>
              <button
                className={perspective === "vendor" ? "active" : ""}
                type="button"
                onClick={() => setPerspective("vendor")}
              >
                Vendor
              </button>
              <button
                className={perspective === "client" ? "active" : ""}
                type="button"
                onClick={() => setPerspective("client")}
              >
                Client
              </button>
            </div>
          </fieldset>

          <label className="contractTextArea">
            Paste contract text
            <textarea
              rows={14}
              value={contractText}
              onChange={(event) => {
                setContractText(event.target.value);
                setMessage("");
              }}
              placeholder="Paste vendor agreement, NDA, service contract, or payment terms..."
            />
          </label>

          {message ? <p className="contractError">{message}</p> : null}

          <div className="contractActions">
            <button className="primaryButton" type="button" disabled={isAnalyzing} onClick={() => void analyzeContract(false)}>
              {isAnalyzing ? "Reviewing..." : "Review My Contract"}
            </button>
            <button className="secondaryButton" type="button" disabled={isAnalyzing} onClick={() => void analyzeContract(true)}>
              Try Sample
            </button>
          </div>

          <p className="contractDisclaimer">Product preview only. Use a lawyer or CA for final advice before signing.</p>
          <p className="betaPricing">Free during beta · early access pricing from Rs. 499/review</p>
        </aside>

        <section className="contractReport" aria-label="Contract risk report">
          {analysis ? (
            <>
              <header className="contractReportHeader">
                <div>
                  <p className="eyebrow">{analysis.source === "gemini" ? "Gemini analysis" : "Demo engine analysis"}</p>
                  <h2>{analysis.verdict}</h2>
                  <p>{analysis.contractType} · {analysis.counterparty}</p>
                </div>
                <div className={`riskDial ${analysis.riskScore >= 75 ? "good" : analysis.riskScore >= 50 ? "warn" : "bad"}`}>
                  <strong>{analysis.riskScore}</strong>
                  <span>risk score</span>
                </div>
              </header>

              <div className="keyConcernRow">
                {analysis.keyConcerns.map((concern) => (
                  <span key={concern}>{concern}</span>
                ))}
              </div>

              <div className="reportGrid">
                <section className="reportBlock">
                  <h3>India-specific flags</h3>
                  {analysis.indiaSpecificFlags.length ? analysis.indiaSpecificFlags.map((risk) => <RiskCard key={risk.title} risk={risk} />) : <p>No India-specific red flag detected in the quick scan.</p>}
                </section>

                <section className="reportBlock">
                  <h3>Commercial risks</h3>
                  {analysis.risks.map((risk) => <RiskCard key={risk.title} risk={risk} />)}
                </section>
              </div>

              <section className="reportBlock">
                <h3>Missing protections</h3>
                <div className="missingGrid">
                  {analysis.missingProtections.length ? analysis.missingProtections.map((item) => <span key={item}>{item}</span>) : <span>Core protections detected. Still run final review.</span>}
                </div>
              </section>

              <section className="negotiationPanel">
                <div>
                  <p className="eyebrow">Founder-ready output</p>
                  <h3>Negotiation email</h3>
                </div>
                <pre>{analysis.negotiationEmail}</pre>
                <button className="whatsAppButton" type="button" onClick={shareOnWhatsApp}>
                  Share with CA / lawyer on WhatsApp
                </button>
              </section>

              <footer className="pilotFooter">
                <strong>{analysis.pilotSummary}</strong>
                <span>{allRisks.length} issue(s) ready for pilot reporting.</span>
              </footer>
            </>
          ) : (
            <div className="emptyContractReport">
              <p className="eyebrow">Live demo</p>
              <h2>Your contract risk report appears here.</h2>
              <p>For pilots, ask founders to share one vendor agreement, NDA, purchase order, or payment clause. Export the findings as anonymized traction.</p>
              <div className="ghostReport" aria-hidden="true">
                <article>
                  <span className="riskBadge high">High</span>
                  <strong>GST vendor agreement</strong>
                  <p>Flags 90-day payment terms, GST documentation gaps, and broad indemnity.</p>
                </article>
                <article>
                  <span className="riskBadge medium">Medium</span>
                  <strong>Founders agreement</strong>
                  <p>Highlights control rights, exit duties, assignment limits, and dispute venue.</p>
                </article>
                <article>
                  <span className="riskBadge high">High</span>
                  <strong>Service contract</strong>
                  <p>Finds one-sided termination, unpaid transition risk, and missing SLAs.</p>
                </article>
              </div>
              <button className="primaryButton" type="button" onClick={() => void analyzeContract(true)}>
                Run Sample Analysis
              </button>
            </div>
          )}
        </section>
      </section>

      <section className="lawContextSection" aria-label="India-specific legal checks">
        <div>
          <p className="eyebrow">India-law context</p>
          <h2>Built for the documents Indian SMEs actually sign.</h2>
          <p>
            ClauseRisk India checks contracts through a local commercial lens, including Indian Contract Act fundamentals, MSME payment timelines, GST documentation, DPDP data obligations, cheque payment exposure, and practical dispute resolution.
          </p>
        </div>
        <div className="lawFeatureGrid">
          <article>
            <strong>Vendor Agreements</strong>
            <span>Payment delays, acceptance discretion, indemnity, liability caps, GST clauses</span>
          </article>
          <article>
            <strong>NDAs</strong>
            <span>Confidentiality scope, survival periods, remedies, data handling, residual knowledge</span>
          </article>
          <article>
            <strong>Service Contracts</strong>
            <span>Scope creep, SLAs, termination, IP ownership, transition duties</span>
          </article>
          <article>
            <strong>Founder Documents</strong>
            <span>Control rights, obligations, dispute venue, assignment, notice clauses</span>
          </article>
        </div>
      </section>

      <section className="beforeAfterSection" aria-label="Before and after contract review">
        <div className="beforeAfterCopy">
          <p className="eyebrow">Before vs after</p>
          <h2>From confusing clauses to negotiation-ready edits.</h2>
        </div>
        <div className="beforeAfterGrid">
          <article>
            <span>Before</span>
            <p>Client shall pay Vendor within 90 days. Vendor shall indemnify Client for all indirect and consequential losses. Disputes shall be resolved in Singapore.</p>
          </article>
          <article>
            <span>After ClauseRisk</span>
            <p>Flagged as high risk for the vendor. Suggested 30-45 day payment terms, liability cap, exclusion of indirect damages, and India-based arbitration.</p>
          </article>
        </div>
      </section>

      <section className="visionSection" aria-label="ClauseRisk India product roadmap">
        <div>
          <p className="eyebrow">CLM roadmap</p>
          <h2>Contract review is the wedge. The platform expands across the full lifecycle.</h2>
        </div>
        <div className="visionGrid">
          <article>
            <span>Live beta</span>
            <h3>Analyze</h3>
            <p>Instant red-flag review for Indian SME contracts, payment risk, DPDP gaps, GST clauses, and negotiation edits.</p>
          </article>
          <article>
            <span>Q3 2026</span>
            <h3>Draft</h3>
            <p>Generate India-specific NDAs, service agreements, vendor contracts, and rent deeds from guided business inputs.</p>
          </article>
          <article>
            <span>Q3 2026</span>
            <h3>Negotiate</h3>
            <p>Suggest counter-clauses and founder-friendly edits when the other side sends a risky draft.</p>
          </article>
          <article>
            <span>Q4 2026</span>
            <h3>Execute & Store</h3>
            <p>Connect e-sign workflows and a renewal vault for deadlines, obligations, and contract reminders.</p>
          </article>
        </div>
      </section>

      <section className="founderNote" aria-label="Founder note">
        <p className="eyebrow">Founder note</p>
        <h2>Built in India by a solo founder to make contract confidence affordable for small businesses.</h2>
        <p>
          ClauseRisk India is starting with review because it is the highest-friction moment: a founder has a contract in hand and needs to know what can hurt them before they sign.
        </p>
      </section>
    </main>
  );
}

function RiskCard({ risk }: { risk: ContractRisk }) {
  return (
    <article className="riskCard">
      <div>
        <span className={`riskBadge ${levelClass(risk.level)}`}>{risk.level}</span>
        <h4>{risk.title}</h4>
      </div>
      <p><strong>Clause:</strong> {risk.clause}</p>
      <p><strong>Why it matters:</strong> {risk.whyItMatters}</p>
      <p><strong>Suggested edit:</strong> {risk.suggestedEdit}</p>
    </article>
  );
}
