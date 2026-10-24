import type { Season } from "./fragrance";

export const WEATHER_CONDITIONS = ["clear", "cloudy", "fog", "rain", "snow", "storm"] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

export const TIMES_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export interface WeatherSnapshot {
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  temperatureC: number;
  apparentTemperatureC: number;
  humidity: number;
  condition: WeatherCondition;
  description: string;
  isDay: boolean;
  windKph: number;
  observedAt: string;
  season: Season;
  source: "open-meteo" | "demo";
}
