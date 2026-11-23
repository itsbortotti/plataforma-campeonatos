"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_BRAND,
  resolveLogoSrc,
  type SystemBrand,
} from "@/lib/brand";

const BrandContext = createContext<SystemBrand>(DEFAULT_BRAND);

export function BrandProvider({
  value,
  children,
}: {
  value?: SystemBrand | null;
  children: ReactNode;
}) {
  const brand = useMemo(
    () => ({ ...DEFAULT_BRAND, ...(value ?? {}) }),
    [value],
  );
  return (
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}

export function useBrandLogoSrc() {
  return resolveLogoSrc(useBrand());
}
