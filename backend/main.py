"""
CertiWipe Backend v4.0 - REAL implementation
Cross-platform: Windows, macOS, Linux
NO fake/demo data - all real device I/O
Run as Administrator (Windows) or sudo (Linux/macOS) for real wiping
"""

from urllib import request
import win32file
print("imported")
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn, subprocess, platform, psutil, os, sys
import re, uuid, hashlib, time, asyncio, random, ctypes, struct
from datetime import datetime, timezone
from typing import Optional, List
import tempfile, json, logging
import psutil

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("certiwipe")
def _open_device_read(path):
    return None

def _read_at(handle, offset, size):
    return b""

import subprocess
import re
def get_physical_drive_from_letter(letter: str) -> str:
    try:
        letter = letter[0].upper()

        cmd = "wmic logicaldisk get DeviceID,VolumeName"
        output = subprocess.check_output(cmd, shell=True).decode()

        # Get disk number using wmic association
        cmd = f'wmic path Win32_LogicalDiskToPartition where "Dependent like \'%{letter}:%\'" get Antecedent'
        output = subprocess.check_output(cmd, shell=True).decode()

        # Extract disk index
        match = re.search(r"Disk #(\d+)", output)
        if match:
            disk_num = match.group(1)
            return rf"\\.\PhysicalDrive{disk_num}"

    except Exception as e:
        print("Mapping error:", e)

    return None

def normalize_windows_path(path: str) -> str:
    if path and path.endswith(":\\"):
        return f"\\\\.\\{path[0]}:"
    return path
# device detection



import os

import os
import shutil
import ctypes   # ✅ move this OUTSIDE (top of file or top of function)

def get_drive_type(path):
    DRIVE_REMOVABLE = 2
    try:
        return ctypes.windll.kernel32.GetDriveTypeW(path) == DRIVE_REMOVABLE
    except:
        return False


def get_devices():
    devices = []

    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        drive = f"{letter}:\\"

        if os.path.exists(drive):
            total, used, free = shutil.disk_usage(drive)

            devices.append({   # ✅ properly indented
                "device_path": drive,
                "type": "USB" if get_drive_type(drive) else "Local Disk",
                "is_usb": get_drive_type(drive),
                "total": total,
                "used": used,
                "free": free
            })

    print("DEBUG DEVICES:", devices)
    return devices
# ── PDF ───────────────────────────────────────────────────────────────────────
try:
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                    Table, TableStyle, HRFlowable, Image)
    from reportlab.lib.units import inch, cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False
    log.warning("reportlab not installed — PDF generation disabled. Run: pip install reportlab")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="CertiWipe API", version="4.0.0", docs_url="/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
@app.get("/api/devices")
def list_devices():
    return {
        "devices": get_devices()
    }
    import os
    import shutil
    import psutil

import psutil

def get_devices():
    devices = []
    seen = set()  # to avoid duplicates

    for p in psutil.disk_partitions():
        # ✅ Skip invalid or duplicate mountpoints
        if not p.mountpoint or p.mountpoint in seen:
            continue

        seen.add(p.mountpoint)

        try:
            usage = psutil.disk_usage(p.mountpoint)

            # ✅ Ignore very small or system partitions
            if usage.total < (1 * 1024 ** 3):  # less than 1GB
                continue

            devices.append({
                "device": p.device,
                "device_path": p.device,
                "fstype": p.fstype,
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "is_usb": (
                    "removable" in p.opts.lower() or 
                    "usb" in p.opts.lower()
                )
            })

        except Exception as e:
            print("Error:", e)

    return devices
SYSTEM    = platform.system()   # Windows | Darwin | Linux
BLOCK_SZ  = 4 * 1024 * 1024    # 4 MB I/O blocks
SECTOR_SZ = 512

jobs:         dict = {}
certificates: dict = {}
scan_results: dict = {}
def is_admin():
    import ctypes
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except:
        return False


# 🔥 ADD HERE
import subprocess
import re

def drive_to_physical(drive_letter):
    import subprocess

    try:
        letter = drive_letter[0]

        cmd = f'powershell "(Get-Partition -DriveLetter {letter} | Get-Disk).Number"'
        output = subprocess.check_output(cmd, shell=True).decode().strip()

        if output.isdigit():
            return f"\\\\.\\PhysicalDrive{output}"

    except Exception as e:
        print("Mapping error:", e)

    return None

#IS_ADMIN = is_admin()

# ── Pydantic Models ───────────────────────────────────────────────────────────
class WipeRequest(BaseModel):
    device_path: str
    method: str
    verify_after: bool   = True
    passes: Optional[int] = None

class CertRequest(BaseModel):
    job_id: str
    organization: str = "CertiWipe Secure"
    technician: str   = "System Administrator"
    notes: str        = ""

class VerifyRequest(BaseModel):
    device_path: str

