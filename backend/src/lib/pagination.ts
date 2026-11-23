import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  q: z.string().trim().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function parsePagination(query: unknown): PaginationQuery {
  return paginationQuerySchema.parse(query ?? {});
}

export function paginationMeta(
  total: number,
  page: number,
  pageSize: number,
) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  return {
    total,
    page: safePage,
    pageSize,
    pageCount,
    hasNext: safePage < pageCount,
    hasPrev: safePage > 1,
  };
}

export function skipTake(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  const meta = paginationMeta(total, page, pageSize);
  return { items, ...meta };
}
