import mongoose from "mongoose";

let memoryServer;

// Conecta a MONGO_URI o, si no hay, levanta un MongoDB en memoria.
// Así el proyecto arranca sin instalar nada (los datos se pierden al parar).
export async function connectDB(uri) {
  if (!uri) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    // La primera vez descarga el binario de MongoDB, por eso el margen amplio
    memoryServer = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    uri = memoryServer.getUri("taskflow");
    console.log("⚠  Sin MONGO_URI: usando MongoDB en memoria");
  }
  await mongoose.connect(uri);
  return uri;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  await memoryServer?.stop();
}
