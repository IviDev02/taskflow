import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useSocketEvents } from "../lib/socket.jsx";
import Avatar from "../components/Avatar.jsx";

export default function BoardsPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api("/boards")
      .then(({ boards }) => setBoards(boards))
      .catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  // Si me invitan o me quitan de un tablero, la lista se actualiza sola
  useSocketEvents({ "boards:changed": load }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { board } = await api("/boards", { method: "POST", body: { name: name.trim() } });
      setBoards((bs) => [{ ...board, counts: { todo: 0, doing: 0, done: 0 } }, ...bs]);
      setName("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Hola, {user.name.split(" ")[0]} 👋</h1>
          <p className="muted">Tus tableros y los que comparten contigo.</p>
        </div>
        <form className="new-board" onSubmit={create}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del nuevo tablero" maxLength={80} />
          <button className="btn">Crear tablero</button>
        </form>
      </div>
      {error && <p className="form-error">{error}</p>}

      {boards === null ? (
        <div className="splash"><span className="spinner" /></div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <h2>Aún no tienes tableros</h2>
          <p className="muted">Crea el primero para empezar a organizar tareas con tu equipo.</p>
        </div>
      ) : (
        <div className="boards">
          {boards.map((b) => {
            const total = b.counts.todo + b.counts.doing + b.counts.done;
            const pct = total ? Math.round((b.counts.done / total) * 100) : 0;
            return (
              <Link key={b.id} to={`/tableros/${b.id}`} className="board-card">
                <div className="board-card-head">
                  <h3>{b.name}</h3>
                  {b.owner !== user.id && <span className="badge">Compartido</span>}
                </div>
                <div className="stats">
                  <span><i className="dot todo" />{b.counts.todo} por hacer</span>
                  <span><i className="dot doing" />{b.counts.doing} en curso</span>
                  <span><i className="dot done" />{b.counts.done} hechas</span>
                </div>
                <div className="progress" title={`${pct}% completado`}><span style={{ width: `${pct}%` }} /></div>
                <div className="avatars">
                  {b.members.slice(0, 5).map((m) => <Avatar key={m.id} user={m} size={26} />)}
                  {b.members.length > 5 && <span className="more">+{b.members.length - 5}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
