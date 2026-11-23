"use client";

import { useCallback } from "react";
import { MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VenueLinkProps {
  readonly venue: string;
  readonly className?: string;
}

function getDirectionsUrl(query: string) {
  const encoded = encodeURIComponent(query);
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    // geo: URI triggers the OS app picker (Waze, Google Maps, etc.)
    return `geo:0,0?q=${encoded}`;
  }
  // iOS + Desktop: Google Maps web — on iOS offers to open in the app if installed
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

export function VenueLink({ venue, className }: VenueLinkProps) {
  const query = `${venue}, São Paulo`;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const url = getDirectionsUrl(query);
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    [query],
  );

  return (
    <div className={className}>
      <MapPin className="h-3 w-3 text-muted-foreground/60 inline mr-1 -mt-px" />
      <span className="text-[11px] text-muted-foreground/60">{venue}</span>
      <span className="text-muted-foreground/30 mx-1">·</span>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-6 px-2 text-[11px]",
        )}
      >
        Como chegar
      </button>
    </div>
  );
}
