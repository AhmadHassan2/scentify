import type { WeatherSnapshot } from "@/types/weather";

/** Example weather for development and for visitors who prefer not to share a location. */
export const DEMO_WEATHER_PRESETS: Record<string, Omit<WeatherSnapshot, "observedAt" | "source">> = {
  "summer-heat": {
    locationName: "Example: humid summer afternoon",
    latitude: null, longitude: null,
    temperatureC: 31, apparentTemperatureC: 35, humidity: 78,
    condition: "clear", description: "Hot and humid", isDay: true, windKph: 8, season: "summer",
  },
  "spring-rain": {
    locationName: "Example: rainy spring day",
    latitude: null, longitude: null,
    temperatureC: 13, apparentTemperatureC: 11, humidity: 88,
    condition: "rain", description: "Light rain", isDay: true, windKph: 14, season: "spring",
  },
  "autumn-crisp": {
    locationName: "Example: crisp autumn evening",
    latitude: null, longitude: null,
    temperatureC: 9, apparentTemperatureC: 6, humidity: 55,
    condition: "clear", description: "Clear and cool", isDay: false, windKph: 12, season: "autumn",
  },
  "winter-snow": {
    locationName: "Example: snowy winter night",
    latitude: null, longitude: null,
    temperatureC: -7, apparentTemperatureC: -13, humidity: 70,
    condition: "snow", description: "Snow", isDay: false, windKph: 18, season: "winter",
  },
  "mild-cloudy": {
    locationName: "Example: mild, overcast day",
    latitude: null, longitude: null,
    temperatureC: 18, apparentTemperatureC: 18, humidity: 60,
    condition: "cloudy", description: "Overcast", isDay: true, windKph: 10, season: "spring",
  },
};

export const DEMO_PRESET_LABELS: Record<string, string> = {
  "summer-heat": "Hot & humid",
  "spring-rain": "Rainy spring",
  "autumn-crisp": "Crisp autumn",
  "winter-snow": "Snowy winter",
  "mild-cloudy": "Mild & cloudy",
};

export function demoWeather(preset: string): WeatherSnapshot {
  const base = DEMO_WEATHER_PRESETS[preset] ?? DEMO_WEATHER_PRESETS["mild-cloudy"];
  return { ...base, observedAt: new Date().toISOString(), source: "demo" };
}
