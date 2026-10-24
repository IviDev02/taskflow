import Avatar from "./Avatar.jsx";

export default function TaskCard({ task, assignee, dragging, onOpen, onDragStart, onDragEnd }) {
  return (
    <article
      className={`task ${dragging ? "dragging" : ""}`}
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
      <h4>{task.title}</h4>
      {task.description && <p>{task.description}</p>}
      {assignee && (
        <footer>
          <Avatar user={assignee} size={22} />
          <span>{assignee.name}</span>
        </footer>
      )}
    </article>
  );
}
