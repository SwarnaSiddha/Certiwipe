import { useState, useEffect, useRef } from "react";
import { api } from "../api";

const METHODS = [
  { id: "zeros",   name: "Zero Fill",     passes: 1,  desc: "Overwrites all sectors with 0x00",  std: "Basic" },
  { id: "random",  name: "Random Data",   passes: 1,  desc: "Cryptographic random overwrite",    std: "Basic" },
  { id: "dod3",    name: "DoD 3-Pass",    passes: 3,  desc: "US DoD 5220.22-M standard",         std: "DoD" },
  { id: "dod7",    name: "DoD 7-Pass",    passes: 7,  desc: "DoD ECE 7-pass enhanced",           std: "DoD ECE" },
  { id: "nist",    name: "NIST 800-88",   passes: 1,  desc: "NIST Clear & Purge",                std: "NIST" },
  { id: "gutmann", name: "Gutmann 35",    passes: 35, desc: "Maximum security 35-pass",          std: "Gutmann" },
];

const fmtBytes = b => {
  if (!b) return "—";
  const gb = b / 1024 ** 3, mb = b / 1024 ** 2;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(b/1024)} KB`;
};
const fmtEta = s => {
  if (!s || s <= 0) return "—";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

function Ring({ pct, color = "var(--blue)", size = 155 }) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  const cx   = size / 2;
  return (
    <div className="ring-outer" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg4)" strokeWidth="8"/>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center",
                   transition: "stroke-dashoffset .4s ease, stroke .3s" }}/>
      </svg>
      <div className="ring-center">
        <div className="ring-pct">{pct}%</div>
        <div className="ring-lbl">Progress</div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, color }) {
  return (
    <div className="metric-box">
      <div className="m-label">{label}</div>
      <div className="m-val" style={{ color: color || "var(--t1)" }}>
        {value ?? "—"}{unit && <span style={{ fontSize: 9, marginLeft: 2, color: "var(--t3)" }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function WipeEngine({
  sysInfo, selectedDevice, activeJob, setActiveJob, setCompletedJobs, setTab
}) {
  const [method,   setMethod]   = useState("dod3");
  const [verify,   setVerify]   = useState(true);
  const [job,      setJob]      = useState(null);
  const [logs,     setLogs]     = useState([{ ts: "--:--:--", msg: "Awaiting operation...", cls: "t-info" }]);
  const [confirmed,setConfirmed]= useState(false);
  const [running,  setRunning]  = useState(false);

  const pollRef  = useRef(null);
  const logEnd   = useRef(null);
  const lastMsg  = useRef("");

  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
// useEffect(() => {
//   if (!job || job.status !== "wiping") return;

//   pollRef.current = setInterval(async () => {
//     try {
//       const res = await fetch(`/api/job/${job.id}`);
//       const data = await res.json();

//       setJob(data);   // ⭐ THIS updates live metrics
//     } catch (e) {
//       console.error(e);
//     }
//   }, 1000);

//   return () => {
//     if (pollRef.current) clearInterval(pollRef.current);
//   };
// }, [job?.id, job?.status]);
useEffect(() => {
  if (!job?.job_id) return;

  pollRef.current = setInterval(async () => {
    try {
      const res = await fetch(`/api/job/${job.job_id}`);
      const data = await res.json();

      setJob(data); // 🔥 live update

      if (data.status === "completed" || data.status === "failed") {
        clearInterval(pollRef.current);
      }
    } catch (e) {
      console.error(e);
    }
  }, 500); // faster updates

  return () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };
}, [job?.job_id]);
  const addLog = (msg, cls = "t-msg") => {
    if (msg === lastMsg.current) return;
    lastMsg.current = msg;
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs(prev => [...prev.slice(-120), { ts, msg, cls }]);
  };

  const startWipe = async () => {
    if (!selectedDevice || running) return;
    setRunning(true);
    setConfirmed(false);
    addLog(`Initializing wipe: ${selectedDevice.device_path}`, "t-info");
    addLog(`Method: ${METHODS.find(m => m.id === method)?.name}`, "t-info");
    addLog(`Device size: ${selectedDevice.total} GB`, "t-info");
    addLog(`Verify after wipe: ${verify}`, "t-info");
    addLog(`Admin mode: ${sysInfo?.is_admin ? "YES — real wipe" : "NO — will be blocked"}`, "t-info");
console.log("Sending wipe request:", {
  device_path: selectedDevice.device_path,
  method,
  passes: 3,
  verify_after: verify
});
    try {
      const res = await api.startWipe({
  device_path: selectedDevice.device_path,
  method: method,
  passes: 3,
  verify_after: verify
});
      
      setActiveJob(res.job_id);
      addLog(`Job started: ${res.job_id}`, "t-info");

      pollRef.current = setInterval(async () => {
        try {
          const s = await api.wipeStatus(res.job_id);
          setJob(s);
          if (s.message) addLog(s.message);

          if (s.status === "completed") {
            clearInterval(pollRef.current);
            setRunning(false);
            addLog("✓ Wipe operation completed!", "t-msg");
            if (s.verification_hash) addLog(`SHA-256: ${s.verification_hash}`, "t-info");
            if (s.verify_confidence) addLog(`Verification confidence: ${s.verify_confidence}%`, "t-info");
            setCompletedJobs(prev => [...prev, s]);
          }
          if (s.status === "failed") {
            clearInterval(pollRef.current);
            setRunning(false);
            addLog(`✗ FAILED: ${s.error || s.message}`, "t-err");
          }
        } catch (e) {
          addLog(`Poll error: ${e.message}`, "t-warn");
        }
      }, 350);

    } catch (e) {
      addLog(`Failed to start job: ${e.message}`, "t-err");
      setRunning(false);
    }
  };

  const isVerifying  = job?.status === "verifying";
  const isComplete   = job?.status === "completed";
  const isFailed     = job?.status === "failed";
  const isActive     = running || ["queued","wiping","verifying"].includes(job?.status);
  const ringPct      = isVerifying ? (job?.verify_progress || 0) : (job?.progress || 0);
  const ringColor    = isComplete ? "var(--green)" : isFailed ? "var(--red)" : "var(--blue)";
  const realMode     = sysInfo?.real_wipe_ready;

  return (
    <div className="page">
      <div className="page-header">
        <div className="row between">
          <div>
            <div className="page-title">Wipe Engine</div>
            <div className="page-sub">Real-time secure data erasure with live metrics</div>
          </div>
          <span className={`badge ${realMode ? "bg" : "ba"}`}>
            {realMode ? "● REAL WIPE ACTIVE" : "⚠ ADMIN REQUIRED"}
          </span>
        </div>
      </div>

      {!realMode && sysInfo && (
        <div className="alert alert-amber"><span>⚠</span>
          <div><strong>Wipe will be blocked:</strong> {sysInfo.note}</div>
        </div>
      )}
      {!selectedDevice && (
        <div className="alert alert-info"><span>ℹ</span>
          <div>No device selected.&nbsp;
            <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setTab("devices")}>
              Go to Devices →
            </span>
          </div>
        </div>
      )}

      <div className="grid2">
        {/* ── LEFT: Config ── */}
        <div className="col" style={{ gap: 12 }}>

          {/* Target device */}
          {selectedDevice && (
            <div className="card">
              <div className="sec-lbl">Target Device</div>
              <div className="row g12">
                <span style={{ fontSize: 28 }}>
                   {selectedDevice.fstype === "FAT32" ? "🔌" : "💾"}
  </span>

  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
      {selectedDevice.device}
    </div>

    <div className="dim">
  {selectedDevice.mountpoint} • {(selectedDevice.total / (1024 ** 3)).toFixed(1)} GB
</div>

<div className="dim">
  Used: {(selectedDevice.used / (1024 ** 3)).toFixed(1)} GB | 
  Free: {(selectedDevice.free / (1024 ** 3)).toFixed(1)} GB
</div>

    <div className="dim">
      FS: {selectedDevice.fstype}
    </div>
  </div>
</div>
              {selectedDevice.is_os_disk && (
                <div className="alert alert-danger mt8" style={{ marginBottom: 0 }}>
                  <span>🔒</span><strong>OS drive — wipe is blocked automatically for your safety.</strong>
                </div>
              )}
            </div>
          )}

          {/* Method */}
          <div className="card">
            <div className="sec-lbl">Erasure Method</div>
            <div className="method-grid">
              {METHODS.map(m => (
                <div key={m.id}
                  className={`method-card ${method === m.id ? "active" : ""}`}
                  onClick={() => !isActive && setMethod(m.id)}>
                  <div className="mc-name">{m.name}</div>
                  <div className="mc-desc">{m.desc}</div>
                  <div className="mc-pass">{m.passes} PASS{m.passes !== 1 ? "ES" : ""} · {m.std}</div>
                </div>
              ))}
            </div>
            <div className="row between">
              <div>
                <div style={{ fontSize: 10, color: "var(--t1)" }}>Verify after wipe</div>
                <div className="dim">Real sector-level read-back verification</div>
              </div>
              <button className={`btn ${verify ? "btn-success" : "btn-ghost"}`}
                style={{ padding: "5px 14px" }}
                onClick={() => !isActive && setVerify(v => !v)}>
                {verify ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Danger zone */}
          {selectedDevice && !selectedDevice.is_os_disk && !isActive && !isComplete && (
            <div className="card" style={{ border: "1px solid rgba(255,51,82,.3)" }}>
              <div className="sec-lbl" style={{ color: "var(--red)" }}>⚠ Danger Zone</div>
              <div style={{ fontSize: 9.5, color: "var(--t2)", marginBottom: 10, lineHeight: 1.7 }}>
                {realMode
                  ? <><strong style={{ color: "var(--red)" }}>⚠ REAL WIPE:</strong> All data on <strong>{selectedDevice.name}</strong> ({selectedDevice.total} GB) will be <strong>permanently destroyed</strong>. This cannot be undone.</>
                  : <>Admin privileges required. Without admin, the wipe will be blocked and no data will be modified.</>}
              </div>
              <div className="row g8 mb12">
                <input type="checkbox" id="conf" checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  style={{ width: 13, height: 13 }}/>
                <label htmlFor="conf" style={{ fontSize: 9.5, cursor: "pointer", color: "var(--t2)" }}>
                  I understand and accept responsibility for this operation
                </label>
              </div>
              <button className="btn btn-danger btn-full"
                disabled={!confirmed || !selectedDevice}
                onClick={startWipe}>
                ◈ START SECURE WIPE
              </button>
            </div>
          )}

          {/* Post-complete */}
          {isComplete && (
            <div className="card">
              <div className="sec-lbl">Operation Complete</div>
              <div className="alert alert-success" style={{ marginBottom: 10 }}>
                <span>✓</span><span>Wipe verified and complete. Generate a certificate below.</span>
              </div>
              <button className="btn btn-success btn-full" onClick={() => setTab("certificates")}>
                ◉ Generate PDF Certificate
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Progress + Metrics ── */}
        <div className="col" style={{ gap: 12 }}>

          {/* Ring + progress */}
          <div className="card">
            <div className="row between mb16">
              <div className="card-title" style={{ marginBottom: 0 }}>
                {isVerifying ? "Verification Progress" : "Wipe Progress"}
              </div>
              {job && (
                <span className={`badge ${
                  isComplete ? "bg" : isActive ? "bb" : isFailed ? "br" : "bd"}`}>
                  {job.status?.toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <Ring pct={ringPct} color={ringColor}/>
            </div>

            {job && (
              <div className="mt16 col g8">
                {/* Pass bar */}
                {(job.status === "wiping" || isComplete) && (
                  <div>
                    <div className="row between dim mb4">
                      <span>Pass {job.current_pass || 0} / {job.total_passes || 0}</span>
                      <span style={{ color: "var(--cyan)" }}>
                        {job.current_pattern ? `[${job.current_pattern.toUpperCase()}]` : ""}
                      </span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: `${job.pass_progress || 0}%` }}/>
                    </div>
                  </div>
                )}
                {/* Verify bar */}
                {(isVerifying || (isComplete && (job.total_sampled || 0) > 0)) && (
                  <div>
                    <div className="row between dim mb4">
                      <span>Verification scan</span>
                      <span style={{ color: "var(--green)" }}>{job.verify_progress || 0}%</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill green" style={{ width: `${job.verify_progress || 0}%` }}/>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 9.5, color: "var(--t2)", lineHeight: 1.6 }}>
                  {job.message}
                </div>
              </div>
            )}
          </div>

          {/* Live Wipe Metrics */}
          {job && (job.status === "wiping" || isComplete) && (
            <div className="card">
              <div className="sec-lbl">Live Wipe Metrics</div>
              <div className="metric-grid">
                <Metric label="Write Speed" value={job.speed_mbps} unit="MB/s" color="var(--blue)"/>
                <Metric label="Written"     value={fmtBytes(job.bytes_written)}/>
                <Metric label="Total"       value={fmtBytes(job.total_bytes)}   color="var(--t3)"/>
                <Metric label="Elapsed"     value={`${job.elapsed_seconds || 0}s`} color="var(--t2)"/>
                <Metric label="ETA"         value={fmtEta(job.eta_seconds)}     color="var(--amber)"/>
                <Metric label="Pass"        value={`${job.current_pass || 0}/${job.total_passes || 0}`} color="var(--cyan)"/>
              </div>
            </div>
          )}

          {/* Verification Metrics */}
          {job && (isVerifying || (isComplete && (job.total_sampled || 0) > 0)) && (
            <div className="card">
              <div className="sec-lbl">Verification Metrics</div>
              <div className="metric-grid">
                <Metric label="Clean Blocks"  value={job.verified_blocks}     color="var(--green)"/>
                <Metric label="Dirty Blocks"  value={job.dirty_blocks || 0}
                  color={(job.dirty_blocks || 0) > 0 ? "var(--red)" : "var(--t3)"}/>
                <Metric label="Sectors Sampled" value={job.total_sampled}     color="var(--t2)"/>
                <Metric label="Confidence"    value={`${job.verify_confidence || 0}%`}
                  color={(job.verify_confidence || 0) >= 99.9 ? "var(--green)" : "var(--amber)"}/>
                <Metric label="Scan Speed"    value={job.verify_speed_mbps}   unit="MB/s" color="var(--cyan)"/>
                <Metric label="Result"
                  value={isComplete ? (job.verification_passed ? "PASS ✓" : "FAIL ✗") : "..."}
                  color={job.verification_passed ? "var(--green)" : "var(--red)"}/>
              </div>

              {isComplete && job.verification_hash && (
                <div className="hash-box">
                  <div className="hash-lbl">SHA-256 Verification Hash</div>
                  <div className="hash-val">{job.verification_hash}</div>
                </div>
              )}

              {isComplete && job.verification_error && (
                <div className="alert alert-danger mt8" style={{ marginBottom: 0 }}>
                  <span>✗</span><span>Verify error: {job.verification_error}</span>
                </div>
              )}
            </div>
          )}

          {/* Terminal Log */}
          <div className="card" style={{ padding: 14 }}>
            <div className="sec-lbl">Operation Log</div>
            <div className="terminal">
              {logs.map((l, i) => (
                <div key={i} className="t-line">
                  <span className="t-ts">{l.ts}</span>
                  <span className={l.cls || "t-msg"}>{l.msg}</span>
                </div>
              ))}
              <div ref={logEnd}/>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
