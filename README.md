# SafeguardsIQ Enterprise v1

Air-gapped, on-premise factory safety monitoring. Runs entirely on the
customer's server — no internet, no cloud dependency, no camera credentials
ever leave the customer's network.

## What makes this different from SafeguardsIQ Cloud/Edge

| | Cloud (v1) | Edge (v2) | Enterprise |
|---|---|---|---|
| Detection | Cloud API | On-device YOLO | On-device YOLO |
| Dashboard | Hosted by Syyaim | Hosted by Syyaim | **Customer's own server** |
| Database | Syyaim's DB | Syyaim's DB | **Customer's own DB** |
| Internet required | Always | For dashboard | **Never** |
| Camera credentials | Stored in config | Stored in config | **Never seen by SafeguardsIQ** |
| Syyaim remote access | Yes (support) | Yes (support) | **Zero** |
| Licensing | Monthly SaaS | Monthly SaaS | **Offline .lic file** |

## Architecture

```
safeguardsiq-enterprise-v1/
├── src/                        Backend (Node.js/Express, port 4200)
│   ├── server.js               Validates license on boot
│   ├── app.js                  requireLicense middleware on all protected routes
│   ├── config/
│   │   ├── database.js         Postgres pool
│   │   ├── license.js          RSA signature verification + enforcement
│   │   └── syyaim_public.pem   Public key (embedded in product)
│   ├── middleware/
│   │   ├── auth.js             JWT (users) + API-key (devices)
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js      Signup/login
│   │   ├── device.routes.js    Device reg (enforceDeviceLimit) + heartbeat + sync
│   │   ├── camera.routes.js    Camera attachment (enforceCameraLimit)
│   │   ├── violation.routes.js
│   │   └── license.routes.js   License status for dashboard
│   └── db/migrations/
│       └── 001_init.sql
├── frontend/                   React/Vite dashboard
│   └── src/
│       ├── pages/              Overview, Devices, Violations, Cameras, Login, Signup
│       └── components/         AddDeviceModal
├── edge-agent/                 Runs on Jetson/Pi (separate from server)
│   ├── edge_agent.py           Simulate mode included — no camera needed to test
│   ├── requirements.txt
│   └── models/                 ppe-v1.pt goes here
├── proxy/
│   └── RTSP_PROXY_SETUP.md    Guide for customer IT — mediamtx relay
├── docker/
│   └── nginx/default.conf     Frontend + API proxy
├── docker-compose.yml          Full stack in one command
├── Dockerfile                  Backend image
├── Dockerfile.frontend         Frontend build → nginx
├── license-tool/               *** SYYAIM INTERNAL — never ship to customer ***
│   ├── generate-license.js     CLI to issue .lic files
│   ├── syyaim_private.pem      NEVER share this
│   ├── syyaim_public.pem       Copy of what's in src/config/
│   └── README.md
├── sample-license/             Test .lic file for dev
├── package.json
└── .env.example
```

## Credential isolation — how it works

SafeguardsIQ **never sees camera passwords**. The customer's IT team runs
an RTSP proxy (mediamtx) on their network. The proxy authenticates to
cameras; SafeguardsIQ connects to the proxy's unauthenticated output
streams. See `proxy/RTSP_PROXY_SETUP.md` for the full setup guide.

```
Cameras (passwords) → mediamtx proxy (IT-managed) → SafeguardsIQ (no passwords)
```

## License system — how it works

Since there's no internet to phone home, licensing uses offline
cryptographic verification:

1. Syyaim generates a `.lic` file (signed JSON) with: customer name, max
   devices, max cameras, expiry date, feature flags
2. Customer places the `.lic` file on their server
3. On startup, the backend verifies the RSA signature using the embedded
   public key — no network call needed
4. If the license is expired, missing, or tampered with, all protected
   routes return 403; login still works so the admin can see the error
5. Renewal: Syyaim emails/USBs a new `.lic` file; customer replaces the
   old one and restarts

**Enforcement points:**
- Registering a new device checks `max_devices`
- Attaching a new camera checks `max_cameras`
- Every protected API request checks `expires_at`

