import { hashString, lognormal, mulberry32, pickWeighted, type Rng } from './rng';
import type { Segment, SegmentMix, VWResponse } from './types';

/** Survey respondents round their answers the way people do. */
function humanRound(x: number): number {
  if (x < 20) return Math.max(1, Math.round(x));
  if (x < 60) return Math.round(x);
  if (x < 250) return Math.round(x / 5) * 5;
  return Math.round(x / 25) * 25;
}

/**
 * One respondent: a lognormal reference price for their segment, then four
 * answers as noisy multiples of it, sorted so too cheap < cheap < expensive < too expensive.
 */
export function makeRespondent(
  rng: Rng,
  segment: Segment,
  anchors: Record<Segment, number>,
  id: string,
  submittedAt: string,
  source: VWResponse['source'] = 'link',
): VWResponse {
  const ref = lognormal(rng, anchors[segment], 0.28);
  const raw = [
    ref * lognormal(rng, 0.56, 0.14),
    ref * lognormal(rng, 0.8, 0.1),
    ref * lognormal(rng, 1.24, 0.1),
    ref * lognormal(rng, 1.62, 0.13),
  ]
    .map(humanRound)
    .sort((a, b) => a - b);
  // enforce strictly increasing answers after rounding
  for (let i = 1; i < 4; i++) {
    if (raw[i] <= raw[i - 1]) raw[i] = raw[i - 1] + (raw[i - 1] >= 60 ? 5 : 1);
  }
  return {
    id,
    segment,
    tooCheap: raw[0],
    cheap: raw[1],
    expensive: raw[2],
    tooExpensive: raw[3],
    submittedAt,
    source,
  };
}

export function generatePanel(
  seedKey: string,
  count: number,
  mix: SegmentMix,
  anchors: Record<Segment, number>,
  endTime: number,
  spanHours: number,
): VWResponse[] {
  const rng = mulberry32(hashString(seedKey));
  const out: VWResponse[] = [];
  for (let i = 0; i < count; i++) {
    const seg = pickWeighted(rng, mix);
    // spread submissions over the fielding window, front-loaded like real panels
    const t = endTime - spanHours * 3600_000 * Math.pow(1 - i / Math.max(1, count), 1.6);
    out.push(makeRespondent(rng, seg, anchors, `${seedKey}-r${i + 1}`, new Date(t).toISOString()));
  }
  return out;
}

/** Deterministic next respondent for a live study, keyed by study and index. */
export function nextRespondent(
  studyId: string,
  index: number,
  mix: SegmentMix,
  anchors: Record<Segment, number>,
): VWResponse {
  const rng = mulberry32(hashString(`${studyId}:${index}`));
  const seg = pickWeighted(rng, mix);
  return makeRespondent(rng, seg, anchors, `${studyId}-r${index + 1}`, new Date().toISOString());
}
