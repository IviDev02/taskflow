import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { HttpError } from "./auth.js";
import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/boards.js";
import taskRoutes from "./routes/tasks.js";

// app.locals.rt (tiempo real) se asigna después, al montar Socket.io sobre el servidor HTTP
export function createApp({ clientOrigin }) {
  const app = express();

  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/boards", boardRoutes);
  app.use("/api/tasks", taskRoutes);

  app.use("/api", (_req, _res) => {
    throw new HttpError(404, "Ruta no encontrada");
  });

  // Express 5 pasa aquí también los errores de los handlers async
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? "Datos no válidos" });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof mongoose.Error.CastError) return res.status(404).json({ error: "No encontrado" });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON no válido" });
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}
