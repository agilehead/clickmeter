import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenvConfig();

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.CLICKMETER_DB || join(__dirname, "clickmeter.db");

const sqliteConfig = {
  development: {
    client: "sqlite3",
    connection: {
      filename: dbPath,
    },
    migrations: {
      directory: join(__dirname, "database", "clickmeter", "sqlite", "migrations"),
    },
    useNullAsDefault: true,
  },

  test: {
    client: "sqlite3",
    connection: ":memory:",
    migrations: {
      directory: join(__dirname, "database", "clickmeter", "sqlite", "migrations"),
    },
    useNullAsDefault: true,
  },

  production: {
    client: "sqlite3",
    connection: {
      filename: dbPath,
    },
    migrations: {
      directory: join(__dirname, "database", "clickmeter", "sqlite", "migrations"),
    },
    useNullAsDefault: true,
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default sqliteConfig;

