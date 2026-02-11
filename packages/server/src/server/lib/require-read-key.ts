import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { ClickmeterDb } from "../../db/clickmeter-db.ts";
import { writeJson } from "../../http/write-json.ts";
import { getBearerToken } from "./get-bearer-token.ts";
import { serializeError } from "./serialize-error.ts";

export interface ReadKeyAuthOk {
  property_id: string;
}

export interface ReadKeyAuthError {
  error: Task;
}

export type ReadKeyAuthResult = ReadKeyAuthOk | ReadKeyAuthError;

export const requireReadKey = async (db: ClickmeterDb, ctx: HttpContext): Promise<ReadKeyAuthResult> => {
  const token = getBearerToken(ctx);
  if (!token) return { error: writeJson(ctx.Response, 401, serializeError("unauthorized", "Missing bearer token")) };

  const key = await db.lookupKey(token);
  if (!key || key.kind !== "read") {
    return { error: writeJson(ctx.Response, 401, serializeError("unauthorized", "Invalid read key")) };
  }
  return { property_id: key.property_id };
};
