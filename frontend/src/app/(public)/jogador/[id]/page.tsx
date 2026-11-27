import { notFound } from "next/navigation";
import { getPlayerProfile } from "@/lib/queries";
import { getMyPlayer } from "@/lib/me";
import { PlayerProfileView } from "@/components/player/PlayerProfileView";
import { pageMetadata } from "@/lib/seo";
import { EditMyProfileButton } from "./EditMyProfileButton";

const positionLabel: Record<string, string> = {
  GOL: "goleiro",
  ZAG: "zagueiro",
  LAT: "lateral",
  VOL: "volante",
  MEI: "meia",
  ATA: "atacante",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getPlayerProfile(null, id);
  const image = `/og/jogador/${id}`;
  if (!profile) {
    return pageMetadata({
      title: "Jogador",
      description: "Perfil de jogador da SFL.",
      path: `/jogador/${id}`,
      image,
    });
  }
  const role = positionLabel[profile.position] || "jogador";
  const team = profile.currentSeason?.team?.name;
  const fullName = profile.name.trim();
  return pageMetadata({
    title: (profile.nickname || fullName).trim(),
    description: team
      ? `${fullName}, ${role} do ${team} na SFL. Gols, assistências e jogos.`
      : `${fullName}, ${role} na SFL. Gols, assistências e jogos.`,
    path: `/jogador/${id}`,
    image,
  });
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, me] = await Promise.all([
    getPlayerProfile(null, id),
    getMyPlayer(null),
  ]);
  if (!profile) notFound();

  const isOwner = me?.id === profile.id;

  return (
    <PlayerProfileView
      profile={profile}
      backLink={isOwner ? null : { href: "/elencos", label: "Elencos" }}
      actionSlot={
        isOwner ? (
          <EditMyProfileButton
            initialNickname={profile.nickname}
            initialPhotoUrl={profile.photoUrl}
          />
        ) : null
      }
    />
  );
}
