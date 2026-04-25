import { useState, useEffect } from "react";
import { api } from "../api";

export default function Certificates({ completedJobs }) {
  const [selIdx,      setSelIdx]      = useState(null);
  const [org,         setOrg]         = useState("CertiWipe Secure");
  const [tech,        setTech]        = useState("Administrator");
  const [notes,       setNotes]       = useState("");
  const [generating,  setGenerating]  = useState(false);
  const [certResult,  setCertResult]  = useState(null);
  const [error,       setError]       = useState(null);
  const [pastCerts,   setPastCerts]   = useState([]);

  useEffect(() => {
    api.certsList().then(d => setPastCerts(d.certificates || [])).catch(() => {});
  }, [certResult]);

  const job = completedJobs[selIdx ?? completedJobs.length - 1];

  const generate = async () => {
    if (!job) return;
    setGenerating(true); setError(null); setCertResult(null);
    try {
      const r = await api.genCert({
        job_id:       job.job_id,
        organization: org,
        technician:   tech,
        notes,
      });
      setCertResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Certificate Generation</div>
        <div className="page-sub">
          Generate tamper-evident PDF certificates for completed wipe operations
        </div>
      </div>

      {completedJobs.length === 0 && (
        <div className="alert alert-info">
          <span>ℹ</span><span>No completed wipe jobs yet. Complete a wipe operation first.</span>
        </div>
      )}

      <div className="grid2">
        {/* LEFT */}
        <div className="col" style={{ gap: 14 }}>

          {/* Completed jobs */}
          <div className="card">
            <div className="card-title">Completed Wipe Jobs</div>
            {completedJobs.length === 0 ? (
              <div className="dim">No completed jobs.</div>
            ) : (
              <div className="col g8">
                {completedJobs.map((j, i) => (
                  <div key={j.job_id}
                    className={`method-card ${
                      (selIdx === i || (selIdx === null && i === completedJobs.length - 1)) ? "active" : ""
                    }`}
                    onClick={() => setSelIdx(i)}
                    style={{ cursor: "pointer" }}>
                    <div className="row between">
                      <div>
                        <div className="mc-name">{j.device_path}</div>
                        <div className="mc-desc">
                          {j.method_name} · {j.total_passes} passes · {j.standard}
                        </div>
                        <div style={{ fontSize: 8, color: "var(--t3)", marginTop: 2 }}>
                          {(j.completed_at || "").slice(0, 19).replace("T", " ")} UTC
                        </div>
                      </div>
                      <div className="col g4">
                        <span className="badge bg">DONE</span>
                        {j.verification_passed && <span className="badge bb">VERIFIED</span>}
                        {j.verify_confidence && (
                          <span className="badge bd">{j.verify_confidence}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificate preview */}
          <div className="cert-preview">
            <div style={{ textAlign: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
              <div style={{ fontSize: 30, marginBottom: 5 }}>🛡️</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 800, marginBottom: 2 }}>
                CERTIFICATE OF DATA ERASURE
              </div>
              <div className="dim">CertiWipe v4.0 · Secure Erasure Platform</div>
            </div>
            <div className="col g6">
              {[
                ["Organization",  org || "—"],
                ["Technician",    tech || "—"],
                ["Device",        job?.device_path || "—"],
                ["Method",        job?.method_name || "—"],
                ["Standard",      job?.standard || "—"],
                ["Passes",        job?.total_passes ? `${job.total_passes} completed` : "—"],
                ["Written",       job?.bytes_written ? `${(job.bytes_written/(1024**3)).toFixed(2)} GB` : "—"],
                ["Verification",  job?.verification_passed ? "PASSED ✓" : job?.total_sampled ? "PASSED ✓" : "—"],
                ["Confidence",    job?.verify_confidence ? `${job.verify_confidence}%` : "—"],
              ].map(([l, v]) => (
                <div key={l} className="row between">
                  <span className="dim">{l}</span>
                  <span style={{ fontSize: 9.5,
                    color: v.includes("PASSED") ? "var(--green)" :
                           v.includes("FAILED") ? "var(--red)" :
                           "var(--t2)" }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Past certificates */}
          {pastCerts.length > 0 && (
            <div className="card">
              <div className="card-title">Previously Generated</div>
              <div className="col g8">
                {pastCerts.slice(-5).reverse().map(c => (
                  <div key={c.cert_id} className="row between" style={{
                    padding: "7px 10px", background: "var(--bg1)",
                    borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600 }}>{c.cert_id}</div>
                      <div className="dim">{c.organization} · {(c.created_at || "").slice(0, 10)}</div>
                    </div>
                    <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 9 }}
                      onClick={() => window.open(api.certDownload(c.cert_id), "_blank")}>
                      ↓ PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-title">Certificate Details</div>
            <div className="col g12">
              <div>
                <div className="dim mb4">Organization / Company</div>
                <input type="text" value={org} onChange={e => setOrg(e.target.value)}
                  placeholder="e.g. Acme Corporation"/>
              </div>
              <div>
                <div className="dim mb4">Technician Name</div>
                <input type="text" value={tech} onChange={e => setTech(e.target.value)}
                  placeholder="e.g. John Smith"/>
              </div>
              <div>
                <div className="dim mb4">Additional Notes (optional)</div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Asset tag, reason for erasure, work order number..."
                  rows={3}/>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger"><span>✗</span><span>{error}</span></div>
          )}

          {certResult && (
            <div className="card">
              <div className="row g12">
                <div style={{ width: 42, height: 42, borderRadius: 10,
                  background: "rgba(0,230,118,.1)", border: "1px solid rgba(0,230,118,.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Certificate Ready</div>
                  <div className="dim">ID: {certResult.cert_id}</div>
                </div>
                <button className="btn btn-success"
                  onClick={() => window.open(api.certDownload(certResult.cert_id), "_blank")}>
                  ↓ Download PDF
                </button>
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-full"
            onClick={generate}
            disabled={!job || generating || completedJobs.length === 0}>
            {generating
              ? <><span className="spinner"/> Generating...</>
              : "◉ Generate PDF Certificate"}
          </button>

          {/* What's included */}
          <div className="card">
            <div className="card-title">Certificate Includes</div>
            <div className="col" style={{ gap: 5, fontSize: 9.5, color: "var(--t2)" }}>
              {[
                "Device path, model, serial number & interface",
                "Erasure method & compliance standard",
                "Number of passes & patterns applied",
                "Average write speed & total bytes written",
                "Wipe duration & timestamps (UTC)",
                "Real sector-level verification result",
                "Clean/dirty block count & sample size",
                "Confidence percentage",
                "Full SHA-256 cryptographic verification hash",
                "Operating system & wipe mode",
                "Organization & technician details",
                "Unique certificate ID",
                "Official compliance statement",
              ].map(item => (
                <div key={item} className="row g8">
                  <span style={{ color: "var(--green)", flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
