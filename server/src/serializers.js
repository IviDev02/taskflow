import { publicUser } from "./auth.js";

const idOf = (ref) => (ref?._id ?? ref)?.toString() ?? null;

export const boardDTO = (b) => ({
  id: b.id,
  name: b.name,
  owner: idOf(b.owner),
  members: b.members.map((m) => (m.name ? publicUser(m) : { id: idOf(m) })),
  createdAt: b.createdAt,
});

export const taskDTO = (t) => ({
  id: t.id,
  board: idOf(t.board),
  title: t.title,
  description: t.description,
  status: t.status,
  position: t.position,
  assignee: idOf(t.assignee),
  createdBy: idOf(t.createdBy),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

export const actorDTO = (u) => ({ id: u.id, name: u.name });