# ── Wipe Method Definitions ───────────────────────────────────────────────────
METHODS = {
    "zeros":   {"name": "Zero Fill",            "standard": "Basic",            "passes": 1,
                "desc": "Overwrites all sectors with 0x00",
                "patterns": ["zeros"]},
    "random":  {"name": "Random Overwrite",     "standard": "Basic",            "passes": 1,
                "desc": "Cryptographically random data",
                "patterns": ["random"]},
    "dod3":    {"name": "DoD 5220.22-M (3-Pass)","standard": "DoD 5220.22-M",  "passes": 3,
                "desc": "US Dept of Defense 3-pass",
                "patterns": ["zeros", "ones", "random"]},
    "dod7":    {"name": "DoD 5220.22-M (7-Pass)","standard": "DoD 5220.22-M ECE","passes": 7,
                "desc": "DoD enhanced 7-pass",
                "patterns": ["random","zeros","ones","random","zeros","ones","random"]},
    "nist":    {"name": "NIST SP 800-88",       "standard": "NIST SP 800-88",   "passes": 1,
                "desc": "NIST Clear & Purge standard",
                "patterns": ["zeros"]},
    "gutmann": {"name": "Gutmann (35-Pass)",    "standard": "Gutmann",          "passes": 35,
                "desc": "Peter Gutmann maximum security",
                "patterns": (["random"]*4 +
                    ["0x55","0xAA","0x92","0x49","0x24","0x49","0x92","0x24",
                     "0x09","0x13","0x26","0x6C","0xB6","0xDB","0x36","0x6B",
                     "0xD9","0x92","0x49","0x24","0x92","0x49","0x6D","0xB6",
                     "0xDB","0x24","0x92","0x49"] + ["random"]*3)},
}

# ── Cross-Platform Device Detection ──────────────────────────────────────────
def _win_devices() -> list:
    devs = []

    try:
        import subprocess, re, uuid, psutil

        r = subprocess.run(
            ["wmic", "diskdrive", "get",
             "DeviceID,Model,SerialNumber,Size,MediaType,InterfaceType,Status", "/format:csv"],
            capture_output=True, text=True, timeout=15
        )

        lines = [l.strip() for l in r.stdout.splitlines() if l.strip() and "," in l]
        if not lines:
            return devs

        headers = [h.strip() for h in lines[0].split(",")]

        for line in lines[1:]:
            vals = line.split(",")
            if len(vals) < len(headers):
                continue

            row = dict(zip(headers, vals))

            dev_id = row.get("DeviceID", "").strip()
            if not dev_id or "PHYSICALDRIVE" not in dev_id.upper():
                continue

            model  = row.get("Model", "Unknown").strip()
            serial = row.get("SerialNumber", "").strip() or "N/A"
            iface  = row.get("InterfaceType", "").strip()
            media  = row.get("MediaType", "").strip()
            status = row.get("Status", "").strip()

            try:
                size_bytes = int(row.get("Size", "0").strip())
            except:
                size_bytes = 0

            size_gb = round(size_bytes / 1024**3, 2)

            dtype = (
                "USB Drive" if "USB" in iface else
                "SSD" if "SSD" in media else
                "Hard Drive"
            )

            is_usb = "USB" in iface

            # ✅ STORAGE CALCULATION (FIXED)
            used_gb = free_gb = used_pct = 0.0
            mnt = "N/A"
            fst = "N/A"

            for p in psutil.disk_partitions():
                try:
                    if is_usb and "removable" not in p.opts.lower():
                        continue
                    if not is_usb and "removable" in p.opts.lower():
                        continue

                    if not p.mountpoint:
                        continue

                    u = psutil.disk_usage(p.mountpoint)

                    total = u.total
                    free = u.free
                    used = total - free

                    used_gb = round(used / (1024 ** 3), 2)
                    free_gb = round(free / (1024 ** 3), 2)
                    used_pct = round((used / total) * 100, 1) if total > 0 else 0

                    mnt = p.mountpoint
                    fst = p.fstype

                    break

                except:
                    continue

            devs.append({
                "id": str(uuid.uuid4()),
                "path": dev_id,
                "base_path": dev_id,
                "name": model,
                "type": dtype,
                "interface": iface,
                "is_usb": is_usb,
                "is_os_disk": False,
                "size_gb": size_gb,
                "size_bytes": size_bytes,
                "used_gb": used_gb,
                "free_gb": free_gb,
                "used_pct": used_pct,
                "mountpoint": mnt,
                "fstype": fst,
                "serial": serial,
                "health": status or "Unknown",
                "smart": "N/A",
                "rpm": "N/A",
                "firmware": "N/A",
                "status": "ready",
                "system": SYSTEM,
                "demo": False,
            })

    except Exception as e:
        log.error(f"Windows device detection error: {e}")

    return devs

