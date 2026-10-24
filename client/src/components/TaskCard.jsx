import Avatar from "./Avatar.jsx";
import { dueInfo, labelOf, priorityOf } from "../lib/tasks.js";

export default function TaskCard({ task, assignee, dragging, onOpen, onDragStart, onDragEnd }) {
  const priority = priorityOf(task.priority);
  const due = dueInfo(task.dueDate, task.status);

  return (
    <article
      className={`task prio-${priority.id} ${dragging ? "dragging" : ""}`}
      draggable
      data-task-id={task.id}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
      tabIndex={0}
    >
      {task.labels.length > 0 && (
        <div className="labels">
          {task.labels.map((id) => (
            <span key={id} className={`label label-${id}`}>{labelOf(id)?.label ?? id}</span>
          ))}
        </div>
      )}
      <h4>{task.title}</h4>
      {task.description && <p>{task.description}</p>}
      <footer>
        <span className={`priority priority-${priority.id}`} title={`Prioridad ${priority.label.toLowerCase()}`}>
          {priority.icon} {priority.label}
        </span>
        {due && (
          <span className={`due due-${due.state}`} title={due.state === "overdue" ? "Vencida" : "Fecha límite"}>
            {due.state === "overdue" ? "⚠" : "📅"} {due.text}
          </span>
        )}
        {assignee && <Avatar user={assignee} size={24} />}
      </footer>
    </article>
  );
}
