# RTSP Proxy Setup Guide — For Customer IT Team

This document explains how to run a lightweight RTSP relay so that
SafeguardsIQ never sees or stores your camera login credentials.

## What this does

Your cameras have RTSP URLs with passwords like:
    rtsp://admin:SecretPass123@192.168.1.101:554/stream1

Instead of giving these passwords to SafeguardsIQ, you run a proxy
(mediamtx) that your IT team configures. SafeguardsIQ connects to the
proxy's output streams, which have no passwords:
    rtsp://proxy-server:8554/cam-101

Result: SafeguardsIQ literally cannot leak what it never receives.

## Install mediamtx (one binary, no dependencies)

Download from: https://github.com/bluenviron/mediamtx/releases
Choose the version for your OS (linux_amd64 for most servers).

```bash
wget https://github.com/bluenviron/mediamtx/releases/download/v1.9.0/mediamtx_v1.9.0_linux_amd64.tar.gz
tar xzf mediamtx_v1.9.0_linux_amd64.tar.gz
```

## Configure camera sources

Edit `mediamtx.yml`:

```yaml
paths:
  cam-101:
    source: rtsp://admin:SecretPass123@192.168.1.101:554/stream1
    sourceOnDemand: yes
  cam-102:
    source: rtsp://admin:SecretPass123@192.168.1.102:554/stream1
    sourceOnDemand: yes
  cam-103:
    source: rtsp://operator:Pass456@192.168.1.103:554/cam/realmonitor
    sourceOnDemand: yes
  # ... add all 100+ cameras
```

The `sourceOnDemand: yes` option means the proxy only connects to a camera
when someone is actually requesting that stream — it doesn't hold open
100+ connections permanently.

## Run it

```bash
./mediamtx
```

For production, run as a systemd service:

```ini
# /etc/systemd/system/mediamtx.service
[Unit]
Description=RTSP Proxy (mediamtx)
After=network.target

[Service]
ExecStart=/opt/mediamtx/mediamtx /opt/mediamtx/mediamtx.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mediamtx
```

## What SafeguardsIQ sees

In the SafeguardsIQ dashboard, when attaching a camera to a device, the
customer's operator enters the proxy URL — NOT the camera's real URL:

    rtsp://proxy-server:8554/cam-101

This URL contains no password. The password lives only in `mediamtx.yml`
on the proxy server, which only your IT team has access to.

## Security notes

- `mediamtx.yml` contains all camera passwords. Protect it the same way
  you'd protect any credentials file (restricted file permissions, not
  world-readable).
- The proxy server should be on the same LAN as the cameras, behind your
  firewall, not exposed to the internet.
- mediamtx supports TLS for RTSP if you want encrypted streams on the
  LAN — see their documentation.
- SafeguardsIQ edge devices connect to the proxy, not to cameras directly.
  If the proxy goes down, detection pauses until it's back — the edge
  agent retries automatically.
