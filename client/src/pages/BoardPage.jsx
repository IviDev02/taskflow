import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useSocket, useSocketEvents } from "../lib/socket.jsx";
import { useToasts } from "../lib/toasts.jsx";
import { COLUMNS, applyMoves, byPosition, moveTask, upsertTask } from "../lib/tasks.js";
import Avatar from "../components/Avatar.jsx";
import Column from "../components/Column.jsx";
import TaskModal from "../components/TaskModal.jsx";
import MembersModal from "../components/MembersModal.jsx";

export default function BoardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const { push } = useToasts();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [online, setOnline] = useState(new Set());
  const [draggingId, setDraggingId] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api(`/boards/${id}`);
      setBoard(data.board);
      setTasks(data.tasks);
    } catch (err) {
      push(err.message, { type: "warning" });
      navigate("/");
    }
  }, [id, push, navigate]);
  useEffect(() => {
    load();
  }, [load]);

  // Entrar en la sala del tablero (y volver a entrar tras una reconexión)
  useEffect(() => {
    if (!socket) return;
    let rejoining = false;
    const join = () => {
      socket.emit("board:join", id, (res) => {
        // Tras una reconexión, resincroniza por si hubo cambios mientras tanto
        if (res?.ok && rejoining) load();
        rejoining = true;
      });
    };
    if (socket.connected) join();
    socket.on("connect", join);
    return () => {
      socket.off("connect", join);
      socket.emit("board:leave");
    };
  }, [socket, id, load]);

  const fromOther = (actor) => actor && actor.id !== user.id;
  const notify = (actor, message) => fromOther(actor) && push(`${actor.name} ${message}`);

  useSocketEvents(
    {
      "task:created": ({ task, actor }) => {
        setTasks((ts) => upsertTask(ts, task));
        notify(actor, `ha creado «${task.title}»`);
      },
      "task:updated": ({ task }) => setTasks((ts) => upsertTask(ts, task)),
      "task:deleted": ({ taskId, title, actor }) => {
        setTasks((ts) => ts.filter((t) => t.id !== taskId));
        setOpenTaskId((open) => (open === taskId ? null : open));
        notify(actor, `ha eliminado «${title}»`);
      },
      "tasks:moved": ({ moves, actor, message }) => {
        setTasks((ts) => applyMoves(ts, moves));
        if (message) notify(actor, message);
      },
      "board:updated": ({ board }) => setBoard(board),
      "board:deleted": ({ actor }) => {
        push(`${actor.name} ha eliminado el tablero`, { type: "warning" });
        navigate("/");
      },
      presence: ({ boardId, users }) => boardId === id && setOnline(new Set(users.map((u) => u.id))),
      notification: (n) => n.type === "board:removed" && n.boardId === id && navigate("/"),
    },
    [id, user.id]
  );

  const columns = useMemo(
    () => Object.fromEntries(COLUMNS.map((c) => [c.id, tasks.filter((t) => t.status === c.id).sort(byPosition)])),
    [tasks]
  );

  if (!board) return <div className="splash"><span className="spinner" /></div>;

  const isOwner = board.owner === user.id;
  const openTask = tasks.find((t) => t.id === openTaskId);
  const total = tasks.length;
  const pct = total ? Math.round((columns.done.length / total) * 100) : 0;

  const handleDrop = async (taskId, status, index) => {
    setDraggingId(null);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    // Soltar en el mismo sitio no hace nada
    if (task.status === status && columns[status].findIndex((t) => t.id === taskId) === index) return;

    setTasks((ts) => moveTask(ts, taskId, status, index)); // optimista
    try {
      await api(`/tasks/${taskId}/move`, { method: "PATCH", body: { status, index } });
    } catch (err) {
      push(err.message, { type: "warning" });
      load();
    }
  };

  const createTask = async (status, title) => {
    const { task } = await api(`/boards/${id}/tasks`, { method: "POST", body: { title, status } });
    setTasks((ts) => upsertTask(ts, task));
  };

  const saveTask = async (changes) => {
    const { task } = await api(`/tasks/${openTaskId}`, { method: "PATCH", body: changes });
    setTasks((ts) => upsertTask(ts, task));
  };

  const deleteTask = async () => {
    await api(`/tasks/${openTaskId}`, { method: "DELETE" });
    setTasks((ts) => ts.filter((t) => t.id !== openTaskId));
  };

  const renameBoard = async (name) => {
    setEditingName(false);
    if (!name.trim() || name.trim() === board.name) return;
    try {
      const { board: updated } = await api(`/boards/${id}`, { method: "PATCH", body: { name: name.trim() } });
      setBoard(updated);
    } catch (err) {
      push(err.message, { type: "warning" });
    }
  };

  const deleteBoard = async () => {
    if (!confirm(`¿Eliminar «${board.name}» y todas sus tareas? No se puede deshacer.`)) return;
    await api(`/boards/${id}`, { method: "DELETE" });
    navigate("/");
  };

  const invite = async (email) => {
    const { board: updated } = await api(`/boards/${id}/members`, { method: "POST", body: { email } });
    setBoard(updated);
    push(`Has invitado a ${email}`, { type: "success" });
  };

  const removeMember = async (memberId) => {
    const leaving = memberId === user.id;
    if (leaving && !confirm("¿Salir de este tablero?")) return;
    const { board: updated } = await api(`/boards/${id}/members/${memberId}`, { method: "DELETE" });
    if (leaving) return navigate("/");
    setBoard(updated);
  };

  return (
    <div className="page board-page">
      <div className="board-head">
        <div className="board-title">
          <Link to="/" className="back">← Tableros</Link>
          {editingName ? (
            <input
              className="title-input"
              defaultValue={board.name}
              autoFocus
              maxLength={80}
              onBlur={(e) => renameBoard(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
          ) : (
            <h1
              className={isOwner ? "editable" : ""}
              onClick={() => isOwner && setEditingName(true)}
              title={isOwner ? "Haz clic para renombrar" : undefined}
            >
              {board.name}
            </h1>
          )}
          <div className="progress small" title={`${pct}% completado`}><span style={{ width: `${pct}%` }} /></div>
          <span className="muted small-text">{pct}% completado · {total} tareas</span>
        </div>

        <div className="board-actions">
          <button className="avatars stacked" onClick={() => setShowMembers(true)} title="Ver miembros">
            {board.members.slice(0, 5).map((m) => (
              <Avatar key={m.id} user={m} size={32} online={online.has(m.id)} title={`${m.name}${online.has(m.id) ? " · en línea" : ""}`} />
            ))}
            {board.members.length > 5 && <span className="more">+{board.members.length - 5}</span>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowMembers(true)}>
            {isOwner ? "+ Invitar" : "Miembros"}
          </button>
          {isOwner && <button className="btn btn-ghost btn-sm danger-text" onClick={deleteBoard}>Eliminar</button>}
        </div>
      </div>

      <div className="columns">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={columns[column.id]}
            members={board.members}
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDragEnd={() => setDraggingId(null)}
            onDrop={handleDrop}
            onOpen={(t) => setOpenTaskId(t.id)}
            onCreate={createTask}
          />
        ))}
      </div>

      {openTask && (
        <TaskModal
          key={openTask.id}
          task={openTask}
          members={board.members}
          onSave={saveTask}
          onDelete={deleteTask}
          onClose={() => setOpenTaskId(null)}
        />
      )}
      {showMembers && (
        <MembersModal
          board={board}
          me={user}
          online={online}
          onInvite={invite}
          onRemove={removeMember}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
