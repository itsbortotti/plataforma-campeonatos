"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-server";

function revalidateUsers() {
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/perfis");
}

export async function createUser(fields: {
  email: string;
  password: string;
  role?: "admin" | "user";
  displayName?: string;
}) {
  try {
    await apiPost("/api/admin/users", fields);
    revalidateUsers();
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function createUserWithProfile(fields: {
  email: string;
  password: string;
  displayName?: string;
  role: "owner" | "league_admin" | "team_staff" | "captain";
  competitionId: string;
  teamId?: string | null;
}) {
  try {
    await apiPost("/api/admin/memberships", {
      email: fields.email,
      password: fields.password,
      displayName: fields.displayName,
      role: fields.role,
      competitionId: fields.competitionId,
      teamId: fields.teamId ?? null,
    });
    revalidateUsers();
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function grantMembership(fields: {
  userId: string;
  role: "owner" | "league_admin" | "team_staff" | "captain";
  competitionId: string;
  teamId?: string | null;
}) {
  try {
    await apiPost("/api/admin/memberships", fields);
    revalidateUsers();
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function revokeMembership(id: string) {
  try {
    await apiDelete(`/api/admin/memberships/${id}`);
    revalidateUsers();
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updateUser(
  id: string,
  fields: {
    role?: "admin" | "user";
    displayName?: string | null;
    password?: string;
  },
) {
  try {
    await apiPatch(`/api/admin/users/${id}`, fields);
    revalidateUsers();
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function deleteUser(id: string) {
  try {
    await apiDelete(`/api/admin/users/${id}`);
    revalidateUsers();
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function setUserAdmin(id: string, isAdmin: boolean) {
  return updateUser(id, { role: isAdmin ? "admin" : "user" });
}
