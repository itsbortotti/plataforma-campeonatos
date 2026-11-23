import { ApiError, friendlyApiMessage } from "@/lib/api-error";

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
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      503,
      "Não foi possível falar com o servidor. Tente de novo em instantes.",
    );
  }
  if (!res.ok) {
    let apiMessage: string | undefined;
    try {
      const data = await res.json();
      apiMessage = typeof data.error === "string" ? data.error : undefined;
    } catch {
      // ignore
    }
    throw new ApiError(
      res.status,
      friendlyApiMessage(res.status, apiMessage),
    );
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
