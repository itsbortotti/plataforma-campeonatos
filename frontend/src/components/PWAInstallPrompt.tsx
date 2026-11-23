"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Download, Share, Plus, X } from "lucide-react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "sfl-pwa-dismissed";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone: boolean }).standalone)
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    if (isIOS()) {
      setPlatform("ios");
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPlatform("android");
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowBanner(false);
      setShowIOSSheet(true);
      return;
    }

    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSSheet(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  return (
    <>
      {/* Banner inferior — Android e iOS */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
            <Image
              src="/images/system-logo.svg"
              alt="SFL"
              width={40}
              height={40}
              className="rounded-lg"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Instalar SFL</p>
              <p className="text-xs text-muted-foreground">
                Acesse rápido pela tela inicial
              </p>
            </div>
            <Button size="sm" onClick={handleInstall}>
              <Download data-icon="inline-start" className="size-3.5" />
              Instalar
            </Button>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom sheet com instruções — iOS */}
      <Sheet open={showIOSSheet} onOpenChange={(open) => !open && handleDismiss()}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="items-center text-center">
            <Image
              src="/images/system-logo.svg"
              alt="SFL"
              width={64}
              height={64}
              className="rounded-2xl"
              unoptimized
            />
            <SheetTitle>Instalar SFL</SheetTitle>
            <SheetDescription>
              Adicione o app à sua tela inicial para acesso rápido a
              classificação, calendário e estatísticas.
            </SheetDescription>
          </SheetHeader>

          <div className="mx-auto max-w-xs space-y-4 px-4 py-2">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="text-lg">1</span>
              </div>
              <p className="text-sm pt-1">
                Toque no ícone{" "}
                <Share className="inline size-4 text-blue-500" />{" "}
                <strong>Compartilhar</strong> na barra do Safari
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="text-lg">2</span>
              </div>
              <p className="text-sm pt-1">
                Role para baixo e toque em{" "}
                <Plus className="inline size-4" />{" "}
                <strong>Adicionar à Tela de Início</strong>
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="text-lg">3</span>
              </div>
              <p className="text-sm pt-1">
                Toque em <strong>Adicionar</strong> no canto superior direito
              </p>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" className="w-full" onClick={handleDismiss}>
              Entendi
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
