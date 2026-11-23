import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-server";

export default async function LiveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    const me = await apiGet<{ user: { role: string } }>("/api/auth/me");
    if (me.user.role !== "admin") redirect("/");
  } catch {
    redirect("/login");
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {children}
    </div>
  );
}