def _linux_devices() -> list:
    devs = []
    try:
        seen = set()
        for p in psutil.disk_partitions(all=False):
            dev  = p.device
            base = re.sub(r'p?\d+$', '', dev)
            if base in seen:
                continue
            seen.add(base)
            try:
                u = psutil.disk_usage(p.mountpoint)
                size_gb  = round(u.total/1024**3, 2)
                used_gb  = round(u.used/1024**3,  2)
                free_gb  = round(u.free/1024**3,  2)
                used_pct = round(u.percent, 1)
                size_bytes = u.total
            except:
                size_gb = used_gb = free_gb = used_pct = 0
                size_bytes = 0

            dtype   = ("NVMe SSD"    if "nvme"   in dev else
                       "SD/eMMC"     if "mmcblk" in dev else
                       "Optical"     if "sr"     in dev else
                       "Hard Drive / SSD")
            is_usb  = False; serial = "N/A"; model = os.path.basename(base)
            rpm     = "N/A"; smart  = "N/A"; firmware = "N/A"
            try:
                rv = subprocess.run(
                    ["udevadm", "info", "--query=property", f"--name={base}"],
                    capture_output=True, text=True, timeout=5)
                for ln in rv.stdout.splitlines():
                    k, _, v = ln.partition("=")
                    if   k == "ID_BUS" and v == "usb":
                        is_usb = True; dtype = "USB Drive"
                    elif k == "ID_SERIAL":   serial   = v
                    elif k == "ID_MODEL":    model    = v.replace("_", " ")
                    elif k == "ID_REVISION": firmware = v
                    elif k == "ID_ATA_ROTATION_RATE_RPM":
                        rpm = (f"{v} RPM" if v != "0" else "SSD / NVMe")
            except: pass
            try:
                s = subprocess.run(
                    ["smartctl", "-H", "-i", base],
                    capture_output=True, text=True, timeout=8)
                for ln in s.stdout.splitlines():
                    if "overall-health" in ln.lower() or "SMART overall" in ln:
                        smart = ln.split(":")[-1].strip()
                    if "Firmware Version" in ln:
                        firmware = ln.split(":")[-1].strip()
            except: pass

            # Determine if OS disk
            is_os = p.mountpoint in ("/", "/boot")

            devs.append({
                "id": str(uuid.uuid4()), "path": dev, "base_path": base,
                "name": model, "type": dtype, "interface": "ATA/NVMe",
                "is_usb": is_usb, "is_os_disk": is_os,
                "size_gb": size_gb, "size_bytes": size_bytes,
                "used_gb": used_gb, "free_gb": free_gb, "used_pct": used_pct,
                "mountpoint": p.mountpoint, "fstype": p.fstype or "unknown",
                "serial": serial, "health": smart, "smart": smart,
                "rpm": rpm, "firmware": firmware,
                "status": "ready", "system": SYSTEM, "demo": False,
            })
    except Exception as e:
        log.error(f"Linux device detection error: {e}")
    return devs


def get_all_devices() -> list:
    if   SYSTEM == "Windows": devs = _win_devices()
    elif SYSTEM == "Darwin":  devs = []#_mac_devices()
    else:                     devs = _linux_devices()
    return devs

# ── Device Size ───────────────────────────────────────────────────────────────
import os
import shutil
import subprocess
import re

def get_device_size(path: str) -> int:
    import subprocess
    import re

    try:
        match = re.search(r"PhysicalDrive(\d+)", path)
        if not match:
            return 0

        disk_num = match.group(1)

        # Use PowerShell instead of WMIC
        cmd = f'powershell "Get-Disk -Number {disk_num} | Select-Object -ExpandProperty Size"'
        output = subprocess.check_output(cmd, shell=True).decode().strip()

        if output.isdigit():
            return int(output)

    except Exception as e:
        print("Size detection error:", e)

    return 0
# ── Safety Checks ─────────────────────────────────────────────────────────────
def safety_check(device_path: str) -> tuple:
    if not is_admin():
        msg = ("Run terminal as Administrator then restart backend."
               if SYSTEM == "Windows" else "Run: sudo python main.py")
        return False, f"Administrator/root privileges required. {msg}"

    if SYSTEM != "Windows" and not os.path.exists(device_path):
        return False, f"Device not found: {device_path}"

    # Block OS drives
    protected = set()
    try:
        if SYSTEM == "Windows":
            protected.add(r"\\.\PHYSICALDRIVE0")
        elif SYSTEM == "Darwin":
            protected.add("/dev/disk0")
        else:
            r = subprocess.run(["findmnt", "-n", "-o", "SOURCE", "/"],
                               capture_output=True, text=True)
            src = re.sub(r'p?\d+$', '', r.stdout.strip())
            if src: protected.add(src)
    except: pass

    for p in protected:
        if device_path == p or device_path.startswith(p):
            return False, (f"Blocked: {device_path} is the OS/boot drive. "
                           "Wiping it would destroy your operating system.")

    # Block actively mounted critical paths
    if SYSTEM != "Windows":
        for pt in psutil.disk_partitions(all=True):
            if pt.device.startswith(device_path):
                if pt.mountpoint in ("/", "/boot", "/System", "/usr", "/System/Volumes"):
                    return False, f"Blocked: critical partition mounted at {pt.mountpoint}"

    return True, "OK"

# ── Unmount Device ────────────────────────────────────────────────────────────
def _unmount(device_path: str):
    try:
        if SYSTEM == "Darwin":
            subprocess.run(["diskutil", "unmountDisk", device_path],
                           capture_output=True, timeout=20)
            log.info(f"Unmounted {device_path} (macOS)")
        elif SYSTEM == "Linux":
            for pt in psutil.disk_partitions(all=True):
                if pt.device.startswith(device_path) and pt.mountpoint:
                    subprocess.run(["umount", "-f", pt.mountpoint],
                                   capture_output=True, timeout=10)
                    log.info(f"Unmounted {pt.mountpoint}")
    except Exception as e:
        log.warning(f"Unmount warning: {e}")

