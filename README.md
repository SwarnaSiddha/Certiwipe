# 🛡️ CertiWipe v4.0 — Real-Time Secure Data Erasure

**No demo data. No simulation. 100% real device I/O.**

---

## Project Structure

```
certiwipe_v4/
├── backend/
│   ├── main.py              ← FastAPI backend (all real I/O)
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api.js
        └── components/
            ├── Dashboard.jsx
            ├── Devices.jsx
            ├── WipeEngine.jsx
            └── Certificates.jsx
```

---

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
```

| OS      | For real wiping (required)                      | Just run (no wiping) |
|---------|-------------------------------------------------|----------------------|
| Windows | Run terminal as **Administrator** → `python main.py` | `python main.py` |
| macOS   | `sudo python main.py`                           | `python main.py` |
| Linux   | `sudo python main.py`                           | `python main.py` |

API starts at: **http://localhost:8000**
Swagger docs:  **http://localhost:8000/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at: **http://localhost:3000**

---

## What Is Real in This Implementation

| Feature | How it works |
|---|---|
| Device Detection | `wmic` (Windows) / `diskutil` (macOS) / `udevadm + psutil` (Linux) — reads actual hardware |
| Device Size | `blockdev --getsize64` / seek-to-end / `diskutil info` — real byte count |
| Wipe Engine | `open(device, "wb")` then writes pattern bytes directly to raw device |
| Write Metrics | Real clock timing, actual bytes written, live MB/s calculated from I/O |
| Verification | Reads 1024 random sectors back from device, checks pattern, computes real SHA-256 |
| Safety Check | Blocks OS/boot drives automatically, checks mounted critical partitions |
| Unmount | `diskutil unmountDisk` (macOS) / `umount` (Linux) before wipe |
| PDF Certificate | ReportLab — real PDF with all real metrics embedded |

---

## Erasure Standards

| Method | Standard | Passes | Pattern |
|---|---|---|---|
| Zero Fill | Basic | 1 | All 0x00 |
| Random Overwrite | Basic | 1 | os.urandom() |
| DoD 5220.22-M | DoD | 3 | zeros, ones, random |
| DoD 5220.22-M ECE | DoD ECE | 7 | extended sequence |
| NIST SP 800-88 | NIST | 1 | zeros |
| Gutmann | Gutmann | 35 | 35 specific patterns |

---

## Safety Mechanisms

The backend refuses to wipe:
- The OS/boot drive (PhysicalDrive0 on Windows, disk0 on macOS, root-mounted drive on Linux)
- Any drive with `/`, `/boot`, `/System`, `/usr` mounted
- Any device that doesn't exist
- Any operation without admin/root privileges

---

## Windows — Extra Step

For real raw device I/O on Windows:
```bash
pip install pywin32
```
Then run terminal as Administrator.

---

## Production Deployment

```bash
# Backend
pip install gunicorn
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Frontend
cd frontend && npm run build
# Serve dist/ with nginx or any static host
```

Update `frontend/src/api.js`:
```js
const BASE = "https://your-api-domain.com";
```
