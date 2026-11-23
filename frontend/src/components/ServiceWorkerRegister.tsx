"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Em dev o SW cacheia chunks do Turbopack e quebra hydration / module factory.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => {
          for (const key of keys) void caches.delete(key);
        });
      }
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
