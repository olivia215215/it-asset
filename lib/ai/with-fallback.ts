export async function withAiFallback<T>(
  fn: () => Promise<T>,
  fallbackMessage: string,
): Promise<{ ok: true; data: T } | { ok: false; fallback: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    console.error("[AI Fallback]", error);
    return { ok: false, fallback: fallbackMessage };
  }
}
