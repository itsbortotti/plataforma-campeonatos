export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export const DEFAULT_PAGE_SIZE = 25;

export function buildListQuery(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  extra?: Record<string, string | undefined>;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page ?? 1));
  sp.set("pageSize", String(params.pageSize ?? DEFAULT_PAGE_SIZE));
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.extra) {
    for (const [k, v] of Object.entries(params.extra)) {
      if (v) sp.set(k, v);
    }
  }
  return sp.toString();
}

export function parseListSearchParams(sp: {
  page?: string;
  pageSize?: string;
  q?: string;
}) {
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.pageSize) || DEFAULT_PAGE_SIZE));
  const q = sp.q?.trim() || "";
  return { page, pageSize, q };
}
