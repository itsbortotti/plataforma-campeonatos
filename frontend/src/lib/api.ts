/** Browser uses same-origin `/api` (rewritten to backend). Server hits backend directly. */
export const API_URL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4006"
    : "";

type ApiOptions = RequestInit;

async function buildHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (
    !headers.has("Content-Type") &&
    init?.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  // Server components precisam encaminhar o cookie de sessão (admin/capitão).
  if (typeof window === "undefined" && !headers.has("cookie")) {
    try {
      const { cookies } = await import("next/headers");
      const jar = await cookies();
      const cookieHeader = jar
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");
      if (cookieHeader) headers.set("cookie", cookieHeader);
    } catch {
      // fora de request (build / script)
    }
  }
  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = await buildHeaders(options);
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `API ${res.status}`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string) {
  return apiFetch<T>(path, {
    method: "DELETE",
    body: "{}",
  });
}
