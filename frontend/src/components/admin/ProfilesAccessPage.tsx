"use client";

import {
  RolePermissionsEditor,
  type CapabilityDef,
  type ProfileMeta,
} from "./RolePermissionsEditor";

type Props = {
  catalog: CapabilityDef[];
  profiles: Record<string, ProfileMeta>;
  permissions: Record<string, Record<string, boolean>>;
};

/** Só a matriz: o que cada perfil pode. Usuários + atribuição ficam em /admin/usuarios. */
export function ProfilesAccessPage({ catalog, profiles, permissions }: Props) {
  return (
    <RolePermissionsEditor
      catalog={catalog}
      profiles={profiles}
      permissions={permissions}
    />
  );
}
