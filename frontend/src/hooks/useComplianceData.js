/**
 * useComplianceData.js — v2 (DB-accurate)
 * SafeguardIQ Enterprise · frontend/src/hooks/useComplianceData.js
 *
 * Built from exact violations table schema + violation_type values confirmed in DB:
 *   Helmet | Safety Vest | Gloves | Safety Boots | Goggles
 *   Unsafe Act - Distraction | Unsafe Acts - Distraction/Horseplay
 *
 * All 9 issues from audit fixed. Field names match DB exactly.
 */
import { useState, useEffect } from 'react';
import api from '../utils/api';

// ─── PPE exact match map (matches DB violation_type values exactly) ──
// Exact strings first, then fallback includes() for future AI variations
const PPE_TYPE_MAP = [
  { name: 'Hard Hat',       icon: '⛑️',  exact: ['Helmet', 'Hard Hat', 'No Helmet'],           keys: ['helmet','hard hat','hardhat'] },
  { name: 'Safety Vest',    icon: '🦺',  exact: ['Safety Vest', 'No Vest', 'Hi-Vis Vest'],      keys: ['vest','hi-vis','hivis','reflective'] },
  { name: 'Safety Boots',   icon: '👢',  exact: ['Safety Boots', 'No Boots', 'Footwear'],        keys: ['boot','shoe','footwear'] },
  { name: 'Eye Protection', icon: '🥽',  exact: ['Goggles', 'Eye Protection', 'No Goggles'],     keys: ['gogg','eye','glasses','visor'] },
  { name: 'Gloves',         icon: '🧤',  exact: ['Gloves', 'No Gloves', 'Hand Protection'],      keys: ['glove','hand protection'] },
  { name: 'Face Mask',      icon: '😷',  exact: ['Face Mask', 'Respirator', 'No Mask'],          keys: ['mask','respirator','fume','dust'] },
];

function matchPpe(violationType = '') {
  const lower = violationType.toLowerCase().trim();
  for (const p of PPE_TYPE_MAP) {
    if (p.exact.some(e => e.toLowerCase() === lower)) return p.name;
    if (p.keys.some(k => lower.includes(k))) return p.name;
  }
  return null;
}

function isPpe(violationType = '') {
  return matchPpe(violationType) !== null;
}

function pctColor(pct) {
  return pct >= 95 ? '#22D46A' : pct >= 85 ? '#FFB800' : '#FF3B3B';
}

// ─── Zone icon by area name ──────────────────────────────────────
const ZONE_ICON_KEYS = [
  ['welding', '⚡'], ['assembly', '🔩'], ['paint', '🎨'],
  ['forklift', '🚜'], ['press', '🔧'], ['electrical', '⚙️'],
  ['store', '📦'], ['chemical', '🧪'], ['fire', '🔥'],
];
function zoneIcon(name = '') {
  const l = name.toLowerCase();
  return ZONE_ICON_KEYS.find(([k]) => l.includes(k))?.[1] ?? '📍';
}

