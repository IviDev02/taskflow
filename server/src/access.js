import { Board } from "./models.js";
import { HttpError } from "./auth.js";

// Carga un tablero solo si el usuario es miembro (si no, 404 para no filtrar su existencia)
export async function loadBoard(boardId, user, { populate = false } = {}) {
  const query = Board.findOne({ _id: boardId, members: user._id });
  const board = await (populate ? query.populate("members", "name email") : query);
  if (!board) throw new HttpError(404, "Tablero no encontrado");
  return board;
}

export function assertOwner(board, user) {
  if (board.owner.toString() !== user.id) {
    throw new HttpError(403, "Solo el propietario del tablero puede hacer esto");
  }
}

export function assertMember(board, userId) {
  if (userId && !board.members.some((m) => (m._id ?? m).toString() === userId)) {
    throw new HttpError(400, "El usuario asignado no es miembro del tablero");
  }
}
