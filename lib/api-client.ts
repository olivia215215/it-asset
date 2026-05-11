const TOKEN_KEY = "auth-token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | undefined>;
  body?: unknown;
}

function buildUrl(baseUrl: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return baseUrl;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const qs = searchParams.toString();
  if (qs) {
    return baseUrl + (baseUrl.includes("?") ? "&" : "?") + qs;
  }
  return baseUrl;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);

  // Only set Content-Type when there is a body and it's not already set
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { params, ...fetchOptions } = options;
  const finalUrl = buildUrl(url, params);

  // Auto-serialize object bodies to JSON
  const body =
    options.body && typeof options.body === "object" && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams) && !(options.body instanceof Blob) && !(options.body instanceof ArrayBuffer) && !(options.body instanceof ReadableStream)
      ? JSON.stringify(options.body)
      : options.body;

  const response = await fetch(finalUrl, {
    ...fetchOptions,
    body: body as BodyInit | undefined,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const responseBody = await response.json();
      if (responseBody.error) message = responseBody.error;
      if (responseBody.message) message = responseBody.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export { getToken, TOKEN_KEY };
