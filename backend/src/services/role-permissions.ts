import type { MembershipRole } from "@prisma/client";
import { prisma } from "../core/prisma.js";

export type CapabilityDef = {
  id: string;
  label: string;
  group: "liga" | "partida" | "time" | "sistema";
};

/** Catálogo fixo — o Master liga/desliga por perfil. */
export const CAPABILITY_CATALOG: CapabilityDef[] = [
  {
    id: "manage_league",
    label: "Gerenciar campeonato e regras",
    group: "liga",
  },
  {
    id: "manage_seasons",
    label: "Criar e editar temporadas",
    group: "liga",
  },
  {
    id: "manage_teams",
    label: "Cadastrar e editar times",
    group: "liga",
  },
  {
    id: "manage_players",
    label: "Gerenciar elenco da liga",
    group: "liga",
  },
  {
    id: "manage_fixtures",
    label: "Criar e editar partidas",
    group: "partida",
  },
  {
    id: "run_live_match",
    label: "Operar súmula ao vivo",
    group: "partida",
  },
  {
    id: "manage_cards",
    label: "Gerenciar cartões e suspensões",
    group: "partida",
  },
  {
    id: "team_lineup",
    label: "Escalação do próprio time",
    group: "time",
  },
  {
    id: "team_highlights",
    label: "Destaques do próprio time",
    group: "time",
  },
  {
    id: "assign_roles",
    label: "Atribuir perfis a usuários",
    group: "sistema",
  },
  {
    id: "manage_users",
    label: "Criar e editar contas de usuário",
    group: "sistema",
  },
  {
    id: "view_audit",
    label: "Ver audit log",
    group: "sistema",
  },
];

export const PROFILE_META: Record<
  MembershipRole,
  { label: string; description: string; needsTeam: boolean }
> = {
  owner: {
    label: "Owner",
    description: "Dono do campeonato — controle total da liga.",
    needsTeam: false,
  },
  league_admin: {
    label: "Admin da liga",
    description: "Opera o campeonato no dia a dia (partidas, elenco, cartões).",
    needsTeam: false,
  },
  team_staff: {
    label: "Comissão técnica",
    description: "Painel do time — escalação e destaques do próprio clube.",
    needsTeam: true,
  },
  captain: {
    label: "Capitão",
    description: "Painel do time — escalação e destaques como capitão.",
    needsTeam: true,
  },
};

const DEFAULTS: Record<MembershipRole, string[]> = {
  owner: CAPABILITY_CATALOG.map((c) => c.id),
  league_admin: [
    "manage_league",
    "manage_seasons",
    "manage_teams",
    "manage_players",
    "manage_fixtures",
    "run_live_match",
    "manage_cards",
    "assign_roles",
    "view_audit",
  ],
  team_staff: ["team_lineup", "team_highlights"],
  captain: ["team_lineup", "team_highlights"],
};

export async function ensureRolePermissionDefaults() {
  const existing = await prisma.rolePermission.count();
  if (existing > 0) return;

  const rows: { role: MembershipRole; capability: string; enabled: boolean }[] =
    [];
  for (const role of Object.keys(DEFAULTS) as MembershipRole[]) {
    const enabledSet = new Set(DEFAULTS[role]);
    for (const cap of CAPABILITY_CATALOG) {
      rows.push({
        role,
        capability: cap.id,
        enabled: enabledSet.has(cap.id),
      });
    }
  }
  await prisma.rolePermission.createMany({ data: rows });
}

export async function listRolePermissions() {
  await ensureRolePermissionDefaults();
  const rows = await prisma.rolePermission.findMany();
  const byRole = {} as Record<
    MembershipRole,
    Record<string, boolean>
  >;
  for (const role of Object.keys(DEFAULTS) as MembershipRole[]) {
    byRole[role] = {};
    for (const cap of CAPABILITY_CATALOG) {
      byRole[role][cap.id] = DEFAULTS[role].includes(cap.id);
    }
  }
  for (const row of rows) {
    if (!byRole[row.role]) byRole[row.role] = {};
    byRole[row.role][row.capability] = row.enabled;
  }
  return {
    catalog: CAPABILITY_CATALOG,
    profiles: PROFILE_META,
    permissions: byRole,
  };
}

export async function setRolePermissions(
  role: MembershipRole,
  capabilities: Record<string, boolean>,
) {
  await ensureRolePermissionDefaults();
  const known = new Set(CAPABILITY_CATALOG.map((c) => c.id));
  for (const [capability, enabled] of Object.entries(capabilities)) {
    if (!known.has(capability)) continue;
    await prisma.rolePermission.upsert({
      where: { role_capability: { role, capability } },
      create: { role, capability, enabled },
      update: { enabled },
    });
  }
  return listRolePermissions();
}

export async function roleHasCapability(
  role: MembershipRole,
  capability: string,
): Promise<boolean> {
  await ensureRolePermissionDefaults();
  const row = await prisma.rolePermission.findUnique({
    where: { role_capability: { role, capability } },
  });
  if (row) return row.enabled;
  return DEFAULTS[role]?.includes(capability) ?? false;
}
