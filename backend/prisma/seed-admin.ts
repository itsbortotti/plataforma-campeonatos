import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COMPETITION_ID = "a0000000-0000-4000-8000-000000000001";

async function main() {
  const email = "admin@sfl.local";
  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

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

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: "admin",
      displayName: "Admin SFL",
    },
    update: {
      passwordHash,
      role: "admin",
      displayName: "Admin SFL",
    },
  });

  const existing = await prisma.userMembership.findFirst({
    where: {
      userId: user.id,
      role: "owner",
      competitionId: competition.id,
      teamId: null,
    },
  });
  if (!existing) {
    await prisma.userMembership.create({
      data: {
        userId: user.id,
        role: "owner",
        competitionId: competition.id,
        teamId: null,
      },
    });
  }

  console.log(`Admin/owner ready: ${user.email} / ${password}`);
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
