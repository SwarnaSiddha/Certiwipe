const BASE = "http://127.0.0.1:8000";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  system:       ()     => req("/api/system"),
  devices:      ()     => req("/api/devices"),
  methods:      ()     => req("/api/wipe/methods"),
  startWipe:    (body) => req("/api/wipe/start",           { method: "POST", body: JSON.stringify(body) }),
  wipeStatus:   (id)   => req(`/api/wipe/status/${id}`),
  jobs:         ()     => req("/api/jobs"),
  genCert:      (body) => req("/api/certificate/generate", { method: "POST", body: JSON.stringify(body) }),
  certsList:    ()     => req("/api/certificates"),
  certDownload: (id)   => `${BASE}/api/certificate/download/${id}`,
};
