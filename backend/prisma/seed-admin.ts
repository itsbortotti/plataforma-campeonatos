import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COMPETITION_ID = "a0000000-0000-4000-8000-000000000001";
const LOGIN = "master";
const PASSWORD = "sfl2026";
const LEGACY_EMAIL = "admin@sfl.local";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const competition = await prisma.competition.upsert({
    where: { slug: "sfl" },
    create: {
      id: DEFAULT_COMPETITION_ID,
      slug: "sfl",
      name: "Super Football League",
      description: "Campeonato principal SFL",
      logoUrl: "/images/competitions/sfl.png",
      isActive: true,
    },
    update: {
      name: "Super Football League",
      logoUrl: "/images/competitions/sfl.png",
      isActive: true,
    },
  });

  const legacy = await prisma.user.findUnique({ where: { email: LEGACY_EMAIL } });
  const existing = await prisma.user.findUnique({ where: { email: LOGIN } });

  let user;
  if (legacy && !existing) {
    user = await prisma.user.update({
      where: { id: legacy.id },
      data: {
        email: LOGIN,
        passwordHash,
        role: "admin",
        displayName: "Master SFL",
      },
    });
  } else {
    user = await prisma.user.upsert({
      where: { email: LOGIN },
      create: {
        email: LOGIN,
        passwordHash,
        role: "admin",
        displayName: "Master SFL",
      },
      update: {
        passwordHash,
        role: "admin",
        displayName: "Master SFL",
      },
    });
    if (legacy && legacy.id !== user.id) {
      await prisma.user.update({
        where: { id: legacy.id },
        data: { passwordHash: null, role: "player" },
      });
    }
  }

  const existingMembership = await prisma.userMembership.findFirst({
    where: {
      userId: user.id,
      role: "owner",
      competitionId: competition.id,
      teamId: null,
    },
  });
  if (!existingMembership) {
    await prisma.userMembership.create({
      data: {
        userId: user.id,
        role: "owner",
        competitionId: competition.id,
        teamId: null,
      },
    });
  }

  console.log(`Admin/owner ready: ${user.email} / ${PASSWORD}`);
  console.log(`Competition: ${competition.slug} (${competition.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
