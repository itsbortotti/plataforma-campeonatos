"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  placeholder?: string;
  param?: string;
};

/** Busca via querystring (server components) com debounce. */
export function AdminSearchField({
  placeholder = "Buscar…",
  param = "q",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get(param) ?? "";
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    const t = setTimeout(() => {
      const current = searchParams.get(param) ?? "";
      if (value.trim() === current.trim()) return;
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set(param, value.trim());
      else params.delete(param);
      params.set("page", "1");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [value, pathname, router, searchParams, param]);

  return (
    <div className="relative flex-1 min-w-48">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
