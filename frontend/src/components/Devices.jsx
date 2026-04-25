import { useEffect, useState } from "react";
import { api } from "../api";

const typeIcon = t => {
  if (!t) return "💾";
  const l = t.toLowerCase();
  if (l.includes("usb"))  return "🔌";
  if (l.includes("nvme")) return "⚡";
  if (l.includes("ssd"))  return "🔷";
  if (l.includes("sd") || l.includes("emmc")) return "💳";
  if (l.includes("optical")) return "💿";
  return "💾";
};

export default function Devices({ sysInfo, selectedDevice, setSelectedDevice, setTab }) {
  const [devices,  setDevices]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error,    setError]    = useState(null);
  const [ts,       setTs]       = useState(null);

  const load = async () => {
    setScanning(true); setError(null);
    try {
      const d = await api.devices();
      setDevices(d.devices|| []);
      //setTs(d.timestamp);
    } catch (e) {
      setError(JSON.stringify(e));
      console.log(e);
    } finally {
      setLoading(false); setScanning(false);
    }
  };

  // useEffect(() => { load(); }, []);
  useEffect(() => {
  load(); // first load

  const interval = setInterval(() => {
    load(); // auto refresh every 2 sec
  }, 2000);

  return () => clearInterval(interval);
}, []);

  const usedPct = d => d.total > 0 ? Math.round(d.used / d.total * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div className="row between">
          <div>
            <div className="page-title">Device Detection</div>
            <div className="page-sub">
              Real-time scan of all connected storage devices on {sysInfo?.os || "your system"}
              {ts && <span style={{ marginLeft: 8, color: "var(--t3)", fontSize: 9 }}>
                Last scan: {new Date(ts).toLocaleTimeString()}
              </span>}
            </div>
          </div>
          <div className="row g8">
            <button className="btn btn-primary" onClick={load} disabled={scanning}>
              {scanning ? <span className="spinner"/> : "⟳"} Rescan
            </button>
            {selectedDevice && (
              <button className="btn btn-danger" onClick={() => setTab("wipe")}>
                ◈ Wipe Selected
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger"><span>⚠</span><span>{error}</span></div>
      )}
      {sysInfo && !sysInfo.real_wipe_ready && (
        <div className="alert alert-amber"><span>⚠</span>
          <div><strong>No admin privileges.</strong> Devices detected but wiping is blocked. {sysInfo.note}</div>
        </div>
      )}

      {loading ? (
        <div className="device-grid">
          {[1,2,3].map(i => (
            <div key={i} className="card">
              <div className="skel mb8" style={{ width: 40, height: 40, borderRadius: 8 }}/>
              <div className="skel mb8"/><div className="skel" style={{ width: "60%" }}/>
            </div>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ color: "var(--t2)", fontSize: 12 }}>No storage devices detected.</div>
          <div className="dim mt8">Connect a drive and click Rescan.</div>
        </div>
      ) : (
        <>
          <div className="dim mb12">
            {devices.length > 0 && (
  <div>
    {devices.length} device{devices.length !== 1 ? "s" : ""} found
  </div>
)}
            {selectedDevice && <> · <span style={{ color: "var(--blue)" }}>{selectedDevice.mountpoint} selected</span></>}
          </div>
          <div className="device-grid">
            {devices.map(d => {
              const used = d.used;
const total = d.total;
const percent = d.total > 0
  ? ((d.used / d.total) * 100).toFixed(1)
  : 0;
              const isSel = selectedDevice?.mountpoint === d.mountpoint;
              return (
                <div key={d.mountpoint}
                  className={`device-card ${isSel ? "selected" : ""} ${d.is_os_disk ? "os-disk" : ""}`}
                  onClick={() => setSelectedDevice(d)}>

                  <div className="row between mb8">
                    <div className="dev-icon">{typeIcon(d.is_usb? "USB":"HDD")}</div>
                    <div className="col g4" style={{ alignItems: "flex-end" }}>
                      {d.is_os_disk && <span className="badge br">OS DRIVE</span>}
                      {isSel && <span className="badge bb">✓ SELECTED</span>}
                      <span className={`badge ${
                        d.smart === "PASSED" || d.health === "Good" ? "bg" :
                        d.smart === "FAILED" ? "br" : "bd"}`}>
                        SMART: {d.smart || d.health || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="dev-name">{d.device}</div>
<div className="dev-type"> {d.is_usb ? "🔌 USB Drive" : "💻 Local Disk"}</div>
                  <div className="dev-stats">
                   <div className="ds-v">
  {(d.total / (1024 ** 3)).toFixed(1)} GB
</div>

<div className="ds-v">
  {(d.used / (1024 ** 3)).toFixed(1)} GB
</div>

<div className="ds-v">
  {
    d.total > 0
      ? ((d.used / d.total) * 100).toFixed(1)
      : 0
  } %
</div>
                  </div>
                  <div className="usage-bar"><div className="usage-fill" style={{ width: `${d.total ? (d.used / d.total) * 100 : 0}%` }}/></div>

                  <div className="divider"/>
                  <div className="col g4">
                    {[
                       ["File System", d.fstype],
                       ["Mount", d.mountpoint],
                       ["Type", d.is_usb ? "USB Drive" : "Local Disk"],

                    ].map(([l, v]) => (
                      <div key={l} className="row between">
                        <span className="dim">{l}</span>
                        <span style={{ fontSize: 9, color: "var(--t2)", maxWidth: 140,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v || "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {d.is_os_disk && (
                    <div className="alert alert-danger mt8" style={{ marginBottom: 0, padding: "6px 9px", fontSize: 9 }}>
                      <span>🔒</span><span>OS drive — wipe blocked for safety</span>
                    </div>
                  )}

                  {!d.is_os_disk && (
                    <button className="btn btn-danger btn-full mt12"
                      onClick={e => { e.stopPropagation(); setSelectedDevice(d); setTab("wipe"); }}>
                      ◈ Select for Wipe
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
