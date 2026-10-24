import { Router } from "express";
import { z } from "zod";
import { Task, STATUSES } from "../models.js";
import { HttpError, requireAuth } from "../auth.js";
import { assertMember, loadBoard } from "../access.js";
import { actorDTO, taskDTO } from "../serializers.js";

const router = Router();
router.use(requireAuth);

const updateSchema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio").max(140),
    description: z.string().trim().max(2000),
    assignee: z.string().nullable(),
  })
  .partial();
const moveSchema = z.object({
  status: z.enum(STATUSES),
  index: z.number().int().min(0),
});

const STATUS_LABEL = { todo: "Por hacer", doing: "En curso", done: "Hecho" };

// Carga la tarea comprobando que el usuario es miembro de su tablero
async function loadTask(taskId, user) {
  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, "Tarea no encontrada");
  const board = await loadBoard(task.board, user);
  return { task, board };
}

router.patch("/:id", async (req, res) => {
  const { task, board } = await loadTask(req.params.id, req.user);
  const data = updateSchema.parse(req.body);
  if ("assignee" in data) assertMember(board, data.assignee);
  const previousAssignee = task.assignee?.toString() ?? null;
  task.set(data);
  await task.save();

  const { rt } = req.app.locals;
  const actor = actorDTO(req.user);
  rt.toBoard(board.id, "task:updated", { task: taskDTO(task), actor });
  const assignee = task.assignee?.toString();
  if (assignee && assignee !== previousAssignee && assignee !== req.user.id) {
    rt.toUser(assignee, "notification", {
      type: "task:assigned",
      boardId: board.id,
      message: `${actor.name} te ha asignado «${task.title}» en «${board.name}»`,
    });
  }
  res.json({ task: taskDTO(task) });
});

// Mueve la tarea a una columna y posición, y renumera las columnas afectadas
router.patch("/:id/move", async (req, res) => {
  const { task, board } = await loadTask(req.params.id, req.user);
  const { status, index } = moveSchema.parse(req.body);
  const from = task.status;

  const target = await Task.find({ board: board._id, status, _id: { $ne: task._id } }).sort({ position: 1 });
  target.splice(Math.min(index, target.length), 0, task);
  task.status = status;

  const columns = [target];
  if (from !== status) {
    columns.push(await Task.find({ board: board._id, status: from, _id: { $ne: task._id } }).sort({ position: 1 }));
  }

  const changed = [];
  for (const col of columns) {
    col.forEach((t, position) => {
      if (t.position !== position || t === task) {
        t.position = position;
        changed.push(t);
      }
    });
  }
  await Task.bulkWrite(
    changed.map((t) => ({
      updateOne: { filter: { _id: t._id }, update: { $set: { status: t.status, position: t.position } } },
    }))
  );

  const moves = changed.map((t) => ({ id: t.id, status: t.status, position: t.position }));
  req.app.locals.rt.toBoard(board.id, "tasks:moved", {
    moves,
    task: { id: task.id, title: task.title },
    from,
    to: status,
    actor: actorDTO(req.user),
    message: from !== status ? `ha movido «${task.title}» a ${STATUS_LABEL[status]}` : null,
  });
  res.json({ moves });
});

router.delete("/:id", async (req, res) => {
  const { task, board } = await loadTask(req.params.id, req.user);
  await task.deleteOne();
  req.app.locals.rt.toBoard(board.id, "task:deleted", {
    taskId: task.id,
    title: task.title,
    actor: actorDTO(req.user),
  });
  res.status(204).end();
});

export default router;
