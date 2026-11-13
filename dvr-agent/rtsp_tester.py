#!/usr/bin/env python3
"""
SafeguardsIQ — RTSP Compatibility Tester v2
=============================================
Run this on any PC connected to the same LAN as the DVR/cameras.
Tests RTSP streams from CP Plus DVRs and Dahua cameras/DVRs.
Supports custom RTSP ports (common with CP Plus on port 8554).

Usage:
  python rtsp_tester.py                                          # Interactive mode
  python rtsp_tester.py --ip 192.168.1.10                        # Quick test a known IP
  python rtsp_tester.py --ip 192.168.1.10 --port 8554            # Custom RTSP port
  python rtsp_tester.py --ip 192.168.1.10 -u admin -p Admin@123  # With credentials
  python rtsp_tester.py --url rtsp://admin:pass@192.168.1.10:8554/cam/realmonitor?channel=1&subtype=0

Requirements:
  pip install opencv-python
"""

import cv2
import sys
import time
import socket
import argparse
import os
from datetime import datetime

# ── DVR/Camera RTSP URL templates ────────────────────────────────────

PROFILES = {
    "dahua": {
        "name": "Dahua / CP Plus (Dahua OEM)",
        "main": "/cam/realmonitor?channel={ch}&subtype=0",
        "sub":  "/cam/realmonitor?channel={ch}&subtype=1",
    },
    "cpplus_v2": {
        "name": "CP Plus (newer firmware)",
        "main": "/ch{ch:02d}/main/av_stream",
        "sub":  "/ch{ch:02d}/sub/av_stream",
    },
    "cpplus_v3": {
        "name": "CP Plus (basic/stream path)",
        "main": "/stream1",
        "sub":  "/stream2",
    },
}

# Common RTSP ports — 8554 is very common on CP Plus DVRs
RTSP_PORTS = [554, 8554, 8000, 8080, 9000]

# Common DVR service ports (for discovery, not RTSP)
DVR_SERVICE_PORTS = [37777, 37778, 34567, 34599, 80, 443]

# ── Colours for terminal output ──────────────────────────────────────

class C:
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    RESET  = "\033[0m"

# Disable colours on Windows CMD that doesn't support ANSI
if sys.platform == "win32":
    try:
        os.system("")  # enables ANSI on Win10+
    except Exception:
        C.GREEN = C.YELLOW = C.RED = C.CYAN = C.BOLD = C.DIM = C.RESET = ""

def ok(msg):    print(f"  {C.GREEN}✔{C.RESET} {msg}")
def warn(msg):  print(f"  {C.YELLOW}⚠{C.RESET} {msg}")
def fail(msg):  print(f"  {C.RED}✘{C.RESET} {msg}")
def info(msg):  print(f"  {C.CYAN}ℹ{C.RESET} {msg}")
def head(msg):  print(f"\n{C.BOLD}{msg}{C.RESET}")

# ── Network checks ───────────────────────────────────────────────────

