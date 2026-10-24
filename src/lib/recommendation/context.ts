import type { Fragrance, Occasion, Season } from "@/types/fragrance";
import type { CollectionItem, PreferenceAdjustments, PreferenceProfile } from "@/types/preferences";
import type { TimeOfDay, WeatherCondition } from "@/types/weather";
import { OCCASION_META } from "@/lib/fragrance/taxonomy";
import { clamp } from "@/lib/fragrance/utils";
import { scoreScent, projectionFit } from "./scoring";

/**
 * Context-aware scoring for "What should I wear today?". Reuses the same
 * fragrance attributes as the main engine and adds weather, time and occasion.
 */

export interface WearContext {
  temperatureC: number;
  /** "Feels like" temperature; used for scoring when provided. */
  apparentTemperatureC?: number;
  humidity: number;
  condition: WeatherCondition;
  season: Season;
  timeOfDay: TimeOfDay;
  occasion: Occasion | null;
  /** 1–5, same scale as PreferenceProfile.strength. */
  desiredProjection: number | null;
}

export interface ContextScore {
  fragrance: Fragrance;
  score: number;
  matchPercent: number;
  components: {
    temperature: number;
    occasion: number;
    conditions: number;
    timeOfDay: number;
    projection: number;
    personal: number;
  };
  reasons: string[];
  cautions: string[];
}

export const CONTEXT_WEIGHTS = {
  temperature: 0.3,
  occasion: 0.25,
  conditions: 0.1,
  timeOfDay: 0.1,
  projection: 0.1,
  personal: 0.15,
};

/** Temperature anchors → how much each season's suitability applies. */
const TEMP_ANCHORS: Array<[number, Record<Season, number>]> = [
  [-5, { winter: 1, autumn: 0, spring: 0, summer: 0 }],
  [5, { winter: 0.6, autumn: 0.4, spring: 0, summer: 0 }],
  [12, { winter: 0, autumn: 0.55, spring: 0.45, summer: 0 }],
  [20, { winter: 0, autumn: 0.15, spring: 0.5, summer: 0.35 }],
  [28, { winter: 0, autumn: 0, spring: 0, summer: 1 }],
];

export function temperatureSeasonWeights(tempC: number): Record<Season, number> {
  if (tempC <= TEMP_ANCHORS[0][0]) return TEMP_ANCHORS[0][1];
  const last = TEMP_ANCHORS[TEMP_ANCHORS.length - 1];
  if (tempC >= last[0]) return last[1];
  for (let i = 0; i < TEMP_ANCHORS.length - 1; i++) {
    const [t0, w0] = TEMP_ANCHORS[i];
    const [t1, w1] = TEMP_ANCHORS[i + 1];
    if (tempC >= t0 && tempC <= t1) {
      const t = (tempC - t0) / (t1 - t0);
      return {
        winter: w0.winter + (w1.winter - w0.winter) * t,
        autumn: w0.autumn + (w1.autumn - w0.autumn) * t,
        spring: w0.spring + (w1.spring - w0.spring) * t,
        summer: w0.summer + (w1.summer - w0.summer) * t,
      };
    }
  }
  return last[1];
}

export function temperatureFit(f: Fragrance, tempC: number): number {
  const w = temperatureSeasonWeights(tempC);
  return clamp(
    w.winter * f.seasons.winter +
      w.autumn * f.seasons.autumn +
      w.spring * f.seasons.spring +
      w.summer * f.seasons.summer,
  );
}

export function conditionsFit(f: Fragrance, ctx: WearContext): number {
  const a = f.attributes;
  let fit = 0.75;
  const hotHumid = ctx.temperatureC >= 22 && ctx.humidity >= 70;
  if (hotHumid) {
    // Humid heat amplifies sweetness and density; crisp scents stay pleasant.
    fit -= Math.max(0, a.sweetness - 5) * 0.07 + Math.max(0, f.projection - 6) * 0.05;
    fit += Math.max(0, a.freshness - 6) * 0.05;
  }
  if (ctx.condition === "rain" || ctx.condition === "fog") {
    fit += (Math.max(a.woodiness, a.greenness, a.freshness) - 5) * 0.04;
  }
  if (ctx.condition === "snow" || ctx.temperatureC <= 0) {
    fit += (a.warmth - 5) * 0.05;
  }
  if (ctx.humidity <= 30 && ctx.temperatureC < 10) {
    // Dry cold air mutes scent; richer bases carry better.
    fit += (f.longevity - 6) * 0.03;
  }
  return clamp(fit);
}

export function timeOfDayFit(f: Fragrance, time: TimeOfDay): number {
  if (time === "morning") return f.timeOfDay.day;
  if (time === "afternoon") return 0.8 * f.timeOfDay.day + 0.2 * f.timeOfDay.night;
  if (time === "evening") return 0.3 * f.timeOfDay.day + 0.7 * f.timeOfDay.night;
  return f.timeOfDay.night;
}

const QUIET_OCCASIONS: Occasion[] = ["work", "school", "gym"];

