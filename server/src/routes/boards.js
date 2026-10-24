import { Router } from "express";
import { z } from "zod";
import { Board, Task, User } from "../models.js";
import { HttpError, requireAuth } from "../auth.js";
import { assertMember, assertOwner, loadBoard } from "../access.js";
import { actorDTO, boardDTO, taskDTO } from "../serializers.js";
import { createTaskSchema } from "../schemas.js";

const router = Router();
router.use(requireAuth);

const nameSchema = z.object({ name: z.string().trim().min(1, "El nombre es obligatorio").max(80) });
const memberSchema = z.object({ email: z.email("Email no válido").trim().toLowerCase() });

// Lista de tableros del usuario con el número de tareas por estado
router.get("/", async (req, res) => {
  const boards = await Board.find({ members: req.user._id }).populate("members", "name email").sort({ updatedAt: -1 });
  const counts = await Task.aggregate([
    { $match: { board: { $in: boards.map((b) => b._id) } } },
    { $group: { _id: { board: "$board", status: "$status" }, n: { $sum: 1 } } },
  ]);
  const byBoard = {};
  for (const { _id, n } of counts) {
    (byBoard[_id.board] ??= { todo: 0, doing: 0, done: 0 })[_id.status] = n;
  }
  res.json({
    boards: boards.map((b) => ({ ...boardDTO(b), counts: byBoard[b.id] ?? { todo: 0, doing: 0, done: 0 } })),
  });
});

router.post("/", async (req, res) => {
  const { name } = nameSchema.parse(req.body);
  const board = await Board.create({ name, owner: req.user._id, members: [req.user._id] });
  await board.populate("members", "name email");
  res.status(201).json({ board: boardDTO(board) });
});

router.get("/:id", async (req, res) => {
  const board = await loadBoard(req.params.id, req.user, { populate: true });
  const tasks = await Task.find({ board: board._id }).sort({ status: 1, position: 1 });
  res.json({ board: boardDTO(board), tasks: tasks.map(taskDTO) });
});

router.patch("/:id", async (req, res) => {
  const board = await loadBoard(req.params.id, req.user, { populate: true });
  assertOwner(board, req.user);
  board.name = nameSchema.parse(req.body).name;
  await board.save();
  req.app.locals.rt.toBoard(board.id, "board:updated", { board: boardDTO(board), actor: actorDTO(req.user) });
  res.json({ board: boardDTO(board) });
});

router.delete("/:id", async (req, res) => {
  const board = await loadBoard(req.params.id, req.user);
  assertOwner(board, req.user);
  await Task.deleteMany({ board: board._id });
  await board.deleteOne();
  const { rt } = req.app.locals;
  rt.toBoard(board.id, "board:deleted", { boardId: board.id, actor: actorDTO(req.user) });
  board.members.forEach((m) => rt.toUser(m.toString(), "boards:changed", {}));
  res.status(204).end();
});

// Invitar a un usuario registrado por su email
router.post("/:id/members", async (req, res) => {
  const board = await loadBoard(req.params.id, req.user);
  assertOwner(board, req.user);
  const { email } = memberSchema.parse(req.body);
  const invited = await User.findOne({ email });
  if (!invited) throw new HttpError(404, "No hay ningún usuario registrado con ese email");
  if (board.members.some((m) => m.equals(invited._id))) throw new HttpError(409, "Ya es miembro del tablero");

  board.members.push(invited._id);
  await board.save();
  await board.populate("members", "name email");

  const { rt } = req.app.locals;
  const actor = actorDTO(req.user);
  rt.toBoard(board.id, "board:updated", { board: boardDTO(board), actor });
  rt.toUser(invited.id, "notification", {
    type: "board:invited",
    boardId: board.id,
    message: `${actor.name} te ha añadido al tablero «${board.name}»`,
  });
  rt.toUser(invited.id, "boards:changed", {});
  res.status(201).json({ board: boardDTO(board) });
});

router.delete("/:id/members/:userId", async (req, res) => {
  const board = await loadBoard(req.params.id, req.user);
  const { userId } = req.params;
  const leavingSelf = userId === req.user.id;
  if (!leavingSelf) assertOwner(board, req.user);
  if (userId === board.owner.toString()) throw new HttpError(400, "El propietario no puede salir de su tablero");

  board.members = board.members.filter((m) => m.toString() !== userId);
  await board.save();
  // Sus tareas asignadas quedan sin asignar
  const unassigned = await Task.find({ board: board._id, assignee: userId });
  await Task.updateMany({ board: board._id, assignee: userId }, { assignee: null });
  await board.populate("members", "name email");

  const { rt } = req.app.locals;
  const actor = actorDTO(req.user);
  rt.kickFromBoard(board.id, userId);
  rt.toBoard(board.id, "board:updated", { board: boardDTO(board), actor });
  unassigned.forEach((t) => rt.toBoard(board.id, "task:updated", { task: { ...taskDTO(t), assignee: null }, actor }));
  rt.toUser(userId, "boards:changed", {});
  if (!leavingSelf) {
    rt.toUser(userId, "notification", {
      type: "board:removed",
      boardId: board.id,
      message: `${actor.name} te ha quitado del tablero «${board.name}»`,
    });
  }
  res.json({ board: boardDTO(board) });
});

router.post("/:id/tasks", async (req, res) => {
  const board = await loadBoard(req.params.id, req.user);
  const data = createTaskSchema.parse(req.body);
  assertMember(board, data.assignee);
  const status = data.status ?? "todo";
  const last = await Task.findOne({ board: board._id, status }).sort({ position: -1 });

  const task = await Task.create({
    ...data,
    status,
    board: board._id,
    position: last ? last.position + 1 : 0,
    createdBy: req.user._id,
  });

  const { rt } = req.app.locals;
  const actor = actorDTO(req.user);
  rt.toBoard(board.id, "task:created", { task: taskDTO(task), actor });
  if (task.assignee && !task.assignee.equals(req.user._id)) {
    rt.toUser(task.assignee.toString(), "notification", {
      type: "task:assigned",
      boardId: board.id,
      message: `${actor.name} te ha asignado «${task.title}» en «${board.name}»`,
    });
  }
  res.status(201).json({ task: taskDTO(task) });
});

export default router;
