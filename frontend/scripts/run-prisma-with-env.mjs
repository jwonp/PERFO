import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const [, , envTarget, ...prismaArgs] = process.argv;

if (!envTarget || prismaArgs.length === 0) {
  console.error("Usage: node scripts/run-prisma-with-env.mjs <dev|prod|env-file> <prisma args...>");
  process.exit(1);
}

const frontendDir = process.cwd();
const projectRoot = path.resolve(frontendDir, "..");

const resolveEnvFile = (target) => {
  if (target === "dev") {
    return path.join(projectRoot, ".env.dev");
  }

  if (target === "prod") {
    return path.join(projectRoot, ".env");
  }

  return path.resolve(frontendDir, target);
};

const parseEnvFile = (filePath) => {
  const content = readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
};

const buildHostDatabaseUrl = (envValues) => {
  const user = envValues.POSTGRES_USER;
  const password = envValues.POSTGRES_PASSWORD;
  const database = envValues.POSTGRES_DB;
  const port = envValues.POSTGRES_PORT ?? "5432";

  if (!user || !password || !database) {
    return undefined;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:${port}/${database}`;
};

const envFilePath = resolveEnvFile(envTarget);

const fileEnv = existsSync(envFilePath) ? parseEnvFile(envFilePath) : {};
const databaseUrl = process.env.DATABASE_URL ?? buildHostDatabaseUrl(fileEnv) ?? fileEnv.DATABASE_URL;

if (!databaseUrl) {
  const envHint = existsSync(envFilePath) ? envFilePath : `${envFilePath} (missing)`;
  console.error(`DATABASE_URL could not be resolved from process.env or ${envHint}`);
  process.exit(1);
}

const child = spawn(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "prisma", ...prismaArgs],
  {
    cwd: frontendDir,
    env: {
      ...fileEnv,
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
