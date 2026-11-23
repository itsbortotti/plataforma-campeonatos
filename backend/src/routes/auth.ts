import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../core/prisma.js";
import {
  clearAuthCookie,
  requireUser,
  resolveUser,
  setAuthCookie,
} from "../core/auth.js";
import { getCaptainInfo } from "../services/captain.js";
import { listMembershipsForUser } from "../services/memberships.js";
import { config } from "../core/config.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request, reply) => {
    const raw = (request.body ?? {}) as { email?: unknown; password?: unknown };
    const login =
      typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const password = typeof raw.password === "string" ? raw.password : "";

    if (!login) {
      return reply
        .code(400)
        .send({ error: "Digite o usuário ou o e-mail da conta." });
    }
    if (!password) {
      return reply.code(400).send({ error: "Digite a senha." });
    }

    // Aceita "master" e "master@sfl.local" (seed antigo gravava sem @).
    const candidates = [login];
    if (!login.includes("@")) {
      candidates.push(`${login}@sfl.local`);
    } else if (login.endsWith("@sfl.local")) {
      candidates.push(login.slice(0, -"@sfl.local".length));
    }

    let user = null;
    for (const email of candidates) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) break;
    }
    if (!user?.passwordHash) {
      return reply.code(401).send({
        error:
          "Usuário ou senha incorretos. No Master use master / senha do ambiente, ou o e-mail completo da conta.",
      });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({
        error:
          "E-mail ou senha incorretos. Confira a senha ou peça ao Master para redefinir.",
      });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    setAuthCookie(reply, token);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
    };
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    clearAuthCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/me", async (request, reply) => {
    const user = await resolveUser(request);
    if (!user) return reply.code(401).send({ error: "Não autenticado" });
    const [captain, player, memberships] = await Promise.all([
      getCaptainInfo(user.id),
      prisma.player.findFirst({
        where: { userId: user.id },
        select: { id: true, nickname: true, photoUrl: true, name: true },
      }),
      listMembershipsForUser(user.id),
    ]);
    return { user, captain, player, memberships };
  });

  app.patch("/api/auth/me", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        displayName: z.string().nullable().optional(),
        password: z.string().min(6).optional(),
      })
      .parse(request.body);
    const data: { displayName?: string | null; passwordHash?: string } = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });
    return {
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        displayName: updated.displayName,
      },
    };
  });

  app.get("/api/auth/google/start", async (_request, reply) => {
    if (!config.googleClientId) {
      return reply
        .code(501)
        .send({ error: "Google OAuth não configurado. Use login email/senha." });
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.googleClientId);
    url.searchParams.set("redirect_uri", config.googleRedirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    return reply.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (request, reply) => {
    if (!config.googleClientId || !config.googleClientSecret) {
      return reply.code(501).send({ error: "Google OAuth não configurado" });
    }
    const { code } = z.object({ code: z.string() }).parse(request.query);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      return reply.code(400).send({ error: "Falha no token Google" });
    }
    const tokens = (await tokenRes.json()) as { access_token: string };
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    if (!profileRes.ok) {
      return reply.code(400).send({ error: "Falha no perfil Google" });
    }
    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name?: string;
    };

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleSub: profile.id }, { email: profile.email.toLowerCase() }],
      },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          googleSub: profile.id,
          displayName: profile.name ?? null,
          role: "user",
        },
      });
    } else if (!user.googleSub) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleSub: profile.id },
      });
    }

    // claim player by email
    await prisma.player.updateMany({
      where: { email: profile.email.toLowerCase(), userId: null },
      data: { userId: user.id },
    });

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    setAuthCookie(reply, token);

    const captain = await getCaptainInfo(user.id);
    const next =
      user.role === "admin"
        ? "http://127.0.0.1:3000/admin/jogadores"
        : captain
          ? "http://127.0.0.1:3000/capitao"
          : "http://127.0.0.1:3000/";
    return reply.redirect(next);
  });

  app.patch("/api/me/player", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        nickname: z.string().min(1).max(40),
        photoUrl: z.string().nullable().optional(),
      })
      .parse(request.body);

    const player = await prisma.player.findFirst({ where: { userId: user.id } });
    if (!player) return reply.code(404).send({ error: "Jogador não vinculado" });

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: {
        nickname: body.nickname,
        photoUrl: body.photoUrl === undefined ? undefined : body.photoUrl,
      },
    });
    return { id: updated.id };
  });
}