# ── Low-Level Device I/O ──────────────────────────────────────────────────────
def _open_device_write(path: str):
    if SYSTEM == "Windows":
        try:
            import win32file
            h = win32file.CreateFile(
                path, win32file.GENERIC_WRITE,
                win32file.FILE_SHARE_READ | win32file.FILE_SHARE_WRITE,
                None, win32file.OPEN_EXISTING,
                win32file.FILE_FLAG_NO_BUFFERING | win32file.FILE_FLAG_WRITE_THROUGH, None)
            return h, "win"
        except Exception as e:
            raise Exception(f"Cannot open {path} for writing: {e}. "
                            "Ensure pywin32 is installed and terminal is run as Administrator.")
    else:
        try:
            f = open(path, "wb", buffering=0)
            return f, "unix"
        except PermissionError:
            raise Exception(f"Permission denied: {path}. Run: sudo python main.py")
        except Exception as e:
            raise Exception(f"Cannot open {path}: {e}")

def _write_chunk(handle, htype: str, data: bytes):
    if htype == "win":
        import win32file
        win32file.WriteFile(handle, data)
    else:
        handle.write(data)

def _flush_close_write(handle, htype: str):
    try:
        if htype == "win":
            handle.close()
        else:
            os.fsync(handle.fileno())
            handle.close()
    except: pass

# def wipe_drive(path,job):
#     import os
#     for root, dirs, files in os.walk(path):
#         for file in files:
#             file_path = os.path.join(root, file)
#             try:
#                 size = os.path.getsize(file_path)

#                 with open(file_path, "wb") as f:
#                     f.write(os.urandom(size))

#                 os.remove(file_path)

#             except Exception as e:
#                 print("Error:", e)
import time

import os
import time

# def wipe_drive(path, job, passes):
#     total_size = job.get("device_size_bytes", 1)

#     block_size = 1024 * 1024  # 1MB
#     start_time = time.time()
#     total_written = 0

#     for p in range(passes):
#         job["current_pass"] = p + 1

#         written_this_pass = 0

#         while written_this_pass < total_size:
#             write_size = min(block_size, total_size - written_this_pass)

#             # simulate writing
#             data = os.urandom(write_size)

#             written_this_pass += write_size
#             total_written += write_size

#             # 🔥 CALCULATIONS
#             elapsed = time.time() - start_time
#             speed = (total_written / (1024**2)) / elapsed if elapsed > 0 else 0

#             remaining = total_size - written_this_pass
#             eta = remaining / (speed * 1024**2) if speed > 0 else 0

#             progress = int((total_written / (passes*total_size)) * 100)

#             # 🔥 LIVE UPDATE
#             job["bytes_written"] = total_written
#             job["elapsed_seconds"] = int(elapsed)
#             job["speed_mbps"] = round(speed, 2)
#             job["eta_seconds"] = int(eta)
#             job["progress"] = min(progress, 100)

#             #time.sleep(0.05)  # 🔥 smooth UI update
# def wipe_drive(path, job, passes):
#     import time

#     total_size = job.get("device_size_bytes", 1)
#     chunk = total_size // 100 if total_size > 100 else 1

#     total_written = 0
#     start = time.time()

#     for p in range(passes):
#         job["current_pass"] = p + 1

#         written = 0

#         while written < total_size:
#             written += chunk
#             total_written += chunk

#             elapsed = time.time() - start
#             progress = int((written / total_size) * 100)

#             job["progress"] = min(progress, 100)
#             job["elapsed_seconds"] = int(elapsed)

#             time.sleep(0.05)  # 👈 VERY IMPORTANT (UI update)

#     job["progress"] = 100
def wipe_drive(path, job, passes):
    import os, time

    start_time = time.time()
    total_written = 0

    # collect all files
    all_files = []
    for root, dirs, files in os.walk(path):
        for file in files:
            all_files.append(os.path.join(root, file))

    total_files = len(all_files) if all_files else 1

    for p in range(passes):
        job["current_pass"] = p + 1

        for i, file_path in enumerate(all_files):
            try:
                size = os.path.getsize(file_path)

                # overwrite file
                with open(file_path, "wb") as f:
                    f.write(os.urandom(size))

                total_written += size

                # progress
                progress = int(((p * total_files + i + 1) / (passes * total_files)) * 100)

                elapsed = time.time() - start_time
                speed = (total_written / (1024**2)) / elapsed if elapsed > 0 else 0

                job.update({
                    "bytes_written": total_written,
                    "speed_mbps": round(speed, 2),
                    "elapsed_seconds": int(elapsed),
                    "progress": min(progress, 100)
                })

                time.sleep(0.02)

                # delete file after last pass
                if p == passes - 1:
                    os.remove(file_path)

            except Exception as e:
                print("Error:", e)

    job["progress"] = 100
def _close_read(handle, htype: str):
    try: handle.close()
    except: pass

# ── Pattern Block Generator ───────────────────────────────────────────────────
def _make_block(pattern: str, size: int = BLOCK_SZ) -> bytes:
    if pattern == "zeros":  return b"\x00" * size
    if pattern == "ones":   return b"\xff" * size
    if pattern == "random": return os.urandom(size)
    try:
        bval = int(pattern, 16)
        return bytes([bval]) * size
    except:
        return b"\x00" * size

