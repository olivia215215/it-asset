import { UserRole, type AssetModel, type AssetInstance } from "@prisma/client";

type Role = "EMPLOYEE" | "MANAGER" | "IT_ADMIN" | "EXECUTIVE";

type AssetInstanceWithModel = AssetInstance & { model?: AssetModel | null };

export function sanitizeAssetModel(
  model: AssetModel,
  role: Role,
): Record<string, unknown> {
  const base = model as unknown as Record<string, unknown>;

  if (role === "EMPLOYEE" || role === "MANAGER") {
    const { purchasePrice, supplier, sn, ...rest } = base;
    return rest;
  }

  if (role === "EXECUTIVE") {
    const { supplier, sn, ...rest } = base;
    return rest;
  }

  // IT_ADMIN: full visibility
  return base;
}

export function sanitizeAssetInstance(
  instance: AssetInstanceWithModel,
  role: Role,
): Record<string, unknown> {
  const base = { ...instance } as unknown as Record<string, unknown>;

  if (instance.model) {
    base.model = sanitizeAssetModel(instance.model, role) as Record<
      string,
      unknown
    >;
  }

  if (role === "EMPLOYEE" || role === "MANAGER") {
    const { purchasePrice, supplier, sn, ...rest } = base;
    return rest;
  }

  if (role === "EXECUTIVE") {
    const { supplier, sn, ...rest } = base;
    return rest;
  }

  return base;
}
