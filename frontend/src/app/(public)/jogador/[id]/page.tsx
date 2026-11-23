import { notFound } from "next/navigation";
import { getPlayerProfile } from "@/lib/queries";
import { getMyPlayer } from "@/lib/me";
import { PlayerProfileView } from "@/components/player/PlayerProfileView";
import { EditMyProfileButton } from "./EditMyProfileButton";

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
