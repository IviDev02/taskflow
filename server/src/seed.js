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

  // Fechas relativas a hoy para que siempre haya tareas vencidas, próximas y futuras
  const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const tasks = [
    ["todo", "Diseñar el esquema de la API", "Endpoints, validaciones y códigos de error.", demo, "high", ["backend", "docs"], inDays(3)],
    ["todo", "Notificaciones en tiempo real", "Avisar al asignar tareas o invitar al tablero.", laura, "medium", ["feature", "backend"], inDays(10)],
    ["todo", "El menú no se cierra en móvil", "Al tocar fuera del menú lateral no se oculta en iOS.", null, "urgent", ["bug", "frontend"], inDays(-1)],
    ["todo", "Revisar textos de la landing", "", null, "low", ["docs"], null],
    ["doing", "Tablero kanban con arrastrar y soltar", "Reordenar dentro de la columna y entre columnas.", demo, "high", ["feature", "frontend"], inDays(1)],
    ["doing", "Configurar Docker Compose", "MongoDB, API y Nginx como proxy de los WebSockets.", laura, "medium", ["devops"], inDays(5)],
    ["doing", "Rediseño de las tarjetas", "Colores por prioridad y etiquetas más visibles.", laura, "low", ["design", "frontend"], null],
    ["done", "Autenticación con JWT", "Registro, inicio de sesión y contraseñas con bcrypt.", demo, "urgent", ["backend", "feature"], inDays(-4)],
  ];
  const positions = {};
  await Task.create(
    tasks.map(([status, title, description, assignee, priority, labels, dueDate]) => ({
      board: board._id,
      status,
      title,
      description,
      priority,
      labels,
      dueDate,
      assignee: assignee?._id ?? null,
      createdBy: demo._id,
      position: (positions[status] = (positions[status] ?? -1) + 1),
    }))
  );
  console.log(`✔ Cuenta demo: ${DEMO.email} / ${DEMO.password}`);
}
