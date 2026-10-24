export const COLUMNS = [
  { id: "todo", title: "Por hacer" },
  { id: "doing", title: "En curso" },
  { id: "done", title: "Hecho" },
];

export const PRIORITIES = [
  { id: "low", label: "Baja", icon: "▽" },
  { id: "medium", label: "Media", icon: "◇" },
  { id: "high", label: "Alta", icon: "△" },
  { id: "urgent", label: "Urgente", icon: "▲" },
];
export const priorityOf = (id) => PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1];

export const LABELS = [
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature" },
  { id: "design", label: "Diseño" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "devops", label: "DevOps" },
  { id: "docs", label: "Docs" },
];
export const labelOf = (id) => LABELS.find((l) => l.id === id);

// Estado de la fecha límite: vencida, hoy, pronto (≤ 2 días) o normal
export function dueInfo(dueDate, status) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.round((due - today) / 86400000);
  const text =
    days === 0 ? "Hoy"
    : days === 1 ? "Mañana"
    : days === -1 ? "Ayer"
    : due.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  if (status === "done") return { text, state: "done" };
  return { text, state: days < 0 ? "overdue" : days === 0 ? "today" : days <= 2 ? "soon" : "normal" };
}

export const byPosition = (a, b) => a.position - b.position;

export const upsertTask = (tasks, task) =>
  tasks.some((t) => t.id === task.id) ? tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)) : [...tasks, task];

export const applyMoves = (tasks, moves) => {
  const map = new Map(moves.map((m) => [m.id, m]));
  return tasks.map((t) => (map.has(t.id) ? { ...t, ...map.get(t.id) } : t));
};

// Misma lógica que el servidor: inserta en la columna destino y renumera.
// Se usa para mover al instante (optimista) antes de que responda la API.
export function moveTask(tasks, taskId, status, index) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return tasks;
  const column = (s) => tasks.filter((t) => t.status === s && t.id !== taskId).sort(byPosition);

  const target = column(status);
  target.splice(Math.min(index, target.length), 0, { ...task, status });
  const moves = target.map((t, position) => ({ id: t.id, status, position }));
  if (task.status !== status) {
    column(task.status).forEach((t, position) => moves.push({ id: t.id, status: t.status, position }));
  }
  return applyMoves(tasks, moves);
}
