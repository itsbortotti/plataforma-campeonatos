import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { loadOgFonts } from "@/lib/og/fonts";

export async function renderPng(
  element: ReactElement,
  width: number,
  height: number,
): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  const response = new ImageResponse(element, { width, height, fonts });
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
  );
  return response;
}
