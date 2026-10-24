import http from "node:http";
import { config } from "./config.js";
import { connectDB, disconnectDB } from "./db.js";
import { createApp } from "./app.js";
import { createRealtime } from "./realtime.js";

await connectDB(config.mongoUri);
if (!config.mongoUri) {
  const { seedDemo } = await import("./seed.js");
  await seedDemo();
}

// Express primero y Socket.io encima: así Socket.io atiende /socket.io y delega el resto en Express
const app = createApp({ clientOrigin: config.clientOrigin });
const server = http.createServer(app);
const realtime = createRealtime(server, config);
app.locals.rt = realtime;

server.listen(config.port, () => {
  console.log(`✔ API de TaskFlow en http://localhost:${config.port}`);
});

const shutdown = async () => {
  realtime.io.close();
  server.close();
  await disconnectDB();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
