import "server-only";
import type { WeatherCondition, WeatherSnapshot } from "@/types/weather";
import { seasonFor } from "@/lib/recommendation/context";

/**
 * Open-Meteo (https://open-meteo.com): free, keyless weather + geocoding.
 * We only ever query a city the user typed or coordinates the user explicitly
 * shared via the browser permission prompt — never IP geolocation.
 */

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export class WeatherError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

/** WMO weather interpretation codes → our coarse conditions. */
export function conditionFromWmo(code: number): { condition: WeatherCondition; description: string } {
  if (code === 0) return { condition: "clear", description: "Clear sky" };
  if (code <= 2) return { condition: "clear", description: "Mostly clear" };
  if (code === 3) return { condition: "cloudy", description: "Overcast" };
  if (code === 45 || code === 48) return { condition: "fog", description: "Fog" };
  if (code >= 51 && code <= 57) return { condition: "rain", description: "Drizzle" };
  if (code >= 61 && code <= 67) return { condition: "rain", description: "Rain" };
  if (code >= 71 && code <= 77) return { condition: "snow", description: "Snow" };
  if (code >= 80 && code <= 82) return { condition: "rain", description: "Rain showers" };
  if (code === 85 || code === 86) return { condition: "snow", description: "Snow showers" };
  if (code >= 95) return { condition: "storm", description: "Thunderstorm" };
  return { condition: "cloudy", description: "Cloudy" };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 600 } });
  if (!res.ok) throw new WeatherError(`Weather service responded with ${res.status}`);
  return (await res.json()) as T;
}

export async function geocodeCity(city: string) {
  const data = await fetchJson<{
    results?: Array<{ name: string; latitude: number; longitude: number; country?: string; admin1?: string }>;
  }>(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const hit = data.results?.[0];
  if (!hit) throw new WeatherError(`We couldn't find "${city}". Try a nearby larger city.`, 404);
  return {
    name: [hit.name, hit.admin1, hit.country].filter(Boolean).join(", "),
    latitude: hit.latitude,
    longitude: hit.longitude,
  };
}

export async function fetchCurrentWeather(latitude: number, longitude: number, locationName: string): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m",
    timezone: "auto",
  });
  const data = await fetchJson<{
    current?: {
      time: string;
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      weather_code: number;
      is_day: number;
      wind_speed_10m: number;
    };
  }>(`${FORECAST_URL}?${params}`);
  const c = data.current;
  if (!c) throw new WeatherError("Weather data was incomplete. Please try again.");
  const { condition, description } = conditionFromWmo(c.weather_code);
  return {
    locationName,
    latitude,
    longitude,
    temperatureC: c.temperature_2m,
    apparentTemperatureC: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    condition,
    description,
    isDay: c.is_day === 1,
    windKph: c.wind_speed_10m,
    observedAt: c.time,
    season: seasonFor(new Date(), latitude),
    source: "open-meteo",
  };
}
