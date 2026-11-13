/**
 * SafeguardIQ Enterprise — Training Recommendation Rules Engine
 * ============================================================
 * Fully offline, deterministic, explainable.
 * Analyses violation data across three dimensions:
 *   1. Violation type frequency  (which PPE is most ignored)
 *   2. Zone/area patterns        (which areas are worst)
 *   3. Time patterns             (shift & day-of-week trends)
 *
 * Every recommendation carries the evidence that triggered it,
 * so a safety manager can see exactly why it was raised.
 */

// ── Thresholds (tunable) ───────────────────────────────────────
const RULES = {
  typeHigh:        30,   // a violation type above this → dedicated training
  typeModerate:    15,   // above this → refresher
  zoneCritical:    40,   // a zone above this → zone-wide intervention
  zoneHigh:        20,
  shiftConcentration: 0.40,  // >40% of a type in one shift → shift-targeted
  repeatCameraDays:   3,     // same camera flagging X days running → equipment/SOP review
};

const SHIFTS = [
  { name: 'Morning', start: 6,  end: 14 },
  { name: 'General', start: 8,  end: 17 },
  { name: 'Evening', start: 14, end: 22 },
  { name: 'Night',   start: 22, end: 6  },
];

// PPE type → human training topic
const TRAINING_TOPIC = {
  'no-helmet':  { topic: 'Head Protection & Helmet Compliance', ppe: 'safety helmets', icon: '⛑️' },
  'no-vest':    { topic: 'High-Visibility Clothing Awareness',  ppe: 'safety vests',   icon: '🦺' },
  'no-gloves':  { topic: 'Hand Protection & Glove Usage',       ppe: 'safety gloves',  icon: '🧤' },
  'no-boots':   { topic: 'Foot Protection & Safety Footwear',   ppe: 'safety boots',   icon: '👢' },
  'no-mask':    { topic: 'Respiratory Protection',              ppe: 'face masks',     icon: '😷' },
  'no-goggles': { topic: 'Eye Protection & Goggle Compliance',  ppe: 'safety goggles', icon: '🥽' },
};

function shiftOf(hour) {
  if (hour >= 22 || hour < 6)  return 'Night';
  if (hour >= 6  && hour < 14) return 'Morning';
  if (hour >= 14 && hour < 22) return 'Evening';
  return 'General';
}

/**
 * Build recommendations from raw violation rows.
 * Each row: { violation_type, zone_name, area_name, occurred_at, camera_label }
 */
