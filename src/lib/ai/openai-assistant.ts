import "server-only";
import { openAIModel } from "@/lib/config";
import type { ScoredFragrance } from "@/lib/recommendation";
import { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS, type ToolContext } from "./tools";

/**
 * LLM path: the model interprets the conversation and extracts structured
 * preferences as tool arguments; our engine does all matching. Uses the
 * REST API directly to avoid an SDK dependency.
 */

const SYSTEM_PROMPT = `You are the Scentify fragrance assistant.

Rules you must follow:
- Always call a tool before recommending, comparing or describing specific fragrances. Never invent fragrance names, brands, notes, prices, sizes or retailer availability.
- Only mention fragrances that appear in tool results, using their exact names and brands.
- The catalog is fictional demonstration data with demonstration prices in CAD. Say so briefly when you quote prices.
- Match percentages are algorithmic compatibility scores, not guarantees the user will like a fragrance.
- If a user names a real-world fragrance, use getSimilarFragrances; explain it isn't in the demo catalog and that matches are based on its publicly listed notes.
- Never call two fragrances "dupes" or "clones"; describe them as similar profiles.
- For follow-ups ("cheaper", "stronger", "no oud"), call the tool again with refined arguments, carrying over earlier constraints.
- Be warm, concise and specific: 2–4 sentences plus a short bulleted list of the top picks (name — one-line why). The UI shows cards for the fragrances you retrieved.`;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

export interface AssistantTurn {
  message: string;
  fragrances: ScoredFragrance[];
  toolsUsed: string[];
}

export async function runOpenAIAssistant(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  ctx: ToolContext,
): Promise<AssistantTurn> {
  const p = ctx.personalization;
  const userContext = `User context: ${p.user ? `signed in as ${p.user.displayName}` : "not signed in"}; saved profile families: ${
    p.profile.families.join(", ") || "none"
  }; budget max ${p.profile.budget.max} CAD${p.profile.budget.strict ? " (strict)" : ""}; collection size ${p.collection.length}${
    ctx.city ? `; city: ${ctx.city}` : ""
  }.`;
  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${userContext}` },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolsUsed: string[] = [];
  let fragrances: ScoredFragrance[] = [];

  for (let round = 0; round < 4; round++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: openAIModel(), messages, tools: TOOL_DEFINITIONS, tool_choice: "auto", temperature: 0.4 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`OpenAI request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { choices: Array<{ message: ChatMessage }> };
    const reply = data.choices[0]?.message;
    if (!reply) throw new Error("OpenAI returned no message");
    messages.push(reply);

    if (!reply.tool_calls?.length) {
      return { message: reply.content ?? "", fragrances: dedupe(fragrances).slice(0, 6), toolsUsed };
    }

    for (const call of reply.tool_calls) {
      const impl = TOOL_IMPLEMENTATIONS[call.function.name];
      let content: unknown;
      if (!impl) {
        content = { error: `Unknown tool ${call.function.name}` };
      } else {
        try {
          const args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          const result = await impl(args, ctx);
          toolsUsed.push(call.function.name);
          // The latest retrieval defines what the user sees.
          if (result.fragrances.length) fragrances = result.fragrances;
          content = result.data;
        } catch (error) {
          content = { error: error instanceof Error ? error.message : "Tool failed" };
        }
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(content) });
    }
  }
  return {
    message: "Here's what I found in the catalog.",
    fragrances: dedupe(fragrances).slice(0, 6),
    toolsUsed,
  };
}

function dedupe(list: ScoredFragrance[]): ScoredFragrance[] {
  const seen = new Set<string>();
  return list.filter((s) => (seen.has(s.fragrance.id) ? false : (seen.add(s.fragrance.id), true)));
}