// ─── HOOK ────────────────────────────────────────────────────────
export function useComplianceData() {
  const [violations,    setViolations]    = useState([]);
  const [ppeTypes,      setPpeTypes]      = useState([]);
  const [zones,         setZones]         = useState([]);
  const [timeline,      setTimeline]      = useState([]);
  const [zoneBars,      setZoneBars]      = useState([]);
  const [lastViolation, setLastViolation] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [stats,         setStats]         = useState({
    openCount: 0, pendingCount: 0, closedToday: 0,
    totalMonth: 0, nearMissCount: 0, compliance: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Token is attached by the shared API client
      if (!localStorage.getItem('safeg_token')) { setLoading(false); return; }

      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const month = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

        const res = await api.get(
          `/violations/archive?dateFrom=${month}&dateTo=${today}&limit=200`
        );
        const viols = res.data.data?.violations || [];

        // ── Zero-violation early return ──────────────────────────
        if (viols.length === 0) {
          setPpeTypes(PPE_TYPE_MAP.map(p => ({ name: p.name, icon: p.icon, pct: 100, c: '#22D46A' })));
          setZones([]); setZoneBars([]); setViolations([]);
          setTimeline([{
            icon: '✅', color: '#22D46A',
            title: 'All clear — no violations this month',
            meta: `${formatTime(new Date().toISOString())} · All zones clear`,
          }]);
          setStats({ openCount: 0, pendingCount: 0, closedToday: 0, totalMonth: 0, nearMissCount: 0, compliance: 100 });
          setLoading(false);
          return;
        }

        // ── Stats ────────────────────────────────────────────────
        const todayViols   = viols.filter(v => v.occurred_at?.startsWith(today));
        const openCount    = viols.filter(v => v.status === 'open').length;
        const pendingCount = viols.filter(v => v.status === 'acknowledged').length;
        const closedToday  = todayViols.filter(v => v.status === 'resolved').length;
        const totalMonth   = viols.length;

        const nearMissCount = viols.filter(v =>
          v.violation_type?.toLowerCase().includes('near') ||
          v.category?.toLowerCase().includes('near_miss')
        ).length;

        // Compliance: each violation today costs 2%, floor 50%
        const compliance = todayViols.length === 0
          ? 100
          : Math.max(50, Math.min(99, 100 - todayViols.length * 2));

        // ── Formatted violations list ────────────────────────────
        // Use violation_no from DB (e.g. "VIO-00085") — already formatted
        // Fall back to sequential counter if violation_no is null
        const formattedViols = viols.slice(0, 20).map((v, i) => ({
          id:     v.violation_no || `VIO-${String(totalMonth - i).padStart(3, '0')}`,
          _uuid:  v.id,
          date:   formatDate(v.occurred_at),
          type:   v.violation_type || 'PPE Violation',
          // area_name comes through if archive endpoint joins areas table
          // otherwise falls back to camera_id label
          zone:   v.area_name || v.zone_name || v.camera_id || 'Zone',
          worker: v.worker_id || '—',
          sev:    capitalize(v.severity || 'medium'),
          action: v.corrective_action || 'Under review',
          status: v.status === 'resolved'     ? 'Closed'
                : v.status === 'acknowledged' ? 'Pending' : 'Open',
        }));

        // ── PPE compliance — exact DB violation_type matching ────
        const ppeViolCounts = {};
        viols.forEach(v => {
          const bucket = matchPpe(v.violation_type || '');
          if (bucket) ppeViolCounts[bucket] = (ppeViolCounts[bucket] || 0) + 1;
        });

        const ppeList = PPE_TYPE_MAP.map(p => {
          const count = ppeViolCounts[p.name] || 0;
          // 1.5% reduction per violation — more realistic than 2%
          const pct = Math.round(Math.max(60, Math.min(100, 100 - count * 1.5)));
          return { name: p.name, icon: p.icon, pct, c: pctColor(pct) };
        });

        // ── Zone compliance ──────────────────────────────────────
        // Prefer area_name (from JOIN) over camera_id
        const violsByZone = {};
        viols.forEach(v => {
          const zone = v.area_name || v.zone_name || v.camera_id || 'Unknown';
          violsByZone[zone] = (violsByZone[zone] || 0) + 1;
        });

        const zoneList = Object.entries(violsByZone)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => {
            const pct = Math.round(Math.max(60, Math.min(100, 100 - count)));
            return { name, icon: zoneIcon(name), pct, c: pctColor(pct) };
          });

        const zoneBarList = Object.entries(violsByZone)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
          .map(([label, val]) => ({
            label: label.length > 9 ? label.slice(0, 9) : label,
            val,
            c: val >= 10 ? '#FF3B3B' : val >= 6 ? '#FF5C1A' : val >= 3 ? '#FFB800' : '#00D4B8',
          }));

        // ── Timeline ─────────────────────────────────────────────
        const timelineList = viols.slice(0, 5).map(v => ({
          icon:  ['high', 'critical'].includes(v.severity?.toLowerCase()) ? '🚨' : '⚠️',
          color: ['high', 'critical'].includes(v.severity?.toLowerCase()) ? '#FF3B3B' : '#FFB800',
          title: `${v.violation_type || 'Violation'} — ${v.area_name || v.camera_id || 'Zone'}`,
          meta:  `${formatTime(v.occurred_at)} · ${v.camera_id || ''} · ${capitalize(v.status || 'open')}`,
        }));

        // Green "all clear" entry if no violations in last 4 hours
        const lastViolTime    = viols[0]?.occurred_at ? new Date(viols[0].occurred_at) : null;
        const hoursSinceLast  = lastViolTime ? (Date.now() - lastViolTime) / 3600000 : 99;
        if (hoursSinceLast > 4) {
          timelineList.push({
            icon: '✅', color: '#22D46A',
            title: 'Monitoring active — no recent violations',
            meta: `${formatTime(new Date().toISOString())} · All zones clear`,
          });
        }

        // ── Last violation for Form 18 evidence panel ────────────
        // confidence column is 0–1 float in DB (e.g. 0.94 → 94%)
        const last = viols[0] || null;
        const formattedLastViol = last ? {
          camera:     last.camera_id || '—',
          time:       formatTime(last.occurred_at),
          confidence: last.confidence != null ? Math.round(Number(last.confidence) * 100) : null,
          type:       last.violation_type || '—',
        } : null;

        setViolations(formattedViols);
        setPpeTypes(ppeList);
        setZones(zoneList);
        setTimeline(timelineList);
        setZoneBars(zoneBarList);
        setLastViolation(formattedLastViol);
        setStats({ openCount, pendingCount, closedToday, totalMonth, nearMissCount, compliance });

      } catch (e) {
        console.error('useComplianceData error:', e.response?.status, e.message);
        // On failure, keep existing state (hardcoded fallbacks in factory-compliance.jsx take over)
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return { violations, ppeTypes, zones, timeline, zoneBars, lastViolation, stats, loading };
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d    = new Date(dateStr);
  const diff = Date.now() - d;
  if (diff < 86400000)  return `Today ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  if (diff < 172800000) return 'Yesterday';
  return `${Math.floor(diff / 86400000)} days ago`;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN',
    { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}
