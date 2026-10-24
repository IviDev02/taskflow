export const COLUMNS = [
  { id: "todo", title: "Por hacer" },
  { id: "doing", title: "En curso" },
  { id: "done", title: "Hecho" },
];

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
