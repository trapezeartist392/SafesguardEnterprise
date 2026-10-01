import { useState, useEffect } from 'react';
import useRealtime from '../hooks/useRealtime.js';

const T = {
  bg: '#0C0D10', panel: '#141619', card: '#181B20',
  amber: '#F5A623', amberDim: 'rgba(245,166,35,0.12)',
  green: '#2FB674', greenDim: 'rgba(47,182,116,0.10)',
  red: '#E5484D', redDim: 'rgba(229,72,77,0.10)',
  white: '#F0F1F3', muted: '#9AA0A8', dim: '#6A7080',
  border: '#2B3138',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 5) return 'just now';
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

function severityColor(sev) {
  if (sev === 'high' || sev === 'critical') return T.red;
  if (sev === 'medium') return T.amber;
  return T.muted;
}

function severityBg(sev) {
  if (sev === 'high' || sev === 'critical') return T.redDim;
  if (sev === 'medium') return T.amberDim;
  return 'rgba(255,255,255,0.04)';
}

export default function LiveDetectionFeed({ style = {} }) {
  const { violations, connected, devices } = useRealtime({ maxViolations: 40 });
  const [now, setNow] = useState(Date.now());

  // Update "time ago" labels every 5 seconds
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(i);
  }, []);

  const onlineDevices = Object.values(devices).filter(d => d.status === 'online').length;

  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10,
      overflow: 'hidden', ...style,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 18px', borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? T.green : T.red,
            boxShadow: connected ? `0 0 8px ${T.greenDim}` : 'none',
            animation: connected ? 'pulse-live 2s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: "'Consolas', monospace", fontSize: 11,
            letterSpacing: 2, textTransform: 'uppercase',
            color: connected ? T.green : T.red,
          }}>
            {connected ? 'LIVE' : 'RECONNECTING...'}
          </span>
          <span style={{ fontSize: 12, color: T.dim }}>Real-time Detection Feed</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: "'Consolas', monospace" }}>
          <span style={{ color: T.muted }}>{violations.length} events</span>
          {onlineDevices > 0 && (
            <span style={{ color: T.green }}>{onlineDevices} device{onlineDevices > 1 ? 's' : ''} online</span>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '100px 1fr 80px 140px 90px',
        gap: 8, padding: '8px 18px', fontSize: 10,
        fontFamily: "'Consolas', monospace", letterSpacing: 1,
        textTransform: 'uppercase', color: T.dim,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <span>Violation</span>
        <span>Type</span>
        <span>Conf.</span>
        <span>Source</span>
        <span>When</span>
      </div>

      {/* Violation rows */}
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {violations.length === 0 ? (
          <div style={{
            padding: '40px 18px', textAlign: 'center', color: T.dim, fontSize: 13,
          }}>
            {connected
              ? 'Waiting for detections from edge devices...'
              : 'Connecting to real-time feed...'}
          </div>
        ) : (
          violations.map((v, i) => (
            <div key={v.violation_no + '-' + i} style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 80px 140px 90px',
              gap: 8, padding: '11px 18px', fontSize: 12,
              borderBottom: `1px solid rgba(255,255,255,0.03)`,
              background: i === 0 ? 'rgba(245,166,35,0.04)' : 'transparent',
              animation: i === 0 ? 'flash-in 0.4s ease' : 'none',
            }}>
              <span style={{ fontFamily: "'Consolas', monospace", color: T.muted, fontSize: 11 }}>
                {v.violation_no}
              </span>
              <span style={{ fontWeight: 600, color: T.white }}>{v.violation_type}</span>
              <span>
                <span style={{
                  fontFamily: "'Consolas', monospace", fontSize: 11,
                  padding: '2px 8px', borderRadius: 999,
                  background: severityBg(v.severity),
                  color: severityColor(v.severity),
                }}>
                  {v.confidence}%
                </span>
              </span>
              <span style={{ color: T.muted, fontSize: 11 }}>
                {v.device_code || '—'} / {v.zone_name || v.cam_label || '—'}
              </span>
              <span style={{ fontFamily: "'Consolas', monospace", color: T.dim, fontSize: 11 }}>
                {timeAgo(v.occurred_at)}
              </span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse-live {
          0%   { box-shadow: 0 0 0 0 rgba(47,182,116,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(47,182,116,0); }
          100% { box-shadow: 0 0 0 0 rgba(47,182,116,0); }
        }
        @keyframes flash-in {
          0%   { background: rgba(245,166,35,0.15); }
          100% { background: rgba(245,166,35,0.04); }
        }
      `}</style>
    </div>
  );
}
