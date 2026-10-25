import http from "node:http";
import os from "node:os";
import { config } from "./config.js";
import { connectDB, disconnectDB } from "./db.js";
import { createApp } from "./app.js";
import { createRealtime } from "./realtime.js";

await connectDB(config.mongoUri, { dbPath: config.dataDir });
if (!config.mongoUri) {
  const { seedDemo } = await import("./seed.js");
  await seedDemo();
}

// Express primero y Socket.io encima: así Socket.io atiende /socket.io y delega el resto en Express
const app = createApp({ clientOrigin: config.clientOrigin, clientDist: config.clientDist });
const server = http.createServer(app);
const realtime = createRealtime(server, config);
app.locals.rt = realtime;

server.listen(config.port, () => {
  console.log(`✔ TaskFlow en http://localhost:${config.port}`);
  // Direcciones para entrar desde otros dispositivos de la misma red
  for (const { address, family, internal } of Object.values(os.networkInterfaces()).flat()) {
    if (family === "IPv4" && !internal) console.log(`  En tu red: http://${address}:${config.port}`);
  }
});

const shutdown = async () => {
  realtime.io.close();
  server.close();
  await disconnectDB();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