export interface PersonalContext {
  profile?: PreferenceProfile;
  adjustments?: PreferenceAdjustments;
  collection?: Map<string, CollectionItem>;
}

export function scoreForContext(
  f: Fragrance,
  ctx: WearContext,
  personal: PersonalContext = {},
): ContextScore {
  const reasons: string[] = [];
  const cautions: string[] = [];

  const temperature = temperatureFit(f, ctx.apparentTemperatureC ?? ctx.temperatureC);
  const occasion = ctx.occasion ? f.occasions[ctx.occasion] : 0.7;
  const conditions = conditionsFit(f, ctx);
  const time = timeOfDayFit(f, ctx.timeOfDay);

  let projection = ctx.desiredProjection ? projectionFit(f.projection, ctx.desiredProjection) : 0.7;
  if (ctx.occasion && QUIET_OCCASIONS.includes(ctx.occasion) && f.projection > 7) {
    projection -= (f.projection - 7) * 0.15;
    cautions.push(`Strong projection for ${OCCASION_META[ctx.occasion].label.toLowerCase()} — go light on sprays`);
  }
  projection = clamp(projection);

  const item = personal.collection?.get(f.id);
  let personalScore = 0.6;
  if (item) {
    personalScore = 0.55 + (item.isFavorite ? 0.2 : 0) + (item.rating ? (item.rating - 3) * 0.1 : 0);
  } else if (personal.profile) {
    personalScore = scoreScent(f, personal.profile, personal.adjustments).score;
  }
  personalScore = clamp(personalScore);

  const components = { temperature, occasion, conditions, timeOfDay: time, projection, personal: personalScore };
  const w = { ...CONTEXT_WEIGHTS };
  if (!ctx.occasion) w.occasion = 0;
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  const score =
    (w.temperature * temperature +
      w.occasion * occasion +
      w.conditions * conditions +
      w.timeOfDay * time +
      w.projection * projection +
      w.personal * personalScore) /
    total;

  // Reasons
  const t = Math.round(ctx.temperatureC);
  const feels = ctx.apparentTemperatureC ?? ctx.temperatureC;
  if (temperature >= 0.75) {
    if (feels >= 24) reasons.push(`Stays bright and comfortable at ${t}°C`);
    else if (feels <= 5) reasons.push(`Warm enough to bloom in ${t}°C cold`);
    else reasons.push(`Well suited to today's ${t}°C`);
  } else if (temperature < 0.4) {
    cautions.push(feels >= 22 ? `May feel heavy at ${t}°C` : `May feel thin at ${t}°C`);
  }
  if (ctx.occasion && occasion >= 0.75) reasons.push(`A strong choice for ${OCCASION_META[ctx.occasion].label.toLowerCase()}`);
  else if (ctx.occasion && occasion < 0.4) cautions.push(`Not a natural fit for ${OCCASION_META[ctx.occasion].label.toLowerCase()}`);
  if (ctx.temperatureC >= 22 && ctx.humidity >= 70 && f.attributes.freshness >= 7) {
    reasons.push(`Crisp enough for ${ctx.humidity}% humidity`);
  } else if (ctx.temperatureC >= 22 && ctx.humidity >= 70 && f.attributes.sweetness >= 6.5) {
    cautions.push("Humidity will amplify its sweetness");
  }
  if ((ctx.condition === "rain" || ctx.condition === "fog") && conditions >= 0.8) {
    reasons.push("Its woods and greens suit a grey, damp day");
  }
  if (ctx.condition === "snow" && f.attributes.warmth >= 6) reasons.push("Cozy warmth for a snowy day");
  if (time >= 0.75) {
    reasons.push(ctx.timeOfDay === "evening" || ctx.timeOfDay === "night" ? "Made for the evening" : "Easy daytime character");
  }
  if (item?.isFavorite) reasons.push("One of your favourites");
  else if (item?.rating && item.rating >= 4) reasons.push(`You rated it ${item.rating}/5`);
  else if (!item && personal.profile && personalScore >= 0.75) reasons.push("Close to your taste profile");

  return {
    fragrance: f,
    score,
    matchPercent: Math.round(score * 100),
    components,
    reasons: reasons.slice(0, 4),
    cautions: cautions.slice(0, 2),
  };
}

export function rankForContext(
  fragrances: Fragrance[],
  ctx: WearContext,
  personal: PersonalContext = {},
  limit = 3,
): ContextScore[] {
  return fragrances
    .map((f) => scoreForContext(f, ctx, personal))
    .sort((a, b) => b.score - a.score || b.fragrance.rating - a.fragrance.rating)
    .slice(0, limit);
}

export function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

/** Meteorological season from date and hemisphere. */
export function seasonFor(date: Date, latitude: number | null = 45): Season {
  const month = date.getUTCMonth();
  const northern: Season[] = [
    "winter", "winter", "spring", "spring", "spring", "summer",
    "summer", "summer", "autumn", "autumn", "autumn", "winter",
  ];
  const season = northern[month];
  if (latitude !== null && latitude < 0) {
    const flip: Record<Season, Season> = { winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" };
    return flip[season];
  }
  return season;
}
