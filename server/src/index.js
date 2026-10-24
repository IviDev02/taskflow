import http from "node:http";
import { config } from "./config.js";
import { connectDB, disconnectDB } from "./db.js";
import { createApp } from "./app.js";
import { createRealtime } from "./realtime.js";

await connectDB(config.mongoUri);

const server = http.createServer();
const realtime = createRealtime(server, config);
server.on("request", createApp({ clientOrigin: config.clientOrigin, realtime }));

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
