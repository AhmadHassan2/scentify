import "server-only";
import type { Fragrance, Occasion } from "@/types/fragrance";
import type { TodayResponseDTO } from "@/types/dto";
import type { TimeOfDay } from "@/types/weather";
import { toSummary } from "@/lib/fragrance/utils";
import type { Personalization } from "@/lib/personalization";
import { applyHardFilters, rankForContext, timeOfDayFromHour } from "@/lib/recommendation";
import { getWeather, type WeatherLookup } from "@/lib/weather";

export interface TodayInput {
  weather: WeatherLookup;
  occasion: Occasion | null;
  timeOfDay: TimeOfDay | null;
  desiredProjection: number | null;
  localHour?: number;
}

/** Shared by the "What should I wear today?" page and the assistant. */
export async function wearToday(input: TodayInput, p: Personalization, limit = 3): Promise<TodayResponseDTO> {
  const weather = await getWeather(input.weather);
  const timeOfDay =
    input.timeOfDay ??
    (input.localHour !== undefined ? timeOfDayFromHour(input.localHour) : weather.isDay ? "afternoon" : "evening");

  const owned = p.collection
    .map((c) => p.catalogIndex.get(c.fragranceId))
    .filter((f): f is Fragrance => !!f);
  const useCollection = owned.length > 0;
  const candidates = useCollection
    ? owned
    : applyHardFilters([...p.catalogIndex.values()], p.profile, { adjustments: p.adjustments }).eligible;

  const ranked = rankForContext(
    candidates,
    {
      temperatureC: weather.temperatureC,
      apparentTemperatureC: weather.apparentTemperatureC,
      humidity: weather.humidity,
      condition: weather.condition,
      season: weather.season,
      timeOfDay,
      occasion: input.occasion,
      desiredProjection: input.desiredProjection,
    },
    {
      profile: p.profile,
      adjustments: p.adjustments,
      collection: new Map(p.collection.map((c) => [c.fragranceId, c])),
    },
    limit,
  );

  let note: string | null = null;
  if (!useCollection) {
    note = p.user
      ? "Your collection is empty, so these come from the full catalog. Add fragrances you own for personal picks."
      : "Sign in and add fragrances you own to get picks from your own shelf. For now, these come from the catalog.";
  } else if (owned.length < 3) {
    note = "Add more fragrances to your collection for better day-to-day variety.";
  }

  return {
    weather,
    timeOfDay,
    source: useCollection ? "collection" : "catalog",
    picks: ranked.map((r) => ({
      fragrance: toSummary(r.fragrance),
      matchPercent: r.matchPercent,
      reasons: r.reasons,
      cautions: r.cautions,
      fromCollection: useCollection,
    })),
    note,
  };
}
