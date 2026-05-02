import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveDefaultOutputRoot(meta: ImportMeta | URL | string): string {
  const url = typeof meta === "string" ? meta : meta instanceof URL ? meta : meta.url;
  const filePath = fileURLToPath(url);
  const parts = dirname(filePath).split(/[\\/]/);
  const workspaceMarker = parts.findIndex((part) => part === "apps" || part === "packages");

  if (workspaceMarker >= 0) {
    return resolve(parts.slice(0, workspaceMarker).join(sep), "output");
  }

  return resolve(dirname(filePath), "../../../output");
}
