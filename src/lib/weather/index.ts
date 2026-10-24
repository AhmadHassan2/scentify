import "server-only";
import type { z } from "zod";
import type { WeatherSnapshot } from "@/types/weather";
import { weatherMode } from "@/lib/config";
import type { weatherLookupSchema } from "@/lib/validation/schemas";
import { demoWeather } from "./demo";
import { fetchCurrentWeather, geocodeCity, WeatherError } from "./open-meteo";

export { WeatherError };

export type WeatherLookup = z.infer<typeof weatherLookupSchema>;

/** Resolve weather from a city, user-approved coordinates, or a demo preset. */
export async function getWeather(lookup: WeatherLookup): Promise<WeatherSnapshot> {
  if (lookup.kind === "demo") return demoWeather(lookup.preset);
  if (weatherMode() === "demo") {
    throw new WeatherError("Live weather is turned off (WEATHER_MODE=demo). Choose an example forecast instead.", 409);
  }
  if (lookup.kind === "city") {
    const place = await geocodeCity(lookup.city);
    return fetchCurrentWeather(place.latitude, place.longitude, place.name);
  }
  // Round shared coordinates (~1 km) — we never need or keep an exact position.
  const lat = Math.round(lookup.latitude * 100) / 100;
  const lon = Math.round(lookup.longitude * 100) / 100;
  return fetchCurrentWeather(lat, lon, "Your location");
}
