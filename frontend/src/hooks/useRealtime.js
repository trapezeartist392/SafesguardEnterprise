import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useRealtime — connects to the Enterprise WebSocket and receives
 * real-time violations, device status updates, and stats.
 *
 * Usage:
 *   const { violations, devices, connected } = useRealtime();
 *   // violations = array of new violations as they arrive (most recent first)
 *   // devices = map of device_code → latest status
 *   // connected = boolean, true when WS is live
 */
export default function useRealtime({ maxViolations = 50 } = {}) {
  const [violations, setViolations] = useState([]);
  const [devices, setDevices] = useState({});
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('safeg_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // In dev, backend is on 4200; in prod (nginx), same host
    const port = window.location.port === '5173' ? '4200' : window.location.port;
    const url = `${protocol}//${host}:${port}/ws?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] Real-time feed connected');
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'violation') {
          setViolations(prev => {
            const updated = [msg.data, ...prev].slice(0, maxViolations);
            return updated;
          });
          setLastEvent(msg);

          // Browser notification for high severity
          if (msg.data.severity === 'high' || msg.data.confidence >= 90) {
            playAlertSound();
            showNotification(msg.data);
          }
        }

        if (msg.type === 'device_status') {
          setDevices(prev => ({
            ...prev,
            [msg.data.device_code]: msg.data,
          }));
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[WS] Disconnected — reconnecting in 3s');
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [maxViolations]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return { violations, devices, connected, lastEvent };
}

// ── Alert sound (short beep via Web Audio API, no file needed) ──
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

// ── Browser notification ──
function showNotification(violation) {
  if (Notification.permission === 'granted') {
    new Notification(`⚠️ ${violation.violation_type}`, {
      body: `${violation.device_code || 'Unknown device'} — ${violation.zone_name || ''} — ${violation.confidence}% confidence`,
      icon: '🦺',
      tag: violation.violation_no,
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}
