import { Uri } from "@tsonic/dotnet/System.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const getQuery = (ctx: HttpContext, key: string): string | undefined => {
  const raw = ctx.Request.QueryString.Value;
  if (raw === undefined || raw === "") return undefined;

  let qs = raw;
  if (qs.startsWith("?")) qs = qs.substring(1);
  if (qs === "") return undefined;

  const pairs = qs.split("&");
  for (let i = 0; i < pairs.length; i++) {
    const part = pairs[i];
    if (part === "") continue;

    const kv = part.split("=");
    const k = Uri.UnescapeDataString(kv[0].replaceAll("+", " "));
    if (k !== key) continue;

    const v = kv.length > 1 ? Uri.UnescapeDataString(kv[1].replaceAll("+", " ")) : "";
    const trimmed = v.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return undefined;
};
