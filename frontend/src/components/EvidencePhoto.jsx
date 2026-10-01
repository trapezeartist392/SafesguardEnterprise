import { useState } from 'react';

const T = {
  panel: '#141619', card: '#1A1D22', border: '#2B3138',
  amber: '#F5A623', green: '#2FB674', red: '#E5484D',
  white: '#F0F1F3', muted: '#9AA0A8', dim: '#6A7080',
};

/**
 * EvidencePhoto — shows the captured camera frame for a violation.
 * Pass the violation object — it reads violation.frame_url or violation.image_path
 * Shown inside the expanded violation row in the archive.
 */
export default function EvidencePhoto({ violation }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  // image_path from backend is like /api/v1/frames/xxx.jpg
  // frame_url may come from archive endpoint
  const src = violation?.image_path || violation?.frame_url || null;

  if (!src) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
        border: `1px dashed ${T.border}`, borderRadius: 8, marginTop: 10,
      }}>
        <span style={{ fontSize: 20 }}>📷</span>
        <div>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>No Evidence Photo</div>
          <div style={{ fontSize: 11, color: T.dim }}>
            Evidence photos are captured when a real camera is connected to the edge agent.
            Simulated detections do not produce photos.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: 'rgba(229,72,77,0.06)',
        border: `1px dashed ${T.red}`, borderRadius: 8, marginTop: 10,
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>Photo unavailable</div>
          <div style={{ fontSize: 11, color: T.dim }}>
            The evidence photo could not be loaded. It may have been deleted or the server is offline.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, fontWeight: 600, letterSpacing: 1 }}>
          📷 EVIDENCE PHOTO
        </div>
        <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
          onClick={() => setFullscreen(true)}>
          <img
            src={src}
            alt={`Evidence — ${violation.violation_type}`}
            onError={() => setError(true)}
            style={{
              width: 320, height: 180, objectFit: 'cover',
              borderRadius: 8, border: `2px solid ${T.border}`,
              display: 'block',
            }}
          />
          {/* Overlay with violation info */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
            borderRadius: '0 0 6px 6px', padding: '20px 10px 8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>
                  ⚠️ {violation.violation_type}
                </div>
                <div style={{ fontSize: 10, color: T.muted }}>
                  {violation.device_code || violation.camera_id || '—'} · {new Date(violation.occurred_at).toLocaleTimeString()}
                </div>
              </div>
              <div style={{
                background: severityColor(violation.severity),
                color: '#000', fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 999,
              }}>
                {violation.confidence}%
              </div>
            </div>
          </div>
          {/* Expand icon */}
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.6)', borderRadius: 6,
            padding: '4px 8px', fontSize: 10, color: T.white,
          }}>
            ⛶ Expand
          </div>
        </div>
        <div style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>
          Click to view full size
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={src}
              alt={`Evidence — ${violation.violation_type}`}
              style={{
                maxWidth: '90vw', maxHeight: '85vh',
                objectFit: 'contain', borderRadius: 10,
                border: `2px solid ${T.border}`,
              }}
            />
            {/* Header bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.8)', borderRadius: '8px 8px 0 0',
              padding: '10px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>
                  ⚠️ {violation.violation_type}
                </span>
                <span style={{ fontSize: 11, color: T.muted, marginLeft: 12 }}>
                  {violation.violation_no} · {new Date(violation.occurred_at).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Download button */}
                <a
                  href={src}
                  download={`${violation.violation_no}.jpg`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    fontSize: 11, color: T.amber, textDecoration: 'none',
                    padding: '4px 10px', border: `1px solid ${T.amber}`,
                    borderRadius: 6,
                  }}
                >
                  ⬇ Download
                </a>
                <button
                  onClick={() => setFullscreen(false)}
                  style={{
                    background: 'none', border: 'none', color: T.muted,
                    fontSize: 20, cursor: 'pointer', lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Footer bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.8)', borderRadius: '0 0 8px 8px',
              padding: '8px 16px',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, color: T.muted }}>
                Device: {violation.device_code || '—'} · Zone: {violation.zone_name || violation.area_name || '—'}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: severityColor(violation.severity),
              }}>
                {violation.severity?.toUpperCase()} · {violation.confidence}% confidence
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function severityColor(sev) {
  if (sev === 'high' || sev === 'critical') return '#E5484D';
  if (sev === 'medium') return '#F5A623';
  return '#9AA0A8';
}
