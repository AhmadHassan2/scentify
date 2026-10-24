import "server-only";
import type { ChatResponseDTO } from "@/types/dto";
import { isOpenAIConfigured } from "@/lib/config";
import { toRecommendationDTO } from "@/lib/fragrance/dto";
import type { Personalization } from "@/lib/personalization";
import { runLocalAssistant, type LocalAssistantState } from "./local-assistant";
import { runOpenAIAssistant } from "./openai-assistant";
import { describeFilters, parseQuery } from "./query-parser";

/** Routes a chat turn to the LLM path when configured, else the local parser. */
export async function runAssistant(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  state?: Record<string, unknown>;
  city?: string;
  personalization: Personalization;
}): Promise<ChatResponseDTO> {
  const ctx = { personalization: input.personalization, city: input.city };
  const last = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";

  if (isOpenAIConfigured()) {
    try {
      const turn = await runOpenAIAssistant(input.messages, ctx);
      return {
        message: turn.message,
        fragrances: turn.fragrances.map(toRecommendationDTO),
        appliedFilters: describeFilters(parseQuery(last).filters),
        toolsUsed: turn.toolsUsed,
        mode: "openai",
        state: input.state ?? {},
      };
    } catch (error) {
      console.error("[assistant] OpenAI failed, falling back to local assistant:", error);
    }
  }

  const turn = await runLocalAssistant(last, input.state as LocalAssistantState | undefined, ctx);
  return {
    message: turn.message,
    fragrances: turn.fragrances.map(toRecommendationDTO),
    appliedFilters: turn.appliedFilters,
    toolsUsed: turn.toolsUsed,
    mode: "local",
    state: turn.state as unknown as Record<string, unknown>,
  };
}
