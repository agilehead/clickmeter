import { Environment } from "@tsonic/dotnet/System.js";

export type ServerConfig = {
  readonly listenUrl: string;
  readonly dbPath: string;
  readonly adminToken?: string;
};

export const loadConfig = (): ServerConfig => {
  const listenUrl = Environment.GetEnvironmentVariable("CLICKMETER_LISTEN_URL") ?? "http://localhost:8085";
  const dbPath = Environment.GetEnvironmentVariable("CLICKMETER_DB") ?? "clickmeter.db";
  const adminToken = Environment.GetEnvironmentVariable("CLICKMETER_ADMIN_TOKEN") ?? undefined;

  return { listenUrl, dbPath, adminToken };
};
