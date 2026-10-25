import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET es obligatorio en producción");
}

const dataDir = path.resolve(process.env.DATA_DIR || fileURLToPath(new URL("../data", import.meta.url)));

// Sin JWT_SECRET se genera uno aleatorio y se guarda junto a los datos,
// así las sesiones sobreviven a los reinicios y nadie puede adivinarlo
function localSecret() {
  const file = path.join(dataDir, "jwt-secret");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const secret = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, secret);
  return secret;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI || "", // vacío → MongoDB local guardado en dataDir
  dataDir,
  jwtSecret: process.env.JWT_SECRET || localSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  clientDist: fileURLToPath(new URL("../../client/dist", import.meta.url)),
};
