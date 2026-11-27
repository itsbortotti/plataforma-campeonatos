import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  adminCreateData,
  adminLookupEmails,
  adminPasswordResetData,
  decideAdminSeed,
  seedAdminResetPasswordEnabled,
  seedPasswordError,
} from "./seed-admin-policy.ts";

const prisma = new PrismaClient();

const DEFAULT_COMPETITION_ID = "a0000000-0000-4000-8000-000000000001";
const LOGIN_RAW = (process.env.SEED_ADMIN_USER || "master").trim().toLowerCase();
/** E-mail canônico no banco (sempre com @). Login ainda aceita só "master". */
const LOGIN = LOGIN_RAW.includes("@")
  ? LOGIN_RAW
  : `${LOGIN_RAW}@sfl.local`;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

async function findExistingAdmin() {
  for (const email of adminLookupEmails(LOGIN, LOGIN_RAW)) {
    const found = await prisma.user.findUnique({ where: { email } });
    if (found) return found;
  }
  return null;
}

async function main() {
  const resetPassword = seedAdminResetPasswordEnabled(
    process.env.SEED_ADMIN_RESET_PASSWORD,
  );

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

  const existing = await findExistingAdmin();
  const decision = decideAdminSeed({
    adminExists: existing != null,
    resetPassword,
  });

  let user = existing;
  let passwordRejected = false;

  if (decision === "skip") {
    console.log(
      `Admin já existe (${existing?.email}). Senha, e-mail e papel não foram alterados.`,
    );
  } else {
    const failure = seedPasswordError(PASSWORD, LOGIN_RAW);
    if (failure) {
      passwordRejected = true;
      console.error(failure);
      console.error(
        "Seed do admin: validação da senha falhou. Nenhum usuário foi criado ou teve a senha regravada. O start do servidor continua.",
      );
    } else {
      const passwordHash = await bcrypt.hash(PASSWORD, 10);
      if (decision === "create") {
        user = await prisma.user.create({
          data: adminCreateData(LOGIN, passwordHash),
        });
        console.log(`Admin criado: ${user.email}`);
      } else if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: adminPasswordResetData(passwordHash),
        });
        console.log(
          `Senha do admin regravada (${user.email}) porque SEED_ADMIN_RESET_PASSWORD=true.`,
        );
      }
    }
  }

  if (user?.role === "admin") {
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
  }

  if (user && !passwordRejected) {
    console.log(`Admin/owner ready: ${user.email}`);
  }
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
