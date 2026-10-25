import fs from "node:fs";
import mongoose from "mongoose";

let memoryServer;

// Conecta a MONGO_URI o, si no hay, levanta un MongoDB propio sin instalar nada.
// Con dbPath los datos se guardan en esa carpeta y sobreviven a los reinicios;
// sin él (tests) viven en memoria y se pierden al parar.
export async function connectDB(uri, { dbPath } = {}) {
  if (!uri) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    if (dbPath) fs.mkdirSync(dbPath, { recursive: true });
    memoryServer = await MongoMemoryServer.create({
      // La primera vez descarga el binario de MongoDB, por eso el margen amplio
      instance: { launchTimeout: 60000, ...(dbPath && { dbPath, storageEngine: "wiredTiger" }) },
    });
    uri = memoryServer.getUri("taskflow");
    console.log(dbPath ? `✔ Datos guardados en ${dbPath}` : "⚠  MongoDB en memoria: los datos se pierden al parar");
  }
  await mongoose.connect(uri);
  return uri;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  await memoryServer?.stop();
}
