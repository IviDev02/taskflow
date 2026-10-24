import bcrypt from "bcryptjs";
import { Board, Task, User } from "./models.js";

export const DEMO = { email: "demo@taskflow.dev", password: "demo12345" };

// Datos de ejemplo para la base de datos en memoria, que empieza vacía en cada arranque
export async function seedDemo() {
  if (await User.exists({ email: DEMO.email })) return;

  const passwordHash = await bcrypt.hash(DEMO.password, 10);
  const [demo, laura] = await User.create([
    { name: "Iván Demo", email: DEMO.email, passwordHash },
    { name: "Laura Martínez", email: "laura@taskflow.dev", passwordHash },
  ]);
  const board = await Board.create({ name: "Lanzamiento v1", owner: demo._id, members: [demo._id, laura._id] });

  const tasks = [
    ["todo", "Diseñar el esquema de la API", "Endpoints, validaciones y códigos de error.", demo],
    ["todo", "Notificaciones en tiempo real", "Avisar al asignar tareas o invitar al tablero.", laura],
    ["doing", "Tablero kanban con arrastrar y soltar", "Reordenar dentro de la columna y entre columnas.", demo],
    ["doing", "Configurar Docker Compose", "MongoDB, API y Nginx como proxy de los WebSockets.", laura],
    ["done", "Autenticación con JWT", "Registro, inicio de sesión y contraseñas con bcrypt.", demo],
  ];
  const positions = {};
  await Task.create(
    tasks.map(([status, title, description, assignee]) => ({
      board: board._id,
      status,
      title,
      description,
      assignee: assignee._id,
      createdBy: demo._id,
      position: (positions[status] = (positions[status] ?? -1) + 1),
    }))
  );
  console.log(`✔ Cuenta demo: ${DEMO.email} / ${DEMO.password}`);
}
