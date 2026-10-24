import { parseJson, rateLimit, route } from "@/lib/api";
import { runAssistant } from "@/lib/ai/assistant";
import { resolvePersonalization } from "@/lib/personalization";
import { chatRequestSchema } from "@/lib/validation/schemas";

export const POST = route(async (request) => {
  rateLimit(request, "chat", 20);
  const body = await parseJson(request, chatRequestSchema);
  const personalization = await resolvePersonalization(body);
  return runAssistant({ messages: body.messages, state: body.state, city: body.city, personalization });
});
