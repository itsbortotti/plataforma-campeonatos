import { revalidateTag, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";
import { ApiError, friendlyApiMessage } from "@/lib/api-error";
import { PUBLIC_CACHE_TAG } from "@/lib/public-cache";

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
  try {
    const jar = await cookies();
    const cookieHeader = jar
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (cookieHeader) headers.set("cookie", cookieHeader);
  } catch {
    // outside request scope
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
      if (Array.isArray(data.suspended) && data.suspended.length > 0) {
        apiMessage = `${apiMessage || "Operação bloqueada"} (${data.suspended.length} jogador${data.suspended.length === 1 ? "" : "es"})`;
      }
    } catch {
      // ignore non-json
    }
    throw new ApiError(
      res.status,
      friendlyApiMessage(res.status, apiMessage),
    );
  }
  if (methodWrites(options.method) && res.ok) {
    bustPublicCache();
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function methodWrites(method: string | undefined): boolean {
  const verb = (method ?? "GET").toUpperCase();
  return verb !== "GET" && verb !== "HEAD";
}

/** Painel e capitão gravam pela API do Next: a vitrine pública sai do cache na hora. */
function bustPublicCache() {
  try {
    updateTag(PUBLIC_CACHE_TAG);
  } catch {
    try {
      revalidateTag(PUBLIC_CACHE_TAG, "max");
    } catch {
      // fora de uma action (build / script)
    }
  }
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
    // Fastify rejects DELETE with Content-Type json and empty body
    body: "{}",
  });
}
