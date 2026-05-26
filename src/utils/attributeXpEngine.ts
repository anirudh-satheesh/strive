import type {
  PerformanceAttribute,
  PerformanceEvent,
} from '../types';

export type AttributeProgress = {
  xp: number;
  level: number;
  tier: number;
};

export type AttributeProgressMap = Record<PerformanceAttribute, AttributeProgress>;

export type AttributeXpGain = Record<PerformanceAttribute, number>;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const ATTRIBUTES: PerformanceAttribute[] = [
  'strength',
  'consistency',
  'mobility',
  'endurance',
  'skill',
  'recovery',
];

const getLatestEventIntensity = (events: PerformanceEvent[], attribute: PerformanceAttribute) => {
  // latest by timestamp (stable fallback: last in array)
  let latest: PerformanceEvent | null = null;
  let latestT = -Infinity;
  for (const e of events) {
    if (e.attribute !== attribute) continue;
    const t = new Date(e.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= latestT) {
      latestT = t;
      latest = e;
    }
  }
  return latest ? latest.intensity : 0;
};

/**
 * Nonlinear progression curve: XP required per level.
 * Level starts at 1.
 */
export const xpRequiredForLevel = (level: number): number => {
  const L = Math.max(1, level);
  // Tuned to be steep enough to prevent easy infinite grinding.
  // Base: 100, grows ~quadratically with a soft cap.
  const base = 100;
  const growth = 1 + 0.6 * (L - 1) / 6; // ~1.0..1.5 by L=7
  const nonlinear = Math.pow(L, 1.35);
  const raw = base * (nonlinear / Math.pow(1, 1.35)) * growth;
  return Math.round(raw);
};

const computeTierFromLevel = (level: number): number => {
  // Tier 1..6
  // Spreads levels across the curve.
  if (level < 3) return 1;
  if (level < 6) return 2;
  if (level < 10) return 3;
  if (level < 16) return 4;
  if (level < 24) return 5;
  return 6;
};

const totalXpFromLevel = (targetLevel: number): number => {
  // total XP required to reach targetLevel (inclusive level-up boundaries)
  // For example: level=1 => 0 XP needed (already at level 1).
  if (targetLevel <= 1) return 0;
  let sum = 0;
  for (let l = 1; l < targetLevel; l++) {
    sum += xpRequiredForLevel(l);
  }
  return sum;
};

export const getLevelFromTotalXp = (xp: number): { level: number; progressToNext: number } => {
  const safeXp = Math.max(0, xp);

  let level = 1;
  // Simple bounded iteration; XP won't explode due to clamp in gain computation.
  while (true) {
    const nextLevel = level + 1;
    const xpNeededForNext = totalXpFromLevel(nextLevel);
    if (safeXp >= xpNeededForNext) {
      level = nextLevel;
      continue;
    }
    break;
  }

  const xpAtLevel = totalXpFromLevel(level);
  const xpAtNext = totalXpFromLevel(level + 1);
  const denom = Math.max(1, xpAtNext - xpAtLevel);
  const progressToNext = clamp01((safeXp - xpAtLevel) / denom);

  return { level, progressToNext };
};

/**
 * Diminishing returns / repeat penalty:
 * If the latest intensity for an attribute is close to its historical average, XP efficiency lowers.
 */
const computeDiminishingEfficiency = (events: PerformanceEvent[], attribute: PerformanceAttribute) => {
  const relevant = events.filter(e => e.attribute === attribute);
  if (relevant.length < 2) return 1;

  const intensities = relevant.map(e => clamp01(e.intensity));
  const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const latest = getLatestEventIntensity(events, attribute);

  // similarity in intensity => penalty
  const similarity = clamp01(1 - Math.abs(latest - avg)); // 1 when equal

  // efficiency multiplier 1.0..0.65
  return 1 - similarity * 0.35;
};

const computeBalanceBonus = (events: PerformanceEvent[]) => {
  // Reward balanced training: when attribute signals are spread, bonus goes up.
  // Use intensity distribution across attributes.
  const intensities = ATTRIBUTES.map(a => {
    const rel = events.filter(e => e.attribute === a);
    if (rel.length === 0) return 0;
    const mean = rel.reduce((s, e) => s + clamp01(e.intensity), 0) / rel.length;
    return mean;
  });

  const nonZero = intensities.filter(v => v > 0);
  if (nonZero.length <= 1) return 0.0;

  const max = Math.max(...intensities);
  const min = Math.min(...intensities);
  const spread = max - min;

  // if spread is huge => less balance bonus
  const balanceQuality = clamp01(1 - spread * 0.8);
  // 0..0.18
  return balanceQuality * 0.18;
};

const computeOverloadBonus = (events: PerformanceEvent[]) => {
  // Reward higher intensity relative to recovery costs for each attr.
  const relevant = events.filter(e => e.attribute !== 'recovery');
  if (relevant.length === 0) return 0;

  let ratioSum = 0;
  let n = 0;
  for (const e of relevant) {
    const intensity = clamp01(e.intensity);
    const cost = clamp01(e.recoveryCost);
    const ratio = clamp01(intensity - cost * 0.5);
    ratioSum += ratio;
    n++;
  }
  const avgRatio = ratioSum / Math.max(1, n);
  // 0..0.16
  return avgRatio * 0.16;
};

