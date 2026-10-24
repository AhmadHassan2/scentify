"use client";

import * as React from "react";
import Link from "next/link";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  LocateFixed,
  Loader2,
  MapPin,
  Search,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import type { TodayResponseDTO } from "@/types/dto";
import { OCCASIONS, type Occasion } from "@/types/fragrance";
import { TIMES_OF_DAY, type TimeOfDay, type WeatherCondition } from "@/types/weather";
import { useApp } from "@/components/providers/app-provider";
import { FragranceCard } from "@/components/fragrance/fragrance-card";
import { Button } from "@/components/ui/button";
import { Badge, Card, Chip, Input } from "@/components/ui/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { ErrorState } from "@/components/ui/states";
import { apiPost } from "@/lib/client/api";
import { useApiQuery } from "@/hooks/use-api-query";
import { setLocalValue, useLocalStorageValue } from "@/hooks/use-local-storage";
import { OCCASION_META, SEASON_META, STRENGTH_LABELS } from "@/lib/fragrance/taxonomy";
import { DEMO_PRESET_LABELS } from "@/lib/weather/demo";

type Source = { kind: "city"; city: string } | { kind: "coords"; latitude: number; longitude: number } | { kind: "demo"; preset: string };

const CONDITION_ICON: Record<WeatherCondition, React.ComponentType<{ className?: string }>> = {
  clear: Sun, cloudy: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning,
};
const TIME_LABEL: Record<TimeOfDay, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };
const CITY_KEY = "scentiq.today.city";

