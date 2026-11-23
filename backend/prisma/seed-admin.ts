import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COMPETITION_ID = "a0000000-0000-4000-8000-000000000001";
const LOGIN_RAW = (process.env.SEED_ADMIN_USER || "master").trim().toLowerCase();
/** E-mail canônico no banco (sempre com @). Login ainda aceita só "master". */
const LOGIN = LOGIN_RAW.includes("@")
  ? LOGIN_RAW
  : `${LOGIN_RAW}@sfl.local`;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || "";
const LEGACY_EMAILS = ["admin@sfl.local", LOGIN_RAW, "master"];

async function main() {
  if (!PASSWORD) {
    throw new Error(
      "Missing SEED_ADMIN_PASSWORD — set it in the environment (never commit the value).",
    );
  }
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

  let user = await prisma.user.findUnique({ where: { email: LOGIN } });
  if (!user) {
    for (const legacyEmail of LEGACY_EMAILS) {
      if (legacyEmail === LOGIN) continue;
      const legacy = await prisma.user.findUnique({
        where: { email: legacyEmail },
      });
      if (legacy) {
        user = await prisma.user.update({
          where: { id: legacy.id },
          data: {
            email: LOGIN,
            passwordHash,
            role: "admin",
            displayName: "Master SFL",
          },
        });
        break;
      }
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: LOGIN,
        passwordHash,
        role: "admin",
        displayName: "Master SFL",
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: LOGIN,
        passwordHash,
        role: "admin",
        displayName: "Master SFL",
      },
    });
  }

  for (const legacyEmail of LEGACY_EMAILS) {
    if (legacyEmail === LOGIN) continue;
    const leftover = await prisma.user.findUnique({
      where: { email: legacyEmail },
    });
    if (leftover && leftover.id !== user.id) {
      await prisma.user.update({
        where: { id: leftover.id },
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

  console.log(`Admin/owner ready: ${user.email}`);
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
