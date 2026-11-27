import { Store } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Loja",
  description: "Produtos oficiais da SFL e dos times. Em breve.",
  path: "/loja",
});

export default function LojaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
      <Store className="h-12 w-12 mx-auto text-muted-foreground" />
      <h1 className="text-3xl font-black tracking-tight">Loja</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Em breve. Aqui você encontrará produtos oficiais da liga e dos times.
      </p>
    </div>
  );
}
