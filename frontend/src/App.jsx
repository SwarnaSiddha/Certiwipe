import { useState, useEffect, useCallback } from "react";
import { api } from "./api";
import Dashboard    from "./components/Dashboard";
import Devices      from "./components/Devices";
import WipeEngine   from "./components/WipeEngine";
import Certificates from "./components/Certificates";

const NAV = [
  { id: "dashboard",    icon: "⬡", label: "Dashboard"     },
  { id: "devices",      icon: "⬜", label: "Devices"       },
  { id: "wipe",         icon: "◈", label: "Wipe Engine"   },
  { id: "certificates", icon: "◉", label: "Certificates"  },
];

export default function App() {
  const [tab,            setTab]            = useState("dashboard");
  const [sysInfo,        setSysInfo]        = useState(null);
  const [apiOnline,      setApiOnline]      = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [activeJob,      setActiveJob]      = useState(null);
  const [completedJobs,  setCompletedJobs]  = useState([]);
  const [devices, setDevices] = useState([]);
  const fetchSys = useCallback(async () => {
    try {
      const d = await api.system();
      setSysInfo(d); setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  }, []);
const fetchDevices = useCallback(async () => {
  try {
    const res = await api.devices();
    setDevices(res.devices);
  } catch (e) {
    console.error(e);
  }
}, []);
  useEffect(() => {
  fetchSys();
  fetchDevices();

  const t = setInterval(() => {
    fetchSys();
    fetchDevices();
  }, 5000);

  return () => clearInterval(t);
}, [fetchSys, fetchDevices]);

 const ctx = {
  sysInfo,
  apiOnline,
  devices,   
  selectedDevice,
  setSelectedDevice,
  activeJob,
  setActiveJob,
  completedJobs,
  setCompletedJobs,
  setTab
};
  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="logo-row">
            <div className="logo-box">🛡</div>
            <span className="logo-name">CertiWipe</span>
          </div>
          <div className="logo-sub">Secure Erasure Platform</div>
        </div>
        <nav className="nav">
          <div className="nav-group">Navigation</div>
          {NAV.map(n => (
            <div key={n.id}
              className={`nav-item ${tab === n.id? "active" : ""}`}
              onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="api-indicator">
            <div className={`pulse ${apiOnline ? "" : "off"}`}/>
            <span>{apiOnline ? "API Online" : "API Offline"}</span>
          </div>
          {sysInfo && (
            <div className="dim mt4" style={{ fontSize: 8 }}>
              {sysInfo.os} · {sysInfo.is_admin ? "Admin ✓" : "No admin ✗"}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-area">
        {!apiOnline && (
          <div style={{ padding: "14px 36px 0", position: "relative", zIndex: 2 }}>
            <div className="alert alert-danger">
              <span>⚠</span>
              <div>
                <strong>Backend offline.</strong> Start it first:&nbsp;
                <code style={{ fontSize: 9, background: "rgba(255,255,255,.07)", padding: "2px 6px", borderRadius: 3 }}>
                  cd backend &amp;&amp; python main.py
                </code>
                &nbsp;— or use &nbsp;
                <code style={{ fontSize: 9, background: "rgba(255,255,255,.07)", padding: "2px 6px", borderRadius: 3 }}>
                  sudo python main.py
                </code>
                &nbsp;for real wiping.
              </div>
            </div>
          </div>
        )}

        {tab === "dashboard"    && <Dashboard    {...ctx}/>}
        {tab === "devices"      && <Devices      {...ctx}/>}
        {tab === "wipe"         && <WipeEngine   {...ctx}/>}
        {tab === "certificates" && <Certificates {...ctx}/>}
      </main>
    </div>
  );
}