export function TodayView() {
  const { ready, personalization, config, collection, user } = useApp();
  const live = config?.weatherMode !== "demo";
  // A city remembered on this device becomes the default source (live mode only).
  const remembered = useLocalStorageValue<string | null>(CITY_KEY, null);
  const rememberedCity = live ? remembered : null;
  const [tabChoice, setTab] = React.useState<"city" | "location" | "demo" | null>(null);
  const [cityDraft, setCityInput] = React.useState<string | null>(null);
  const [sourceChoice, setSource] = React.useState<Source | null>(null);
  const [occasion, setOccasion] = React.useState<Occasion | null>(null);
  const [timeOfDay, setTimeOfDay] = React.useState<TimeOfDay | null>(null);
  const [projection, setProjection] = React.useState<number | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);

  const source: Source = sourceChoice ?? (rememberedCity ? { kind: "city", city: rememberedCity } : { kind: "demo", preset: "mild-cloudy" });
  const tab = tabChoice ?? (rememberedCity ? "city" : "demo");
  const cityInput = cityDraft ?? rememberedCity ?? "";

  const [localHour] = React.useState(() => new Date().getHours());
  const body = { weather: source, occasion, timeOfDay, desiredProjection: projection, localHour, ...personalization };
  const query = useApiQuery<TodayResponseDTO>(
    ready ? JSON.stringify({ body, col: collection.length }) : null,
    (signal) => apiPost("/api/today", body, { signal }),
  );
  const data = query.data ?? null;
  const loading = query.loading;
  const error = geoError ?? query.error;

  const submitCity = (e: React.FormEvent) => {
    e.preventDefault();
    const city = cityInput.trim();
    if (city.length < 2) return;
    setLocalValue(CITY_KEY, city);
    setGeoError(null);
    setSource({ kind: "city", city });
  };

  const useLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser doesn't support location. Enter a city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setGeoError(null);
        setSource({ kind: "coords", latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoError("Location permission was declined. Enter a city instead — we never guess your location.");
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  };

  const w = data?.weather;
  const CondIcon = w ? CONDITION_ICON[w.condition] : Sun;

  return (
    <div className="space-y-10">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <p className="eyebrow mb-4">Today&apos;s weather</p>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList aria-label="Weather source" className="mb-5 w-fit">
              {live && <TabsTrigger value="city">City</TabsTrigger>}
              {live && <TabsTrigger value="location">My location</TabsTrigger>}
              <TabsTrigger value="demo">Example weather</TabsTrigger>
            </TabsList>
            {live && (
              <TabsContent value="city">
                <form onSubmit={submitCity} className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-dim" />
                    <Input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder="e.g. Toronto" aria-label="City" className="pl-11" />
                  </div>
                  <Button type="submit"><Search /> Check</Button>
                </form>
                <p className="mt-2 text-xs text-dim">Live conditions from Open-Meteo. Your city is remembered on this device only.</p>
              </TabsContent>
            )}
            {live && (
              <TabsContent value="location">
                <Button variant="secondary" onClick={useLocation} disabled={locating}>
                  {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Use my current location
                </Button>
                <p className="mt-2 text-xs leading-relaxed text-dim">
                  Only with your browser&apos;s permission. Coordinates are rounded to about 1 km and used once to fetch weather. They&apos;re never stored.
                </p>
              </TabsContent>
            )}
            <TabsContent value="demo">
              <div className="flex flex-wrap gap-2">
                {Object.entries(DEMO_PRESET_LABELS).map(([id, label]) => (
                  <Chip key={id} selected={source.kind === "demo" && source.preset === id} onClick={() => { setGeoError(null); setSource({ kind: "demo", preset: id }); }}>
                    {label}
                  </Chip>
                ))}
              </div>
              {!live && <p className="mt-3 text-xs text-dim">Live weather is disabled in this environment (WEATHER_MODE=demo).</p>}
            </TabsContent>
          </Tabs>

          <div className="mt-6 min-h-28 border-t border-ivory/[0.07] pt-6" aria-live="polite">
            {w ? (
              <div className="flex items-center gap-5">
                <div className="grid size-16 place-items-center rounded-2xl bg-champagne/[0.08] ring-1 ring-champagne/20">
                  <CondIcon className="size-8 text-champagne" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-mist">{w.locationName}</p>
                  <p className="font-display text-5xl leading-none text-ivory">{Math.round(w.temperatureC)}°C</p>
                  <p className="mt-1 text-sm text-parchment">{w.description} · {SEASON_META[w.season].label}</p>
                </div>
                <dl className="hidden space-y-1 text-xs text-mist sm:block">
                  <div className="flex items-center gap-1.5"><Thermometer className="size-3.5" /> Feels {Math.round(w.apparentTemperatureC)}°</div>
                  <div className="flex items-center gap-1.5"><Droplets className="size-3.5" /> {Math.round(w.humidity)}% humidity</div>
                  <div className="flex items-center gap-1.5"><Wind className="size-3.5" /> {Math.round(w.windKph)} km/h</div>
                </dl>
              </div>
            ) : loading ? (
              <div className="skeleton h-20 rounded-2xl" />
            ) : null}
            {w?.source === "demo" && <Badge variant="demo" className="mt-4">Example weather</Badge>}
          </div>
        </Card>

        <Card className="space-y-6 p-6">
          <div>
            <p className="eyebrow mb-3">Occasion</p>
            <div className="flex flex-wrap gap-2">
              <Chip selected={occasion === null} onClick={() => setOccasion(null)}>Any</Chip>
              {OCCASIONS.map((o) => (
                <Chip key={o} selected={occasion === o} onClick={() => setOccasion(o)}>{OCCASION_META[o].label}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Time of day</p>
            <div className="flex flex-wrap gap-2">
              <Chip selected={timeOfDay === null} onClick={() => setTimeOfDay(null)}>Now</Chip>
              {TIMES_OF_DAY.map((t) => (
                <Chip key={t} selected={timeOfDay === t} onClick={() => setTimeOfDay(t)}>{TIME_LABEL[t]}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Desired projection</p>
            <div className="flex flex-wrap gap-2">
              <Chip selected={projection === null} onClick={() => setProjection(null)}>No preference</Chip>
              {[1, 2, 3, 4, 5].map((p) => (
                <Chip key={p} selected={projection === p} onClick={() => setProjection(p)}>{STRENGTH_LABELS[p]}</Chip>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {error ? (
        <ErrorState title="We couldn't get today's picks" message={error} onRetry={() => { setGeoError(null); query.retry(); }} />
      ) : data ? (
        <section aria-busy={loading}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl text-ivory sm:text-4xl">
                {data.source === "collection" ? "From your collection" : "From the catalog"}
              </h2>
              <p className="mt-1 text-sm text-mist">
                Best for {TIME_LABEL[data.timeOfDay as TimeOfDay]?.toLowerCase() ?? data.timeOfDay}
                {occasion ? `, ${OCCASION_META[occasion].label.toLowerCase()}` : ""}, at {Math.round(data.weather.temperatureC)}°C.
              </p>
            </div>
            {data.source === "catalog" && (
              <Button asChild variant="secondary" size="sm">
                <Link href={user ? "/fragrances" : "/login?next=/today"}>{user ? "Add fragrances you own" : "Sign in to use your collection"}</Link>
              </Button>
            )}
          </div>
          {data.note && <p className="mb-6 rounded-xl border border-champagne/15 bg-champagne/[0.05] px-4 py-3 text-sm text-champagne-soft/90">{data.note}</p>}
          <div className={`grid gap-5 md:grid-cols-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
            {data.picks.map((p, i) => (
              <div key={p.fragrance.id} className="relative">
                <span className="absolute -left-2 -top-2 z-10 grid size-8 place-items-center rounded-full bg-ivory font-display text-base text-ink">{i + 1}</span>
                <FragranceCard
                  fragrance={p.fragrance}
                  matchPercent={p.matchPercent}
                  className="h-full"
                  footer={
                    <ul className="space-y-1.5">
                      {p.reasons.map((r) => (
                        <li key={r} className="flex gap-2 text-[0.8rem] text-parchment/90">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ivory" aria-hidden /> {r}
                        </li>
                      ))}
                      {p.cautions.map((c) => (
                        <li key={c} className="flex gap-2 text-[0.8rem] text-mist">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-danger/70" aria-hidden /> {c}
                        </li>
                      ))}
                    </ul>
                  }
                />
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-dim">The percentage here is a context fit: weather, occasion, time and your taste. It&apos;s an estimate, not a guarantee.</p>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}
        </div>
      )}
    </div>
  );
}
