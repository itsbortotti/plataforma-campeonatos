import { readFile } from "node:fs/promises";
import path from "node:path";

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let fontsPromise: Promise<OgFont[]> | null = null;

/** Noto Sans (OFL) com acentos — o runtime do Render só carrega `public/`. */
export function loadOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    const pending: Promise<OgFont[]> = (async () => {
      const dir = path.join(process.cwd(), "public/fonts/og");
      const [regular, bold] = await Promise.all([
        readFile(path.join(dir, "NotoSans-Regular.ttf")),
        readFile(path.join(dir, "NotoSans-Bold.ttf")),
      ]);
      const fonts: OgFont[] = [
        { name: "Noto Sans", data: regular, weight: 400, style: "normal" },
        { name: "Noto Sans", data: bold, weight: 700, style: "normal" },
      ];
      return fonts;
    })().catch((error: unknown) => {
      fontsPromise = null;
      throw error;
    });
    fontsPromise = pending;
  }
  return fontsPromise;
}
