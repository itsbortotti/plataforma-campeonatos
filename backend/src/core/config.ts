import path from "node:path";
import { ensureUploadDirs } from "./upload-dirs.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

const uploadDir = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "./data/uploads",
);
ensureUploadDirs(uploadDir);

export const config = {
  port: Number(process.env.PORT || 4006),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  cookieName: process.env.COOKIE_NAME || "sfl_token",
  corsOrigins: (process.env.CORS_ORIGINS || "http://127.0.0.1:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  publicApiUrl: process.env.PUBLIC_API_URL || "http://127.0.0.1:4006",
  uploadDir,
  cronSecret: process.env.CRON_SECRET || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    "http://127.0.0.1:4006/api/auth/google/callback",
};