## Deployment on customer's server (air-gapped)

### Prerequisites on the customer's server
- Docker + Docker Compose installed
- No internet required after the initial image transfer

### Step 1: Build and export Docker images (done on Syyaim's machine, with internet)

```bash
cd safeguardsiq-enterprise-v1

# Build images
docker compose build

# Export as a single tar (transferable via USB / internal network)
docker save sgiq_enterprise_backend sgiq_enterprise_frontend postgres:16-alpine \
  -o safeguardsiq-enterprise-images.tar
```

### Step 2: Transfer to customer's server

Copy these to the customer's server (USB, SCP over internal network, etc.):
- `safeguardsiq-enterprise-images.tar` (the Docker images)
- `docker-compose.yml`
- `docker/` folder (nginx config)
- `src/db/migrations/001_init.sql` (auto-runs on first Postgres boot)
- The `.lic` file you generated for this customer

### Step 3: Load images and start (on the customer's server, no internet)

```bash
# Load pre-built images
docker load -i safeguardsiq-enterprise-images.tar

# Create .env with real secrets
cat > .env << 'EOF'
DB_PASSWORD=Customer-Chooses-This-Password
JWT_SECRET=Customer-Chooses-This-Secret-Too
FRONTEND_PORT=8080
EOF

# Place license file
mkdir -p license-volume
cp safeguardsiq-customer-name.lic license-volume/safeguardsiq.lic

# Start everything
docker compose up -d
```

### Step 4: Verify

```bash
# Check all 3 containers are running
docker compose ps

# Check backend health + license status
curl http://localhost:4200/api/health
# Should return: {"status":"ok","service":"safeguardsiq-enterprise","license":"valid"}
```

### Step 5: First login

Open `http://server-ip:8080` in a browser on the same network.
- Click "Create admin account" (first-time setup)
- Start adding devices and cameras from the dashboard

### Step 6: Connect edge devices

On each Jetson/Pi on the factory floor:
```bash
cd edge-agent
pip install -r requirements.txt
python edge_agent.py   # creates config on first run
# Edit edge_config.json:
#   backend_url → http://server-ip:4200/api/v1/devices
#   device_key  → from the dashboard's "+ Add Device" flow
#   cameras     → proxy URLs from mediamtx (not real camera URLs)
python edge_agent.py   # starts detection + sync
```

## Local development (Syyaim side)

```bash
# Postgres
docker run --name sgiq_ent_postgres -e POSTGRES_DB=safeguardsiq_enterprise \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=devpass \
  -p 5434:5432 -d postgres:16-alpine

# Run migration
docker cp src/db/migrations/001_init.sql sgiq_ent_postgres:/tmp/001_init.sql
docker exec -it sgiq_ent_postgres psql -U postgres -d safeguardsiq_enterprise \
  -f /tmp/001_init.sql

# Place a test license
mkdir -p /tmp/license
cp sample-license/safeguardsiq-demo-factory.lic /tmp/license/safeguardsiq.lic

# Backend
npm install
export DB_HOST=localhost DB_PORT=5434 DB_NAME=safeguardsiq_enterprise \
  DB_USER=postgres DB_PASSWORD=devpass JWT_SECRET=dev-secret \
  LICENSE_PATH=/tmp/license/safeguardsiq.lic
npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

## Ports (no collision with other SafeguardsIQ products)

| Service | Cloud (v1) | Edge (v2) | Enterprise |
|---|---|---|---|
| Backend | 4000 | 4100 | **4200** |
| Frontend | 5173 | 5173 | **8080** (prod) / 5173 (dev) |
| Postgres | 5432 | 5433 | **5434** (dev) / 5432 (Docker internal) |
| DB name | safeg_ai | safeguard_v2 | **safeguardsiq_enterprise** |

## Generating a license for a customer

```bash
cd license-tool
node generate-license.js \
  --customer "Tata Steel Jamshedpur" \
  --max-devices 12 \
  --max-cameras 120 \
  --expires "2027-06-30" \
  --features "form18,whatsapp,edge"
```

Delivers a `.lic` file. Send it to the customer. **Never send
`syyaim_private.pem`.**
