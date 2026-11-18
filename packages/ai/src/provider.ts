export interface ChatMessage { role: "system" | "user" | "assistant" | "tool"; content: string; toolName?: string }
export interface ToolSpec { name: string; description: string }
export interface ToolCall { name: string; args: unknown }
export interface Usage { inputTokens: number; outputTokens: number }
export interface ProviderRequest { messages: ChatMessage[]; tools: ToolSpec[]; maxOutputTokens: number }
export interface ProviderResponse { text?: string; toolCalls?: ToolCall[]; usage: Usage }

/** Interfaccia comune: cambiare provider = implementare questa interfaccia. */
export interface LLMProvider {
  readonly name: string;
  readonly isDemo: boolean;
  /** Prezzi €/1M token, da verificare sul listino ufficiale prima dell'uso reale. */
  readonly pricePerMTokEur: { input: number; output: number };
  complete(req: ProviderRequest): Promise<ProviderResponse>;
}
