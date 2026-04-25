import { useEffect, useState } from "react";
import { api } from "../api";

const OS_ICON = { Windows: "🪟", Darwin: "🍎", Linux: "🐧" };

export default function Dashboard({ sysInfo, completedJobs, setTab }) {
  const [devices,  setDevices]  = useState([]);
  const [loading,  setLoading]  = useState(true);
//   const handleScan = async () => {
//   setLoading(true);
//   const data = await api.devices();
//   setDevices(data || []);
//   setLoading(false);
// };
const handleScan = async () => {
  setLoading(true);
  try {
    const d = await api.devices();
    setDevices(Array.isArray(d?.devices) ? d.devices : []);
  } catch (e) {
    console.error(e);
  }
  setLoading(false);
};
console.log("Devices:", devices);
  // useEffect(() => {
  //   api.devices()
  //     .then(d => { setDevices(d.devices || []); setLoading(false); })
  //     .catch(() => setLoading(false));
  // }, []);
//   useEffect(() => {
//   api.devices()
//     .then(d => { 
//       setDevices(Array.isArray(d) ? d : (Array.isArray(d.devices) ? d.devices : []));
//       setLoading(false); 
//     })
//     .catch(() => setLoading(false));
// }, []);
useEffect(() => {
  api.devices()
    .then(d => {
      console.log("Devices:", d);  // keep this
      setDevices(Array.isArray(d?.devices) ? d.devices : []);
      setLoading(false);
    })
    .catch(() => setLoading(false));
}, []);

//  const totalGB = devices
//const deviceList = Array.isArray(devices) ? devices : [];
// const totalGB = deviceList
//   .filter(d => d.device_path?.endsWith(":\\")) // safer
//   .reduce((a, d) => a + (d.size_gb || 0), 0) / (1024 ** 3);
// const totalGB = deviceList
//   .filter(d => d.path?.endsWith(":\\"))
//   .reduce((a, d) => a + (d.size_gb || 0), 0);
// const totalGB = deviceList.reduce((sum, d) => {
//   if (d.size_gb) return sum + d.size_gb;
//   if (d.size_bytes) return sum + (d.size_bytes / (1024 ** 3));
//   return sum;
// }, 0);
const deviceList = Array.isArray(devices) ? devices : [];

const totalGB = deviceList.reduce((sum, d) =>
  sum + ((d.total || 0) / (1024 ** 3)), 0);

const usedGB = deviceList.reduce((sum, d) =>
  sum + ((d.used || 0) / (1024 ** 3)), 0);

const freeGB = deviceList.reduce((sum, d) =>
  sum + ((d.free || 0) / (1024 ** 3)), 0);

// format
// const totalFormatted = totalGB.toFixed(1);
// const usedFormatted = usedGB.toFixed(1);
// const freeFormatted = freeGB.toFixed(1);

// Format
const usedFormatted = usedGB.toFixed(1);
const totalFormatted = totalGB.toFixed(1);
const freeFormatted = freeGB.toFixed(1);

const totalGBFormatted = totalGB.toFixed(1);
  const usbDevices = deviceList.filter(d => d.is_usb);
  const osName    = sysInfo?.os || "—";
  const osIcon    = OS_ICON[osName] || "💻";
  const realMode  = sysInfo?.real_wipe_ready;

  return (
    <div className="page">
      <div className="page-header">
        <div className="row g8 mb8">
          <span className={`badge ${realMode ? "bg" : "ba"}`}>
            {realMode ? "● REAL WIPE ACTIVE" : "⚠ NO ADMIN — WIPE BLOCKED"}
          </span>
          <span className="badge bd">{osIcon} {osName}</span>
          <span className="badge bd">v4.0.0</span>
        </div>
        <div className="page-title">Security Dashboard</div>
        <div className="page-sub">Real-time device monitoring &amp; secure erasure control</div>
      </div>

      {/* System alert */}
      {sysInfo && (
        <div className={`alert ${realMode ? "alert-success" : "alert-amber"}`}>
          <span>{realMode ? "✅" : "⚠"}</span>
          <div>
            <strong>{osIcon} {osName} — {realMode ? "Real wipe ready" : "Elevated privileges required"}</strong>
            <br/><span style={{ fontSize: 9 }}>{sysInfo.note}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card sc-blue">
          <div className="stat-label">Devices</div>
          <div className="stat-val">{loading ? "—" : deviceList.length || 0}</div>
          <div className="stat-sub">detected on {osName}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-label">Wipes Done</div>
          <div className="stat-val">{completedJobs.length}</div>
          <div className="stat-sub">this session</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-label">Total Storage</div>
          <div className="stat-val">{loading ? "—" : totalGB}</div>
          <div className="stat-sub">GB detected</div>
        </div>
        <div className="stat-card sc-red">
          <div className="stat-label">Certificates</div>
          <div className="stat-val">{completedJobs.length}</div>
          <div className="stat-sub">generated</div>
        </div>
      </div>

      <div className="grid2">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-title">Quick Actions</div>
          <div className="col g8">
            <button className="btn btn-primary" onClick={handleScan}>SCAN DEVICES</button>
            <button className="btn btn-danger"  onClick={() => setTab("wipe")}>◈ Start Wipe Operation</button>
            <button className="btn btn-ghost"   onClick={() => setTab("certificates")}>◉ View Certificates</button>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-title">System Status</div>
          <div className="col g8">
            {[
              ["OS",           `${osIcon} ${osName}`],
              ["Privileges",   sysInfo?.is_admin ? "✅ Admin / Root" : "❌ No admin"],
              ["Real Wipe",    sysInfo?.real_wipe_ready ? "✅ Enabled" : "❌ Blocked"],
              ["PDF Engine",   sysInfo?.reportlab ? "✅ ReportLab installed" : "❌ Run: pip install reportlab"],
              ["Python",       sysInfo?.python_version || "—"],
            ].map(([l, v]) => (
              <div key={l} className="row between">
                <span style={{ fontSize: 10, color: "var(--t2)" }}>{l}</span>
                <span style={{ fontSize: 10, fontWeight: 600,
                  color: v.startsWith("✅") ? "var(--green)" : v.startsWith("❌") ? "var(--red)" : "var(--t1)" }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Erasure Standards */}
        <div className="card">
          <div className="card-title">Erasure Standards</div>
          <div className="col g8">
            {[
              ["Zero Fill",       "1 pass",  "bd"],
              ["Random Overwrite","1 pass",  "bd"],
              ["DoD 5220.22-M",   "3/7 pass","bb"],
              ["NIST SP 800-88",  "1 pass",  "bg"],
              ["Gutmann",         "35 pass", "ba"],
            ].map(([n, p, b]) => (
              <div key={n} className="row between">
                <span style={{ fontSize: 10 }}>{n}</span>
                <span className={`badge ${b}`}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Devices Preview */}
        <div className="card">
          <div className="row between mb12">
            <div className="card-title" style={{ marginBottom: 0 }}>Connected Devices</div>
            <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 9 }}
              onClick={() => setTab("devices")}>View All →</button>
          </div>
          {loading ? (
            <div className="col g8">
              <div className="skel"/>
              <div className="skel" style={{ width: "70%" }}/>
              <div className="skel" style={{ width: "85%" }}/>
            </div>
          ) : deviceList.length === 0 ? (
            <div className="dim">No devices detected. Click Scan Devices.</div>
          ) : (
            deviceList.slice(0, 4).map(d => (
              <div key={d.id} className="row between mt8" style={{
                padding: "8px 10px", background: "var(--bg1)",
                borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
                <div className="row g10">
                  
                    <span style={{ fontSize: 15 }}>
  {d.is_usb ? "🔌" : "💽"}
</span>
                    
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600 }}>
  {d.device_path} {d.is_usb ? "(USB)" : "(Local Disk)"}
</div>

<div className="dim">
  {(d.total / (1024 ** 3)).toFixed(1)} GB • Used: {(d.used / (1024 ** 3)).toFixed(1)} GB
</div>
                  </div>
                </div>
                <div className="row g4">
                  {d.is_os_disk && <span className="badge br">OS</span>}
                  <span className={`badge ${d.health === "Verified" || d.smart === "PASSED" ? "bg" : "bd"}`}>
                    {d.health || d.smart || "N/A"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
