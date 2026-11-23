import Image from "next/image";
import Link from "next/link";
import { requireCaptain } from "@/lib/captain";
import { getTeams } from "@/lib/queries";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function CaptainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const captain = await requireCaptain();
  const teams = await getTeams();
  const team = teams.find((t) => t.id === captain.teamId);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        {team?.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt={team.name}
            width={28}
            height={28}
            className="object-contain"
          />
        ) : (
          <div
            className="h-7 w-7 rounded flex items-center justify-center text-[9px] font-black text-white"
            style={{ background: team?.primaryColor ?? "#666" }}
          >
            {team?.shortName.slice(0, 3) ?? "?"}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-sm font-bold">{team?.name ?? "Meu time"}</h1>
          <p className="text-[10px] text-muted-foreground">
            Painel do time (capitão / comissão)
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Voltar ao site
        </Link>
        <UserMenu />
        <ThemeToggle />
      </header>
      <main className="flex-1 p-4 sm:p-6 flex justify-center">
        <div className="w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
