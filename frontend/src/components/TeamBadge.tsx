import Image from "next/image";
import { cn } from "@/lib/utils";

interface TeamBadgeProps {
  readonly name: string;
  readonly shortName: string;
  readonly primaryColor: string;
  readonly logoUrl?: string | null;
  readonly size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeMap = {
  sm: { box: "h-7 w-7", img: 28 },
  md: { box: "h-9 w-9", img: 36 },
  lg: { box: "h-14 w-14", img: 56 },
  xl: { box: "h-20 w-20", img: 80 },
  "2xl": { box: "h-28 w-28", img: 112 },
} as const;

export function TeamBadge({ name, shortName, primaryColor, logoUrl, size = "md" }: TeamBadgeProps) {
  const s = sizeMap[size];

  if (logoUrl) {
    return (
      <div className={cn("relative shrink-0", s.box)} title={name}>
        <Image
          src={logoUrl}
          alt={name}
          width={s.img}
          height={s.img}
          className="object-contain w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center font-black text-white shrink-0 uppercase tracking-tighter rounded-lg",
        s.box,
        size === "sm" ? "text-[9px]" : size === "md" ? "text-[11px]" : size === "lg" ? "text-sm" : "text-lg",
      )}
      style={{
        background: primaryColor,
        boxShadow: `0 2px 12px ${primaryColor}50`,
      }}
      title={name}
    >
      <span>{shortName.slice(0, 3)}</span>
    </div>
  );
}
