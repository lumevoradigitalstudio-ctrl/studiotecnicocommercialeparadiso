import type { LLMProvider, ProviderRequest, ProviderResponse, ChatMessage } from "./provider";

export interface AnthropicConfig {
  apiKey: string; model: string;
  /** €/1M token: DEVE essere fornito dal listino ufficiale al momento del deploy (non hardcodato qui). */
  pricePerMTokEur: { input: number; output: number };
  fetchImpl?: typeof fetch; timeoutMs?: number;
}

/** Adapter per l'API Messages di Anthropic. Da usare SOLO server-side (Edge Function): la chiave non va mai nell'app. */
export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic"; readonly isDemo = false;
  readonly pricePerMTokEur: { input: number; output: number };
  constructor(private cfg: AnthropicConfig) {
    if (!cfg.apiKey) throw new Error("apiKey mancante");
    this.pricePerMTokEur = cfg.pricePerMTokEur;
  }
  private toWire(messages: ChatMessage[]) {
    const out: { role: "user" | "assistant"; content: unknown }[] = [];
    for (const m of messages) {
      if (m.role === "system") continue;
      if (m.role === "tool") {
        const block = { type: "tool_result", tool_use_id: m.toolCallId, content: m.content };
        const last = out[out.length - 1];
        if (last?.role === "user" && Array.isArray(last.content)) (last.content as unknown[]).push(block); else out.push({ role: "user", content: [block] });
      } else if (m.role === "assistant" && m.toolCalls?.length) {
        out.push({ role: "assistant", content: [...(m.content ? [{ type: "text", text: m.content }] : []), ...m.toolCalls.map(t => ({ type: "tool_use", id: t.id, name: t.name, input: t.args }))] });
      } else out.push({ role: m.role as "user" | "assistant", content: m.content });
    }
    return out;
  }
  async complete(req: ProviderRequest): Promise<ProviderResponse> {
    const f = this.cfg.fetchImpl ?? fetch;
    const res = await f("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 20_000),
      headers: { "content-type": "application/json", "x-api-key": this.cfg.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: this.cfg.model, max_tokens: req.maxOutputTokens,
        system: req.messages.filter(m => m.role === "system").map(m => m.content).join("\n"),
        messages: this.toWire(req.messages),
        tools: req.tools.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema ?? { type: "object", properties: {} } })),
      }),
    });
    if (!res.ok) throw new Error(`anthropic_http_${res.status}`); // niente body negli errori: potrebbe contenere dati utente
    const j = await res.json() as { content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[]; usage: { input_tokens: number; output_tokens: number } };
    const text = j.content.filter(b => b.type === "text").map(b => b.text).join("");
    const toolCalls = j.content.filter(b => b.type === "tool_use").map(b => ({ id: b.id, name: b.name!, args: b.input }));
    return { text: text || undefined, toolCalls: toolCalls.length ? toolCalls : undefined, usage: { inputTokens: j.usage.input_tokens, outputTokens: j.usage.output_tokens } };
  }
}
