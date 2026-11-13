# Headcount Integration Guide

## Files delivered
| File | Destination |
|------|------------|
| `005_headcount.sql` | Run against DB |
| `headcount.routes.js` | `src/routes/headcount.routes.js` |
| `headcount_counter.py` | `edge-agent/headcount_counter.py` |
| `HeadcountDashboard.jsx` | `frontend/src/components/HeadcountDashboard.jsx` |

---

## Step 1 — Run migration
```powershell
$env:PGPASSWORD="sgiq_pass"
psql -h localhost -p 5434 -U sgiq_user -d safeguardsiq_enterprise -f src\db\migrations\005_headcount.sql
```

---

## Step 2 — Register route in app.js
Add after the compliance route:
```js
const headcountRoutes = require('./routes/headcount.routes');
app.use(`${v1}/headcount`, requireLicense, headcountRoutes);
```

---

## Step 3 — Wire frontend into factory-compliance.jsx

### Add import (after TrainingRecommendations import):
```jsx
import HeadcountDashboard from './HeadcountDashboard';
```

### Add to sideNav Compliance section (after Training entry):
```jsx
{icon:"👥", name:"Headcount", pg:"headcount"},
```

### Add page render (after training block):
```jsx
{page==="headcount" && (
  <HeadcountDashboard/>
)}
```

---

## Step 4 — Assign camera roles in dashboard
In Edge Devices → camera edit modal, set:
- Entry gate cameras → role: **entry**
- Exit gate cameras → role: **exit**
- Assembly point camera → role: **assembly**

(The camera_role column was added by the migration. The EdgeDeviceManager
camera edit form needs a role dropdown — see Step 5.)

---

## Step 5 — Add role dropdown to camera edit form in EdgeDeviceManager.jsx
In the camera edit modal, add this field:
```jsx
<div style={fieldGroup}>
  <label style={label}>Camera Role</label>
  <select value={form.camera_role || 'ppe'} onChange={e => setForm({...form, camera_role: e.target.value})}
    style={input}>
    <option value="ppe">PPE Monitoring</option>
    <option value="entry">Entry Gate (counts IN)</option>
    <option value="exit">Exit Gate (counts OUT)</option>
    <option value="assembly">Assembly / Muster Point</option>
  </select>
</div>
```
Also include `camera_role` in the PUT body when saving.

---

## Step 6 — Edge agent: enable headcount cameras
In `edge_agent.py` (v4), add to the `run()` method after camera threads start:

```python
# Import headcount manager
try:
    from headcount_counter import HeadcountManager
    hc_cams = [c for c in self.cameras_config
               if c.get('camera_role') in ('entry','exit','assembly')]
    if hc_cams:
        self.hc_manager = HeadcountManager(
            hc_cams,
            self.config['backend_url'],
            self.session,
            flush_interval=5
        )
        self.hc_manager.start()
        print(f"[HC] {len(hc_cams)} headcount camera(s) active")
except Exception as e:
    print(f"[HC] headcount module not loaded: {e}")
```

The `cameras_config` list comes from the `/devices/config` pull and now
includes `camera_role` because the migration added it to the cameras table.
Make sure the `/devices/config` response includes `camera_role` in each camera object.

---

## Step 7 — Audio speaker on Jetson (assembly point edge device)
The browser alert beeps from the dashboard PC. For the physical speaker on
the Jetson at the assembly point, add to `headcount_counter.py`'s
`HeadcountManager._flush()` — after a successful flush, if events contained
`assembly_in` and the count doesn't match:

```python
import subprocess
subprocess.Popen(['aplay', '/opt/safeguardsiq/alarm.wav'])  # Linux audio
```

Or use the GPIO buzzer already in `edge_agent.py`'s `fire_local_alarm()`.

---

## WebSocket — no changes needed
The backend route already calls `ws.broadcastToTenant()`.
`HeadcountDashboard.jsx` listens for `headcount_update` messages.
Make sure `websocket.js` exports `broadcastToTenant(tenantId, msg)` —
if it only exports `broadcastCameraStatus`, add:

```js
function broadcastToTenant(tenantId, msg) {
  for (const [ws, meta] of clients) {
    if (meta.tenantId === tenantId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}
module.exports = { ..., broadcastToTenant };
```
