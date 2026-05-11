const DEEPSEEK_BASE = process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1";
const MODEL = "deepseek-v4-flash";

export interface AiCallOptions {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  timeout?: number;
}

export async function callDeepSeek<T = unknown>(
  options: AiCallOptions,
): Promise<T> {
  const timeout = options.timeout ?? 5000;
  const temperature = options.temperature ?? 0.3;

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: options.messages,
        temperature,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const content = data.choices[0].message.content;
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("DeepSeek API timeout");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
