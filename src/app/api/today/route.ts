import { ApiError, parseJson, rateLimit, route } from "@/lib/api";
import { resolvePersonalization } from "@/lib/personalization";
import { wearToday } from "@/lib/today";
import { todayRequestSchema } from "@/lib/validation/schemas";
import { WeatherError } from "@/lib/weather";

export const POST = route(async (request) => {
  rateLimit(request, "today", 30);
  const body = await parseJson(request, todayRequestSchema);
  const p = await resolvePersonalization(body);
  try {
    return await wearToday(body, p);
  } catch (error) {
    if (error instanceof WeatherError) throw new ApiError(error.status, error.message);
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new ApiError(504, "The weather service took too long to respond. Try again, or use an example forecast.");
    }
    throw error;
  }
});
