import { useRef, useState } from "react";
import TaskCard from "./TaskCard.jsx";

export default function Column({ column, tasks, members, draggingId, onDragStart, onDragEnd, onDrop, onOpen, onCreate }) {
  const listRef = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  // Índice de inserción según la posición del ratón respecto a las tarjetas
  const indexFromPointer = (y) => {
    const cards = [...listRef.current.querySelectorAll(".task:not(.dragging)")];
    const i = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return i === -1 ? cards.length : i;
  };

  const visible = tasks.filter((t) => t.id !== draggingId);
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate(column.id, title.trim());
    setTitle("");
  };

  return (
    <section
      className={`column column-${column.id} ${dropIndex !== null ? "over" : ""}`}
      onDragOver={(e) => {
        if (!draggingId) return;
        e.preventDefault();
        setDropIndex(indexFromPointer(e.clientY));
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDropIndex(null)}
      onDrop={(e) => {
        e.preventDefault();
        const index = indexFromPointer(e.clientY);
        setDropIndex(null);
        onDrop(e.dataTransfer.getData("text/plain"), column.id, index);
      }}
    >
      <header className="column-head">
        <span className="column-dot" />
        <h3>{column.title}</h3>
        <span className="count">{tasks.length}</span>
      </header>

      <div className="task-list" ref={listRef}>
        {tasks.map((task) => {
          const index = visible.indexOf(task);
          return (
            <div key={task.id} className="task-slot">
              {dropIndex === index && index !== -1 && <div className="drop-line" />}
              <TaskCard
                task={task}
                assignee={members.find((m) => m.id === task.assignee)}
                dragging={task.id === draggingId}
                onOpen={onOpen}
                onDragStart={onDragStart}
                onDragEnd={() => {
                  setDropIndex(null);
                  onDragEnd();
                }}
              />
            </div>
          );
        })}
        {dropIndex === visible.length && <div className="drop-line" />}
        {tasks.length === 0 && dropIndex === null && <p className="empty">Arrastra tareas aquí</p>}
      </div>

      {adding ? (
        <form className="add-task" onSubmit={submit}>
          <textarea
            autoFocus
            rows={2}
            value={title}
            placeholder="¿Qué hay que hacer?"
            maxLength={140}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <div className="row">
            <button className="btn btn-sm">Añadir</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button className="add-btn" onClick={() => setAdding(true)}>+ Añadir tarea</button>
      )}
    </section>
  );
}