const computeRecoveryQualityBonus = (events: PerformanceEvent[]) => {
  const recoveryEvents = events.filter(e => e.attribute === 'recovery');
  if (recoveryEvents.length === 0) return 0;

  // recovery event intensity indicates recovery work quality; scale lightly
  const avgRec = recoveryEvents.reduce((s, e) => s + clamp01(e.intensity), 0) / recoveryEvents.length;
  // also reduce bonus if recoveryCost-heavy fatigue is present recently
  const fatigueProxy = events.filter(e => e.recoveryCost > 0.001).reduce((s, e) => s + clamp01(e.recoveryCost), 0);
  const fatiguePenalty = clamp01(fatigueProxy / Math.max(1, events.length));

  const q = clamp01(avgRec * (1 - fatiguePenalty * 0.65));
  // 0..0.18
  return q * 0.18;
};

const computeMobilityConsistencyBonus = (events: PerformanceEvent[]) => {
  const mobilityEvents = events.filter(e => e.attribute === 'mobility');
  if (mobilityEvents.length < 3) return 0;

  const intensities = mobilityEvents.map(e => clamp01(e.intensity));
  const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const max = Math.max(...intensities);
  const min = Math.min(...intensities);
  const stability = clamp01(1 - (max - min) * 0.9);

  // favor stable, non-zero intensity
  return clamp01(avg * 0.7 + stability * 0.3) * 0.12;
};

const computeEnduranceAdaptationBonus = (events: PerformanceEvent[]) => {
  const endEvents = events.filter(e => e.attribute === 'endurance');
  if (endEvents.length < 2) return 0;

  const intensities = endEvents.map(e => clamp01(e.intensity));
  // measure improvement: latest vs first
  const sorted = [...endEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const first = intensities[0];
  const latest = sorted.length ? clamp01(sorted[sorted.length - 1].intensity) : 0;
  const delta = clamp01(latest - first);

  // 0..0.14
  return (delta * 0.14) + (clamp01((first + latest) / 2) * 0.06);
};

/**
 * Main gain calculator. Returns per-attribute XP delta for the provided workouts/events window.
 */
export const calculateAttributeXpGainsFromEvents = (events: PerformanceEvent[]): AttributeXpGain => {
  const gains: Partial<AttributeXpGain> = {};

  // base XP mapping: intensity -> XP
  // We'll aggregate events per attribute.
  for (const attr of ATTRIBUTES) {
    const rel = events.filter(e => e.attribute === attr);
    if (rel.length === 0) {
      gains[attr] = 0;
      continue;
    }

    const meanIntensity = rel.reduce((s, e) => s + clamp01(e.intensity), 0) / rel.length;

    // base XP scales with mean intensity and event count, capped.
    const base = meanIntensity * rel.length * 40;

    // diminishing returns
    const efficiency = computeDiminishingEfficiency(events, attr);

    gains[attr] = Math.round(base * efficiency);
  }

  // Intelligent bonuses (global multipliers)
  const balanceBonus = computeBalanceBonus(events);
  const overloadBonus = computeOverloadBonus(events);
  const recoveryQuality = computeRecoveryQualityBonus(events);
  const mobilityConsistency = computeMobilityConsistencyBonus(events);
  const enduranceAdaptation = computeEnduranceAdaptationBonus(events);

  // apply bonuses across attributes with attribute-specific weights
  const withBonuses: AttributeXpGain = {
    strength: 0,
    consistency: 0,
    mobility: 0,
    endurance: 0,
    skill: 0,
    recovery: 0,
  };

  for (const attr of ATTRIBUTES) {
    const g = gains[attr] ?? 0;

    let bonusWeight = 0.0;
    if (attr === 'strength') bonusWeight += overloadBonus * 0.9 + balanceBonus * 0.3;
    if (attr === 'endurance') bonusWeight += overloadBonus * 0.8 + enduranceAdaptation * 0.9 + balanceBonus * 0.25;
    if (attr === 'mobility') bonusWeight += mobilityConsistency * 1.0 + balanceBonus * 0.3 + recoveryQuality * 0.25;
    if (attr === 'consistency') bonusWeight += balanceBonus * 0.8 + overloadBonus * 0.15;
    if (attr === 'recovery') bonusWeight += recoveryQuality * 1.0 + balanceBonus * 0.2;
    if (attr === 'skill') bonusWeight += balanceBonus * 0.35 + overloadBonus * 0.2;

    const multiplier = 1 + bonusWeight;
    withBonuses[attr] = Math.round(g * multiplier);
  }

  return withBonuses;
};

export const applyAttributeXpToProgress = (
  current: AttributeProgressMap,
  gains: AttributeXpGain
): AttributeProgressMap => {
  const next: Partial<AttributeProgressMap> = {};

  for (const attr of ATTRIBUTES) {
    const cur = current[attr] ?? { xp: 0, level: 1, tier: 1 };
    const newXp = Math.max(0, cur.xp + (gains[attr] ?? 0));
    const { level } = getLevelFromTotalXp(newXp);
    next[attr] = {
      xp: newXp,
      level,
      tier: computeTierFromLevel(level),
    };
  }

  return next as AttributeProgressMap;
};

export const createEmptyProgress = (): AttributeProgressMap => {
  const base: Partial<AttributeProgressMap> = {};
  for (const attr of ATTRIBUTES) {
    base[attr] = { xp: 0, level: 1, tier: 1 };
  }
  return base as AttributeProgressMap;
};

