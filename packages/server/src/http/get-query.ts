import { Uri } from "@tsonic/dotnet/System.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const getQuery = (ctx: HttpContext, key: string): string | undefined => {
  const raw = ctx.Request.QueryString.Value;
  if (raw === undefined || raw === "") return undefined;

  let qs = raw;
  if (qs.StartsWith("?")) qs = qs.Substring(1);
  if (qs === "") return undefined;

  const pairs = qs.Split("&");
  for (let i = 0; i < pairs.Length; i++) {
    const part = pairs[i];
    if (part === "") continue;

    const kv = part.Split("=");
    const k = Uri.UnescapeDataString(kv[0].Replace("+", " "));
    if (k !== key) continue;

    const v = kv.Length > 1 ? Uri.UnescapeDataString(kv[1].Replace("+", " ")) : "";
    const trimmed = v.Trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return undefined;
};

