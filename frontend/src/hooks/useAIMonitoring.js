/**
 * useAIMonitoring.js
 * SafeguardIQ Enterprise — React hook to start/stop AI camera monitoring
 * Place in: frontend/src/hooks/useAIMonitoring.js
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AI_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://safeguardsiq.com/ai'
  : '/api/v1/ai';

export default function useAIMonitoring() {
  const [streams,  setStreams]  = useState({});
  const [aiOnline, setAiOnline] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  /* Check AI service health every 10 seconds */
  useEffect(() => {
    const check = async () => {
      try {
        await axios.get(`${AI_URL}/health`, { timeout: 3000 });
        setAiOnline(true);
      } catch {
        setAiOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  /* Poll stream status every 5 seconds */
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await axios.get(`${AI_URL}/stream/status`, { timeout: 3000 });
        setStreams(res.data.streams || {});
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  /* Start monitoring a camera */
  const startCamera = useCallback(async (cameraId, rtspUrl, tenantId, ppeTypes = ['Helmet','Safety Vest','Gloves']) => {
    setLoading(true); setError('');
    try {
      await axios.post(`${AI_URL}/stream/start`, {
        camera_id:  cameraId,
        rtsp_url:   rtspUrl,
        tenant_id:  tenantId,
        ppe_types:  ppeTypes,
        confidence: 0.25,
      });
      setLoading(false);
      return true;
    } catch (e) {
      setError(e.message);
      setLoading(false);
      return false;
    }
  }, []);

  /* Stop monitoring a camera */
  const stopCamera = useCallback(async (cameraId) => {
    try {
      await axios.post(`${AI_URL}/stream/stop`, { camera_id: cameraId });
    } catch {}
  }, []);

  /* Get status of one stream */
  const getStreamStatus = (cameraId) => streams[cameraId] || null;

  /* Total violations across all streams */
  const totalViolationsToday = Object.values(streams)
    .reduce((sum, s) => sum + (s.violations_today || 0), 0);

  /* Active stream count */
  const activeCount = Object.values(streams)
    .filter(s => s.status === 'running').length;

  return {
    aiOnline,
    streams,
    loading,
    error,
    startCamera,
    stopCamera,
    getStreamStatus,
    totalViolationsToday,
    activeCount,
  };
}
