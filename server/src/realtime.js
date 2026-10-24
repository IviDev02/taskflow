import { Server } from "socket.io";
import { userFromToken } from "./auth.js";
import { Board } from "./models.js";

const boardRoom = (id) => `board:${id}`;
const userRoom = (id) => `user:${id}`;

// boardId -> Map<userId, { name, sockets }>  (quién está viendo cada tablero)
const presence = new Map();

export function createRealtime(httpServer, { clientOrigin }) {
  const io = new Server(httpServer, { cors: { origin: clientOrigin } });

  // Autenticación del socket con el mismo JWT que la API
  io.use(async (socket, next) => {
    const user = await userFromToken(socket.handshake.auth?.token);
    if (!user) return next(new Error("No autenticado"));
    socket.data.user = { id: user.id, name: user.name };
    next();
  });

  io.on("connection", (socket) => {
    const { user } = socket.data;
    socket.join(userRoom(user.id));

    socket.on("board:join", async (boardId, ack) => {
      const isMember = await Board.exists({ _id: boardId, members: user.id }).catch(() => null);
      if (!isMember) return ack?.({ ok: false });
      leaveCurrentBoard(io, socket);
      socket.join(boardRoom(boardId));
      socket.data.boardId = boardId;
      addPresence(boardId, user);
      emitPresence(io, boardId);
      ack?.({ ok: true });
    });

    socket.on("board:leave", () => leaveCurrentBoard(io, socket));
    socket.on("disconnect", () => leaveCurrentBoard(io, socket));
  });

  return {
    io,
    toBoard: (boardId, event, payload) => io.to(boardRoom(boardId)).emit(event, payload),
    toUser: (userId, event, payload) => io.to(userRoom(userId)).emit(event, payload),
    // Expulsa de la sala a un usuario que ya no es miembro
    kickFromBoard: (boardId, userId) => {
      io.in(userRoom(userId)).socketsLeave(boardRoom(boardId));
      presence.get(boardId)?.delete(userId);
      emitPresence(io, boardId);
    },
  };
}

function leaveCurrentBoard(io, socket) {
  const { boardId, user } = socket.data;
  if (!boardId) return;
  socket.leave(boardRoom(boardId));
  socket.data.boardId = null;
  removePresence(boardId, user);
  emitPresence(io, boardId);
}

function addPresence(boardId, user) {
  if (!presence.has(boardId)) presence.set(boardId, new Map());
  const users = presence.get(boardId);
  const entry = users.get(user.id) ?? { name: user.name, sockets: 0 };
  entry.sockets++;
  users.set(user.id, entry);
}

function removePresence(boardId, user) {
  const users = presence.get(boardId);
  const entry = users?.get(user.id);
  if (!entry) return;
  if (--entry.sockets <= 0) users.delete(user.id);
  if (users.size === 0) presence.delete(boardId);
}

function emitPresence(io, boardId) {
  const users = [...(presence.get(boardId) ?? new Map())].map(([id, { name }]) => ({ id, name }));
  io.to(boardRoom(boardId)).emit("presence", { boardId, users });
}
