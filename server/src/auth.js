import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { User } from "./models.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const signToken = (user) =>
  jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Devuelve el usuario del token o null si no es válido
export async function userFromToken(token) {
  try {
    const { sub } = jwt.verify(token, config.jwtSecret);
    return await User.findById(sub);
  } catch {
    return null;
  }
}

export async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  const user = scheme === "Bearer" && token ? await userFromToken(token) : null;
  if (!user) throw new HttpError(401, "No autenticado");
  req.user = user;
  next();
}

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