function generateRecommendations(violations, opts = {}) {
  const recs = [];
  const total = violations.length;

  if (total === 0) {
    return [{
      priority: 'info',
      icon: '✅',
      title: 'No violations in this period',
      detail: 'Compliance is strong. Maintain current safety protocols and continue monitoring.',
      evidence: 'Zero violations recorded for the selected period.',
      action: 'Keep up scheduled toolbox talks and routine PPE checks.',
    }];
  }

  // ── Dimension 1: violation type frequency ────────────────────
  const byType = {};
  violations.forEach(v => { byType[v.violation_type] = (byType[v.violation_type] || 0) + 1; });
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  sortedTypes.forEach(([type, count]) => {
    const t = TRAINING_TOPIC[type] || { topic: type, ppe: type, icon: '⚠️' };
    const pct = Math.round((count / total) * 100);

    if (count >= RULES.typeHigh) {
      recs.push({
        priority: 'high',
        icon: t.icon,
        title: `Dedicated training: ${t.topic}`,
        detail: `${type} is the leading violation with ${count} incidents (${pct}% of all violations). A focused training module on ${t.ppe} is strongly recommended.`,
        evidence: `${count} ${type} violations out of ${total} total (${pct}%).`,
        action: `Schedule a mandatory 1-hour session on ${t.topic} for all affected shifts within 2 weeks.`,
        dimension: 'type',
      });
    } else if (count >= RULES.typeModerate) {
      recs.push({
        priority: 'medium',
        icon: t.icon,
        title: `Refresher: ${t.topic}`,
        detail: `${count} ${type} incidents (${pct}%). A short refresher on ${t.ppe} would reduce recurrence.`,
        evidence: `${count} ${type} violations (${pct}% of total).`,
        action: `Add ${t.ppe} reminder to the next toolbox talk.`,
        dimension: 'type',
      });
    }
  });

  // ── Dimension 2: zone / area patterns ────────────────────────
  const byZone = {};
  violations.forEach(v => {
    const zone = v.area_name || v.zone_name || 'Unassigned Zone';
    byZone[zone] = (byZone[zone] || 0) + 1;
  });
  const sortedZones = Object.entries(byZone).sort((a, b) => b[1] - a[1]);

  sortedZones.forEach(([zone, count]) => {
    if (zone === 'Unassigned Zone') return;
    const pct = Math.round((count / total) * 100);

    // what's the top violation type in this zone?
    const zoneTypes = {};
    violations.filter(v => (v.area_name || v.zone_name) === zone)
      .forEach(v => { zoneTypes[v.violation_type] = (zoneTypes[v.violation_type] || 0) + 1; });
    const topType = Object.entries(zoneTypes).sort((a, b) => b[1] - a[1])[0];

    if (count >= RULES.zoneCritical) {
      recs.push({
        priority: 'high',
        icon: '📍',
        title: `Zone intervention: ${zone}`,
        detail: `${zone} is the highest-risk area with ${count} violations (${pct}% of total). The dominant issue is ${topType ? topType[0] : 'mixed PPE'}. This zone needs an on-site safety walkthrough and supervisor briefing.`,
        evidence: `${count} violations in ${zone}${topType ? `, led by ${topType[0]} (${topType[1]})` : ''}.`,
        action: `Conduct a zone-specific safety audit of ${zone} and assign a dedicated safety marshal for 30 days.`,
        dimension: 'zone',
      });
    } else if (count >= RULES.zoneHigh) {
      recs.push({
        priority: 'medium',
        icon: '📍',
        title: `Watch zone: ${zone}`,
        detail: `${zone} recorded ${count} violations (${pct}%)${topType ? `, mostly ${topType[0]}` : ''}. Increased monitoring recommended.`,
        evidence: `${count} violations in ${zone}.`,
        action: `Post PPE signage at ${zone} entry and brief the zone supervisor.`,
        dimension: 'zone',
      });
    }
  });

  // ── Dimension 3: time / shift patterns ───────────────────────
  const byShift = { Morning: 0, General: 0, Evening: 0, Night: 0 };
  const byDow   = [0,0,0,0,0,0,0]; // Sun..Sat
  violations.forEach(v => {
    const d = new Date(v.occurred_at);
    byShift[shiftOf(d.getHours())]++;
    byDow[d.getDay()]++;
  });

  // shift concentration per type
  sortedTypes.slice(0, 3).forEach(([type, typeTotal]) => {
    const perShift = { Morning:0, General:0, Evening:0, Night:0 };
    violations.filter(v => v.violation_type === type)
      .forEach(v => { perShift[shiftOf(new Date(v.occurred_at).getHours())]++; });
    const worst = Object.entries(perShift).sort((a,b)=>b[1]-a[1])[0];
    if (worst && typeTotal > 0 && (worst[1] / typeTotal) >= RULES.shiftConcentration && worst[1] >= 8) {
      const t = TRAINING_TOPIC[type] || { topic: type };
      const sharePct = Math.round((worst[1] / typeTotal) * 100);
      recs.push({
        priority: 'medium',
        icon: '🕐',
        title: `Shift-targeted briefing: ${worst[0]} shift`,
        detail: `${sharePct}% of ${type} violations occur during the ${worst[0]} shift (${worst[1]} of ${typeTotal}). A pre-shift safety briefing for this shift would be most effective.`,
        evidence: `${worst[1]}/${typeTotal} ${type} violations in ${worst[0]} shift (${sharePct}%).`,
        action: `Add a 5-minute ${t.topic} reminder at the start of every ${worst[0]} shift.`,
        dimension: 'time',
      });
    }
  });

  // worst day of week
  const dowNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const worstDow = byDow.map((n,i)=>[dowNames[i],n]).sort((a,b)=>b[1]-a[1])[0];
  if (worstDow && worstDow[1] >= Math.max(10, total * 0.25)) {
    recs.push({
      priority: 'low',
      icon: '📅',
      title: `${worstDow[0]} shows elevated violations`,
      detail: `${worstDow[0]} accounts for ${worstDow[1]} violations (${Math.round(worstDow[1]/total*100)}% of the period). Often linked to start-of-week complacency or post-weekend equipment checks.`,
      evidence: `${worstDow[1]} violations on ${worstDow[0]}s.`,
      action: `Front-load safety reminders on ${worstDow[0]} mornings.`,
      dimension: 'time',
    });
  }

  // ── sort: high → medium → low → info ─────────────────────────
  const order = { high: 0, medium: 1, low: 2, info: 3 };
  recs.sort((a, b) => order[a.priority] - order[b.priority]);

  return recs;
}

function summarise(violations) {
  const total = violations.length;
  const byShift = { Morning: 0, General: 0, Evening: 0, Night: 0 };
  violations.forEach(v => { byShift[shiftOf(new Date(v.occurred_at).getHours())]++; });
  const topType = (() => {
    const m = {}; violations.forEach(v => m[v.violation_type]=(m[v.violation_type]||0)+1);
    return Object.entries(m).sort((a,b)=>b[1]-a[1])[0];
  })();
  return {
    total,
    by_shift: byShift,
    top_type: topType ? { type: topType[0], count: topType[1] } : null,
  };
}

module.exports = { generateRecommendations, summarise, RULES };