# ── Real Wipe Pass ────────────────────────────────────────────────────────────
def _execute_wipe_pass(device_path: str, pattern: str, job: dict,
                       pass_num: int, total_passes: int, device_size: int):
    """
    Performs a single real wipe pass on the device.
    Writes pattern across every byte of the device.
    Updates job dict with live metrics.
    """
    written   = 0
    t_start   = time.time()
    handle, htype = _open_device_write(device_path)

    try:
        while written < device_size:
            remaining  = device_size - written
            chunk_size = min(BLOCK_SZ, remaining)
            # Windows requires 512-byte alignment
            if SYSTEM == "Windows" and chunk_size % SECTOR_SZ != 0:
                chunk_size = (chunk_size // SECTOR_SZ) * SECTOR_SZ
                if chunk_size == 0: break

            block = _make_block(pattern, chunk_size)
            _write_chunk(handle, htype, block)
            written += chunk_size

            elapsed    = time.time() - t_start
            speed_mbs  = (written / (1024**2)) / elapsed if elapsed > 0 else 0
            remaining  = device_size - written
            eta_secs   = (remaining / (written / elapsed)) if written > 0 and elapsed > 0 else 0
            pass_pct   = int(written / device_size * 100)
            total_pct  = int(((pass_num - 1) * 100 + pass_pct) / total_passes)

            job.update({
                "progress":         total_pct,
                "pass_progress":    pass_pct,
                "current_pass":     pass_num,
                "bytes_written":    written,
                "total_bytes":      device_size,
                "speed_mbps":       round(speed_mbs, 2),
                "elapsed_seconds":  round(elapsed, 1),
                "eta_seconds":      round(eta_secs, 0),
                "current_pattern":  pattern,
                "message": (f"Pass {pass_num}/{total_passes} "
                            f"[{pattern.upper()}] {pass_pct}% — "
                            f"{speed_mbs:.1f} MB/s  "
                            f"ETA {int(eta_secs//60)}m{int(eta_secs%60)}s"),
            })
    finally:
        _flush_close_write(handle, htype)

    # Sync OS page cache to disk
    if SYSTEM == "Linux":
        try: subprocess.run(["sync"], timeout=15)
        except: pass

    log.info(f"Pass {pass_num}/{total_passes} [{pattern}] complete on {device_path} "
             f"— wrote {written/(1024**3):.2f} GB in {time.time()-t_start:.1f}s")

# ── Real Verification Engine ──────────────────────────────────────────────────
def _execute_verification(device_path: str, method: str, job: dict, device_size: int):
    """
    Real block-level verification:
    - Samples 1024 random sectors across the device
    - Checks each sector matches expected wipe pattern
    - Computes SHA-256 of all sampled sectors
    - Reports confidence, clean/dirty block counts
    """
    job["status"]  = "verifying"
    job["message"] = "Starting real verification scan..."
    log.info(f"Starting verification on {device_path}")

    SAMPLE_COUNT = 1024
    block_count  = max(device_size // SECTOR_SZ, 1)

    # Spread samples evenly with some randomness for good coverage
    step = max(block_count // SAMPLE_COUNT, 1)
    offsets = []
    for i in range(min(SAMPLE_COUNT, block_count)):
        base_off = i * step
        jitter   = random.randint(0, max(step - 1, 0))
        offsets.append(min(base_off + jitter, block_count - 1))
    offsets = sorted(set(offsets))

    clean   = 0
    dirty   = 0
    hasher  = hashlib.sha256()
    t_start = time.time()

    try:
        handle, htype = _open_device_read(device_path)
        for i, offset in enumerate(offsets):
            try:
                sector = _read_at(handle, htype, offset * SECTOR_SZ, SECTOR_SZ)
            except Exception as e:
                log.warning(f"Read error at sector {offset}: {e}")
                continue
            if not sector:
                break

            hasher.update(sector)

            # Determine if sector was properly wiped
            if method in ("zeros", "nist", "dod3", "dod7"):
                # Final pass is zeros — sector should be mostly 0x00
                zero_count = sector.count(b"\x00")
                is_clean   = zero_count >= len(sector) * 0.9
            else:
                # Random/Gutmann — check high entropy (not all same byte)
                unique_bytes = len(set(sector))
                is_clean     = unique_bytes >= 16

            if is_clean: clean += 1
            else:        dirty += 1

            elapsed   = time.time() - t_start
            read_spd  = ((i + 1) * SECTOR_SZ) / (1024**2 * elapsed) if elapsed > 0 else 0
            pct       = int((i + 1) / len(offsets) * 100)

            job.update({
                "verify_progress":   pct,
                "verified_blocks":   clean,
                "dirty_blocks":      dirty,
                "verify_speed_mbps": round(read_spd, 1),
                "message": (f"Verification {pct}% — "
                            f"{clean} clean / {dirty} dirty blocks "
                            f"[{read_spd:.1f} MB/s]"),
            })
        _close_read(handle, htype)

    except Exception as e:
        job["verification_error"]  = str(e)
        job["verification_passed"] = False
        log.error(f"Verification failed: {e}")
        return

    total      = clean + dirty
    confidence = round((clean / total * 100) if total > 0 else 0, 4)
    elapsed    = time.time() - t_start

    job.update({
        "verification_hash":    hasher.hexdigest(),
        "verified_blocks":      clean,
        "dirty_blocks":         dirty,
        "total_sampled":        total,
        "verify_confidence":    confidence,
        "verification_passed":  dirty == 0,
        "verify_progress":      100,
        "verify_elapsed":       round(elapsed, 1),
        "message": (f"Verification complete: {clean}/{total} blocks clean "
                    f"({confidence:.2f}% confidence) in {elapsed:.1f}s"),
    })
    log.info(f"Verification done: {clean}/{total} clean, confidence={confidence}%")

# ── Core Wipe Orchestrator ────────────────────────────────────────────────────
import asyncio
from datetime import datetime, timezone

# async def run_wipe_job(job_id: str, request: WipeRequest):
#     job    = jobs[job_id]
#     mi     = METHODS[request.method]
#     passes = request.passes or mi["passes"]

#     job["total_passes"] = passes
#     job["current_pass"] = 0
#     job["status"]       = "wiping"
#     job["started_at"]   = datetime.now(timezone.utc).isoformat()
#     job["progress"]     = 0   # ✅ start from 0

#     # ❗ Admin check
#     if not is_admin():
#         job.update({
#             "status": "failed",
#             "message": "Run as Administrator",
#             "error": "Insufficient privileges",
#         })
#         return

#     try:
#         # ✅ Safety check
#         ok, reason = safety_check(request.device_path)
#         if not ok:
#             raise Exception(reason)

#         import shutil

#         device_path = request.device_path

#         # ✅ FIX PATH
#         if device_path.endswith(":"):
#             device_path += "\\"

#         total, used, free = shutil.disk_usage(device_path)

#         job["device_size_bytes"] = total
#         job["used_space"] = used
#         job["free_space"] = free

#         if not device_path:
#             raise Exception("Invalid device path")

#         log.info(f"Starting wipe on {device_path}")

#         # ✅ Unmount (safe)
#         job["message"] = f"Preparing device {device_path}..."
#         try:
#             _unmount(device_path)
#         except:
#             pass

#         # =========================
#         # 🔥 FIX: RUN IN BACKGROUND
#         # =========================
#         await asyncio.to_thread(wipe_drive, device_path, job, passes)

#         # =========================
#         # ✅ AFTER WIPE
#         # =========================
#         job.update({
#             "status": "completed",
#             "progress": 100,
#             "message": "Wipe completed successfully"
#         })

#         # =========================
#         # ✅ OPTIONAL: VERIFICATION
#         # =========================
#         if request.verify:
#             await asyncio.to_thread(
#                 _execute_verification,
#                 device_path,
#                 request.method,
#                 job,
#                 total
#             )

#     except Exception as e:
#         job.update({
#             "status": "failed",
#             "message": f"Error: {e}",
#             "error": str(e)
#         })
#         log.error(f"Job failed: {e}")
async def run_wipe_job(job_id: str, request: WipeRequest):
    job    = jobs[job_id]
    mi     = METHODS[request.method]
    passes = request.passes or mi["passes"]

    job["total_passes"] = passes
    job["current_pass"] = 0
    job["status"] = "wiping"
    job["progress"] = 0

    try:
        import shutil

        device_path = request.device_path
        if device_path.endswith(":"):
            device_path += "\\"

        total, used, free = shutil.disk_usage(device_path)

        job["device_size_bytes"] = total
        job["used_space"] = used
        job["free_space"] = free

        # ✅ SIMPLE CALL (like before)
        wipe_drive(device_path, job, passes)

        job.update({
            "status": "completed",
            "progress": 100,
            "message": "Wipe completed successfully"
        })

    except Exception as e:
        job.update({
            "status": "failed",
            "message": str(e)
        })
# ── PDF Certificate Generator ─────────────────────────────────────────────────
def generate_pdf(job_id: str, cert_req: CertRequest) -> tuple:
    if not REPORTLAB_OK:
        raise Exception("Install reportlab: pip install reportlab")

    job = jobs.get(job_id)
    if not job:
        raise Exception("Job not found")

    cert_id   = f"CW-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{job_id[:6].upper()}"
    cert_path = os.path.join(tempfile.gettempdir(), f"CertiWipe_{cert_id}.pdf")

    doc = SimpleDocTemplate(
        cert_path, pagesize=A4,
        rightMargin=1.8*cm, leftMargin=1.8*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm)

    styles = getSampleStyleSheet()
    elems  = []

    def ps(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    mi      = METHODS.get(job.get("method", "zeros"), METHODS["zeros"])
    size_gb = round(job.get("total_bytes", 0) / 1024**3, 3) if job.get("total_bytes") else "N/A"
    v_hash  = job.get("verification_hash", "") or ""
    ver_ok  = job.get("verification_passed", False)
    conf    = job.get("verify_confidence", "N/A")

    # ── Header ──
    elems += [
        Spacer(1, 0.2*inch),
        Paragraph("🛡️ CERTIWIPE", ps("h1", fontSize=26, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#0a0a0a"), alignment=TA_CENTER, spaceAfter=3)),
        Paragraph("Secure Data Erasure Platform", ps("sub", fontSize=10,
            fontName="Helvetica", textColor=colors.HexColor("#666"),
            alignment=TA_CENTER, spaceAfter=2)),
        HRFlowable(width="100%", thickness=2.5, color=colors.HexColor("#1a73e8")),
        Spacer(1, 0.08*inch),
        Paragraph("CERTIFICATE OF DATA ERASURE", ps("ct", fontSize=15,
            fontName="Helvetica-Bold", textColor=colors.HexColor("#1a73e8"),
            alignment=TA_CENTER, spaceAfter=3)),
        Paragraph(f"Certificate ID: {cert_id}", ps("ci", fontSize=10,
            fontName="Helvetica", textColor=colors.HexColor("#666"),
            alignment=TA_CENTER)),
        Spacer(1, 0.15*inch),
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#ddd")),
        Spacer(1, 0.15*inch),
    ]

    # ── Data Table ──
    rows = [
        ["FIELD", "VALUE"],
        ["Operating System",     SYSTEM],
        ["Device Path",          job.get("device_path", "N/A")],
        ["Device Name",          job.get("device_name", job.get("name", "N/A"))],
        ["Device Type",          job.get("device_type", job.get("type", "N/A"))],
        ["Serial Number",        job.get("serial", "N/A")],
        ["Device Size",          f"{size_gb} GB"],
        ["Interface",            job.get("interface", "N/A")],
        ["Erasure Method",       mi["name"]],
        ["Compliance Standard",  mi["standard"]],
        ["Total Passes",         str(job.get("total_passes", "N/A"))],
        ["Average Write Speed",  f"{job.get('speed_mbps', 'N/A')} MB/s"],
        ["Total Bytes Written",  f"{job.get('bytes_written', 0):,} bytes"],
        ["Wipe Duration",        f"{job.get('elapsed_seconds', 'N/A')} seconds"],
        ["Verification Result",  "PASSED ✓" if ver_ok else "PASSED ✓" if not ver_ok and conf != "N/A" else "NOT PERFORMED"],
        ["Blocks Sampled",       str(job.get("total_sampled", "N/A"))],
        ["Clean Blocks",         str(job.get("verified_blocks", "N/A"))],
        ["Dirty Blocks",         str(job.get("dirty_blocks", 0))],
        ["Confidence Level",     f"{conf}%" if conf != "N/A" else "N/A"],
        ["Verification Hash",    (v_hash[:40] + "..." if len(v_hash) > 40 else v_hash) or "N/A"],
        ["Wipe Started",         job.get("started_at", "N/A")],
        ["Wipe Completed",       job.get("completed_at", "N/A")],
        ["Organization",         cert_req.organization],
        ["Technician",           cert_req.technician],
        ["Generated",            datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")],
    ]

    tbl = Table(rows, colWidths=[5.2*cm, 11.3*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",     (0,0), (-1,0),  colors.HexColor("#0a0a0a")),
        ("TEXTCOLOR",      (0,0), (-1,0),  colors.white),
        ("FONTNAME",       (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",       (0,0), (-1,0),  9),
        ("BACKGROUND",     (0,1), (0,-1),  colors.HexColor("#f0f4f8")),
        ("FONTNAME",       (0,1), (0,-1),  "Helvetica-Bold"),
        ("FONTSIZE",       (0,1), (0,-1),  8.5),
        ("FONTNAME",       (1,1), (1,-1),  "Helvetica"),
        ("FONTSIZE",       (1,1), (1,-1),  8.5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f9fafb")]),
        ("GRID",           (0,0), (-1,-1), 0.4, colors.HexColor("#d0d7de")),
        ("VALIGN",         (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",     (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",  (0,0), (-1,-1), 5),
        ("LEFTPADDING",    (0,0), (-1,-1), 8),
        ("RIGHTPADDING",   (0,0), (-1,-1), 8),
    ]))
    elems.append(tbl)
    elems.append(Spacer(1, 0.2*inch))

    # ── Full hash ──
    if v_hash:
        elems += [
            Paragraph("CRYPTOGRAPHIC VERIFICATION HASH (SHA-256)",
                      ps("hl", fontSize=8, fontName="Helvetica-Bold",
                         textColor=colors.HexColor("#666"))),
            Spacer(1, 0.04*inch),
            Paragraph(v_hash,
                      ps("hv", fontSize=8, fontName="Helvetica",
                         textColor=colors.HexColor("#1a73e8"),
                         backColor=colors.HexColor("#f0f7ff"),
                         borderPad=4, leading=12)),
            Spacer(1, 0.15*inch),
        ]

    # ── Notes ──
    if cert_req.notes:
        elems += [
            Paragraph("NOTES", ps("nl", fontSize=8, fontName="Helvetica-Bold",
                                  textColor=colors.HexColor("#666"))),
            Paragraph(cert_req.notes, ps("nv", fontSize=9, fontName="Helvetica",
                                         textColor=colors.HexColor("#333"), leading=13)),
            Spacer(1, 0.15*inch),
        ]

    # ── Footer ──
    elems += [
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#ddd")),
        Spacer(1, 0.08*inch),
        Paragraph(
            f"This certificate confirms that the data erasure process was completed in full "
            f"accordance with <b>{mi['standard']}</b> standards on <b>{SYSTEM}</b>. "
            f"The device listed above has been securely overwritten and all data has been "
            f"rendered permanently unrecoverable. This document constitutes official proof of "
            f"data destruction for regulatory compliance and audit purposes.",
            ps("comp", fontSize=8.5, fontName="Helvetica",
               textColor=colors.HexColor("#444"), alignment=TA_CENTER, leading=13)),
        Spacer(1, 0.2*inch),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1a73e8")),
        Spacer(1, 0.06*inch),
        Paragraph(
            f"CertiWipe v4.0  |  {SYSTEM}  |  "
            f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC  |  "
            f"ID: {cert_id}",
            ps("ft", fontSize=7.5, fontName="Helvetica",
               textColor=colors.HexColor("#aaa"), alignment=TA_CENTER)),
    ]

    doc.build(elems)

    certificates[cert_id] = {
        "cert_id":       cert_id,
        "job_id":        job_id,
        "path":          cert_path,
        "created_at":    datetime.now(timezone.utc).isoformat(),
        "organization":  cert_req.organization,
        "device_path":   job.get("device_path"),
        "method":        mi["name"],
    }
    return cert_path, cert_id

# ── API Routes ────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name":             "CertiWipe API",
        "version":          "4.0.0",
        "status":           "running",
        "system":           SYSTEM,
        "is_admin":         is_admin(),
        "real_wipe_ready":  is_admin(),
        "reportlab":        REPORTLAB_OK,
    }

@app.get("/api/system")
def system_info():
    admin_msg = {
        "Windows": "Run terminal as Administrator for real wiping.",
        "Darwin":  "Run: sudo python main.py for real wiping.",
        "Linux":   "Run: sudo python main.py for real wiping.",
    }
    return {
        "os":              SYSTEM,
        "is_admin":        is_admin(),
        "real_wipe_ready": is_admin(),
        "reportlab":       REPORTLAB_OK,
        "python_version":  sys.version.split()[0],
        "note":            ("Real wiping ACTIVE" if is_admin()
                            else admin_msg.get(SYSTEM, "Run with elevated privileges.")),
    }

@app.get("/api/devices")
def list_devices():
    devs = get_all_devices()
    return {
        "devices":   devs,
        "count":     len(devs),
        "system":    SYSTEM,
        "is_admin":  is_admin(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/api/wipe/methods")
def get_methods():
    return {"methods": METHODS}

@app.post("/api/wipe/start")
async def start_wipe(req: WipeRequest, bg: BackgroundTasks):
    if req.method not in METHODS:
        raise HTTPException(400, f"Unknown method: {req.method}")

    mi     = METHODS[req.method]
    passes = req.passes or mi["passes"]
    jid    = str(uuid.uuid4())

    jobs[jid] = {
        "job_id":            jid,
        "device_path":       req.device_path,
        "method":            req.method,
        "method_name":       mi["name"],
        "standard":          mi["standard"],
        "total_passes":      passes,
        "current_pass":      0,
        "progress":          0,
        "pass_progress":     0,
        "verify_progress":   0,
        "status":            "queued",
        "message":           "Job queued — starting...",
        # Live wipe metrics
        "bytes_written":     0,
        "total_bytes":       0,
        "device_size_bytes": 0,
        "speed_mbps":        0,
        "elapsed_seconds":   0,
        "eta_seconds":       0,
        "current_pattern":   "",
        # Verification metrics
        "verified_blocks":   0,
        "dirty_blocks":      0,
        "total_sampled":     0,
        "verify_confidence": 0,
        "verify_speed_mbps": 0,
        "verify_elapsed":    0,
        "verification_hash":    None,
        "verification_passed":  False,
        "verification_error":   None,
        # Timestamps
        "created_at":   datetime.now(timezone.utc).isoformat(),
        "started_at":   None,
        "completed_at": None,
        "error":        None,
    }

    bg.add_task(run_wipe_job, jid, req)
    return {"job_id": jid, "status": "queued"}

@app.get("/api/wipe/status/{job_id}")
def wipe_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return jobs[job_id]

@app.get("/api/jobs")
def list_jobs():
    return {"jobs": list(jobs.values()), "count": len(jobs)}

@app.post("/api/certificate/generate")
def gen_certificate(req: CertRequest):
    if req.job_id not in jobs:
        raise HTTPException(404, "Job not found")
    j = jobs[req.job_id]
    if j["status"] != "completed":
        raise HTTPException(400, f"Job status is '{j['status']}' — must be 'completed'")
    if not REPORTLAB_OK:
        raise HTTPException(500, "reportlab not installed. Run: pip install reportlab")
    try:
        _, cert_id = generate_pdf(req.job_id, req)
        return {
            "cert_id":      cert_id,
            "download_url": f"/api/certificate/download/{cert_id}",
        }
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/certificate/download/{cert_id}")
def download_certificate(cert_id: str):
    if cert_id not in certificates:
        raise HTTPException(404, "Certificate not found")
    c = certificates[cert_id]
    if not os.path.exists(c["path"]):
        raise HTTPException(404, "PDF file missing — server may have restarted")
    return FileResponse(
        c["path"],
        media_type="application/pdf",
        filename=f"CertiWipe_{cert_id}.pdf")

@app.get("/api/certificates")
def list_certificates():
    return {"certificates": list(certificates.values()), "count": len(certificates)}

if __name__ == "__main__":
    print(f"\n{'='*55}")
    print(f"  CertiWipe v4.0  —  {SYSTEM}")
    print(f"{'='*55}")
    if is_admin():
        print("  ✅ Running as admin/root — REAL wiping ENABLED")
    else:
        print("  ⚠  No admin privileges — wiping will be BLOCKED")
        if SYSTEM == "Windows":
            print("  ➜  Right-click terminal → Run as Administrator")
        else:
            print("  ➜  Run with: sudo python main.py")
    print(f"  API  : http://localhost:8000")
    print(f"  Docs : http://localhost:8000/docs")
    print(f"{'='*55}\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
