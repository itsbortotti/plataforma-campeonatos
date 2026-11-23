"use client";

import { useBrand, useBrandLogoSrc } from "@/components/BrandProvider";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  /** Aceito por compatibilidade com callers que usavam next/image. */
  priority?: boolean;
};

export function SystemLogo({ size = 36, className }: Props) {
  const brand = useBrand();
  const src = useBrandLogoSrc();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={brand.siteName}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-xl object-contain", className)}
      suppressHydrationWarning
    />
  );
}