def check_port(ip, port, timeout=2):
    """Check if a TCP port is open."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        result = s.connect_ex((ip, port))
        s.close()
        return result == 0
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def find_rtsp_port(ip):
    """Find the RTSP port on a DVR by trying common ports."""
    info(f"Scanning for RTSP port on {ip}...")
    for port in RTSP_PORTS:
        if check_port(ip, port, timeout=1):
            ok(f"Port {C.BOLD}{port}{C.RESET} is open")
            return port
        else:
            print(f"    Port {port}: closed")
    return None

def scan_network_for_dvrs():
    """Scan common IPs on the local subnet for DVRs."""
    head("Scanning local network for DVR/camera devices...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        subnet = ".".join(local_ip.split(".")[:3])
        info(f"Your PC IP: {local_ip}  (subnet {subnet}.x)")
    except Exception:
        subnet = "192.168.1"
        warn(f"Could not detect subnet, trying {subnet}.x")

    candidates = [f"{subnet}.{i}" for i in
                  [10, 108, 64, 100, 200, 1] + list(range(2, 31))]

    print(f"  Checking {len(candidates)} IPs for RTSP ports ({', '.join(str(p) for p in RTSP_PORTS)})...")
    found = []
    for ip in candidates:
        for port in RTSP_PORTS:
            if check_port(ip, port, timeout=0.5):
                ok(f"RTSP service found at {C.BOLD}{ip}:{port}{C.RESET}")
                found.append((ip, port))
                break  # found this IP, move to next

    if not found:
        # Also check for DVR service ports (device is there but RTSP may be on unusual port)
        warn("No RTSP ports found. Checking for DVR service ports...")
        for ip in candidates[:15]:  # check fewer IPs for service ports
            for port in DVR_SERVICE_PORTS:
                if check_port(ip, port, timeout=0.5):
                    warn(f"DVR service at {ip}:{port} — RTSP port may be non-standard")
                    found.append((ip, None))
                    break

    if not found:
        warn("No DVR/camera devices found on common IPs.")
        info("Check the DVR's network settings or your router's DHCP table for its IP.")
    return found


# ── RTSP stream test ─────────────────────────────────────────────────

def test_rtsp_url(url, label="", save_frame=True, timeout_sec=15):
    """
    Try to open an RTSP URL, grab a frame, and report stream details.
    Returns dict with results.
    """
    result = {
        "url": url, "label": label,
        "connected": False, "frame_ok": False,
        "width": 0, "height": 0, "fps": 0,
        "codec": "", "frame_path": None,
        "error": None, "latency_ms": 0,
    }

    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
        f"rtsp_transport;tcp|analyzeduration;{timeout_sec*1000000}"
        f"|stimeout;{timeout_sec*1000000}"
    )

    t0 = time.time()
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    connect_time = time.time() - t0

    if not cap.isOpened():
        result["error"] = "Could not connect (wrong URL, credentials, or device not reachable)"
        return result

    result["connected"] = True
    result["latency_ms"] = int(connect_time * 1000)

    result["width"]  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    result["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    result["fps"]    = round(cap.get(cv2.CAP_PROP_FPS), 1)
    fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
    result["codec"] = "".join([chr((fourcc >> 8*i) & 0xFF) for i in range(4)]) if fourcc else "unknown"

    grabbed = False
    for attempt in range(30):
        ret, frame = cap.read()
        if ret and frame is not None and frame.size > 0:
            grabbed = True
            break
        time.sleep(0.1)

    if grabbed:
        result["frame_ok"] = True
        if save_frame:
            safe_label = (label or "test").replace(" ", "_").replace("/", "-")
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            fname = f"rtsp_test_{safe_label}_{ts}.jpg"
            cv2.imwrite(fname, frame)
            result["frame_path"] = fname
    else:
        result["error"] = "Connected but no video frames received"

    cap.release()
    return result


def print_result(r):
    """Pretty-print a single stream test result."""
    label = r["label"] or r["url"]
    if r["frame_ok"]:
        ok(f"{C.BOLD}{label}{C.RESET}")
        print(f"       Resolution : {r['width']}×{r['height']}")
        print(f"       FPS        : {r['fps']}")
        print(f"       Codec      : {r['codec']}")
        print(f"       Latency    : {r['latency_ms']}ms")
        if r["frame_path"]:
            print(f"       Screenshot : {C.CYAN}{r['frame_path']}{C.RESET}")

        w = r["width"]
        if w >= 1280:
            ok("Resolution excellent for PPE + headcount detection")
        elif w >= 640:
            ok("Resolution OK for detection (consider using main stream for better accuracy)")
        else:
            warn(f"Resolution low ({r['width']}×{r['height']}) — use main stream (subtype=0) instead")
    elif r["connected"]:
        warn(f"{label} — connected but no frames: {r['error']}")
    else:
        fail(f"{label} — {r['error']}")


# ── Auto-detect DVR brand and test channels ──────────────────────────

def auto_detect_and_test(ip, port, user, password, channels, save_frames=True):
    """
    Try all known RTSP URL patterns for a given IP:port.
    Returns the profile that worked and test results.
    """
    head(f"Testing RTSP on {ip}:{port} (user={user})...")

    if not check_port(ip, port):
        fail(f"Port {port} not open on {ip}")
        # Try to find the right port
        found_port = find_rtsp_port(ip)
        if found_port:
            info(f"Found open RTSP port: {found_port}")
            port = found_port
        else:
            fail("No RTSP port found. Check DVR network settings.")
            return None, None, []

    ok(f"Port {port} is open on {ip}")

    working_profile = None
    for profile_key, profile in PROFILES.items():
        # Test main stream of channel 1 (sub-stream may be too low res)
        path = profile["main"].format(ch=channels[0])
        url = f"rtsp://{user}:{password}@{ip}:{port}{path}"
        label = f"{profile['name']} ch{channels[0]} main"

        info(f"Trying {profile['name']} format...")
        r = test_rtsp_url(url, label=label, save_frame=False, timeout_sec=10)

        if r["connected"] and r["frame_ok"]:
            ok(f"{C.GREEN}{C.BOLD}Match! DVR uses {profile['name']} RTSP format{C.RESET}")
            working_profile = profile_key
            break
        elif r["connected"]:
            warn(f"{profile['name']}: connected but no frames")

    if not working_profile:
        fail("None of the known RTSP URL patterns worked.")
        info("Possible causes:")
        info("  - Wrong username/password")
        info("  - DVR uses a non-standard RTSP path")
        info("  - RTSP is disabled in DVR settings")
        info("Try the DVR's web interface to find the correct RTSP URL.")
        return None, port, []

    # Test all requested channels with the working profile
    head(f"Testing {len(channels)} channel(s) — {PROFILES[working_profile]['name']}...")
    profile = PROFILES[working_profile]
    all_results = []

    for ch in channels:
        # Test main stream (recommended for detection)
        path = profile["main"].format(ch=ch)
        url = f"rtsp://{user}:{password}@{ip}:{port}{path}"
        label = f"Channel {ch} (main)"
        r = test_rtsp_url(url, label=label, save_frame=save_frames, timeout_sec=10)
        print_result(r)
        all_results.append(r)

        # Also test sub stream for reference
        path_sub = profile["sub"].format(ch=ch)
        url_sub = f"rtsp://{user}:{password}@{ip}:{port}{path_sub}"
        label_sub = f"Channel {ch} (sub)"
        r_sub = test_rtsp_url(url_sub, label=label_sub, save_frame=False, timeout_sec=8)
        if r_sub["frame_ok"]:
            info(f"  Sub-stream also available: {r_sub['width']}×{r_sub['height']}")
        all_results.append(r_sub)

    return working_profile, port, all_results


# ── Generate SafeguardsIQ config ─────────────────────────────────────

def generate_config(ip, port, user, password, profile_key, results):
    """Print the RTSP URLs to use in SafeguardsIQ dashboard."""
    profile = PROFILES[profile_key]

    head("SafeguardsIQ — RTSP URLs for Dashboard")
    print(f"  {C.DIM}Paste these URLs when adding cameras in Edge Devices & Cameras.{C.RESET}")
    print(f"  {C.DIM}Main stream recommended for PPE detection accuracy.{C.RESET}")
    print()

    working = []
    for r in results:
        if r["frame_ok"] and "main" in r["label"].lower():
            ch_str = r["label"].split("Channel ")[-1].split(" ")[0]
            try:
                ch = int(ch_str)
                path = profile["main"].format(ch=ch)
                url = f"rtsp://{user}:{password}@{ip}:{port}{path}"
                print(f"  {C.BOLD}Channel {ch}{C.RESET}: {C.CYAN}{url}{C.RESET}")
                print(f"              {r['width']}×{r['height']} @ {r['fps']}fps · {r['codec']}")
                working.append({"channel": ch, "url": url, "width": r["width"], "height": r["height"]})
            except ValueError:
                pass

    print()
    if working:
        ok(f"{C.BOLD}{len(working)} camera(s) ready for SafeguardsIQ{C.RESET}")

        # Recommendation based on resolution
        w = working[0]["width"]
        h = working[0]["height"]
        if w >= 1280 or h >= 1080:
            ok("Resolution is good for PPE + headcount detection")
        elif w >= 640:
            warn("Consider increasing DVR sub-stream to 704×576 or 1280×720 in DVR settings")
        else:
            warn("Resolution is very low — increase in DVR encoding settings")

        # FPS recommendation
        info("Recommended: Set edge agent FPS to 5-10 for DVR streams (saves CPU)")
        info("In the dashboard, set Target FPS to 8 when adding each camera")
    print()

    # Write a summary file
    summary_file = f"safeguardsiq_dvr_config_{ip.replace('.','_')}.txt"
    with open(summary_file, "w") as f:
        f.write(f"SafeguardsIQ — DVR Configuration\n")
        f.write(f"================================\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write(f"DVR IP:       {ip}\n")
        f.write(f"RTSP Port:    {port}\n")
        f.write(f"DVR Format:   {PROFILES[profile_key]['name']}\n")
        f.write(f"Credentials:  {user} / {'*' * len(password)}\n")
        f.write(f"Cameras:      {len(working)}\n\n")
        f.write(f"RTSP URLs (paste into SafeguardsIQ dashboard):\n")
        f.write(f"{'='*60}\n")
        for cam in working:
            f.write(f"Channel {cam['channel']}: {cam['url']}\n")
            f.write(f"  Resolution: {cam['width']}x{cam['height']}\n\n")
    info(f"Config saved to: {C.CYAN}{summary_file}{C.RESET}")
    print()


# ── Interactive mode ─────────────────────────────────────────────────

def interactive():
    """Walk the user through testing step by step."""
    print()
    print(f"{C.BOLD}{'='*60}{C.RESET}")
    print(f"{C.BOLD}  SafeguardsIQ — RTSP Compatibility Tester v2{C.RESET}")
    print(f"{C.BOLD}  CP Plus & Dahua DVR/Camera support{C.RESET}")
    print(f"{C.BOLD}{'='*60}{C.RESET}")

    # Step 1: Find or enter DVR IP
    head("Step 1: DVR/Camera IP Address")
    choice = input("  Scan network automatically? (Y/n): ").strip().lower()

    ip = None
    port = None

    if choice != 'n':
        found = scan_network_for_dvrs()
        if found:
            if len(found) == 1:
                ip, port = found[0]
                info(f"Using {ip}" + (f":{port}" if port else ""))
            else:
                print()
                for i, (f_ip, f_port) in enumerate(found):
                    port_str = f":{f_port}" if f_port else " (RTSP port unknown)"
                    print(f"    [{i+1}] {f_ip}{port_str}")
                idx = input(f"  Select (1-{len(found)}): ").strip()
                try:
                    ip, port = found[int(idx)-1]
                except (ValueError, IndexError):
                    ip, port = found[0]

    if not ip:
        ip = input("  Enter DVR IP address: ").strip()

    if not ip:
        fail("No IP provided. Exiting.")
        return

    # Find RTSP port if not already known
    if not port:
        head("Step 1b: Finding RTSP Port")
        port = find_rtsp_port(ip)
        if not port:
            port_input = input("  RTSP port not found. Enter port manually (or press Enter to skip): ").strip()
            if port_input:
                port = int(port_input)
            else:
                fail("Cannot proceed without RTSP port.")
                return
        else:
            ok(f"RTSP port: {port}")

    # Step 2: Credentials
    head("Step 2: DVR Login Credentials")
    info("Common defaults: admin/admin, admin/12345, admin/Admin@123")
    user = input("  Username [admin]: ").strip() or "admin"
    password = input("  Password [admin]: ").strip() or "admin"

    # Step 3: Channels
    head("Step 3: Camera Channels")
    ch_input = input("  How many channels to test? [4]: ").strip()
    try:
        num_ch = int(ch_input) if ch_input else 4
    except ValueError:
        num_ch = 4
    channels = list(range(1, num_ch + 1))
    info(f"Will test channels: {', '.join(str(c) for c in channels)}")

    # Step 4: Run tests
    profile_key, port, results = auto_detect_and_test(
        ip, port, user, password, channels, save_frames=True)

    if profile_key and results:
        generate_config(ip, port, user, password, profile_key, results)

    # Summary
    head("Test Summary")
    main_results = [r for r in results if "main" in r.get("label", "").lower()]
    total = len(main_results)
    working = len([r for r in main_results if r["frame_ok"]])

    if working == total and total > 0:
        ok(f"{C.GREEN}{C.BOLD}All {working} channels working — site is ready for SafeguardsIQ!{C.RESET}")
    elif working > 0:
        warn(f"{working}/{total} channels working. Check offline cameras before installation.")
    else:
        fail("No working channels found. Check DVR settings and credentials.")

    print()


# ── Direct URL test ──────────────────────────────────────────────────

def test_single_url(url):
    """Test a single RTSP URL directly."""
    head("Testing RTSP URL...")
    info(url)
    r = test_rtsp_url(url, label="Direct URL", save_frame=True)
    print_result(r)
    if r["frame_ok"]:
        ok("Stream is working — ready for SafeguardsIQ")
    print()


# ── CLI entry point ──────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SafeguardsIQ RTSP Compatibility Tester v2 — CP Plus & Dahua",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python rtsp_tester.py                                              # Interactive
  python rtsp_tester.py --ip 192.168.1.10                            # Auto-detect port & format
  python rtsp_tester.py --ip 192.168.1.10 --port 8554                # Known port
  python rtsp_tester.py --ip 192.168.1.10 -u admin -p Admin@123      # With credentials
  python rtsp_tester.py --url rtsp://admin:Admin@123@192.168.1.10:8554/cam/realmonitor?channel=1&subtype=0
        """)
    parser.add_argument("--ip", help="DVR/Camera IP address")
    parser.add_argument("--port", type=int, help="RTSP port (auto-detected if not given)")
    parser.add_argument("-u", "--user", default="admin", help="Username (default: admin)")
    parser.add_argument("-p", "--password", default="admin", help="Password (default: admin)")
    parser.add_argument("--channels", type=int, default=4, help="Number of channels to test (default: 4)")
    parser.add_argument("--url", help="Test a specific RTSP URL directly")

    args = parser.parse_args()

    if args.url:
        test_single_url(args.url)
    elif args.ip:
        port = args.port
        if not port:
            port = find_rtsp_port(args.ip)
            if not port:
                fail(f"No RTSP port found on {args.ip}. Use --port to specify manually.")
                return
        channels = list(range(1, args.channels + 1))
        profile_key, port, results = auto_detect_and_test(
            args.ip, port, args.user, args.password, channels, save_frames=True)
        if profile_key and results:
            generate_config(args.ip, port, args.user, args.password, profile_key, results)
    else:
        interactive()

if __name__ == "__main__":
    main()
