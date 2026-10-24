import { useState } from "react";
import Modal from "./Modal.jsx";
import { COLUMNS, LABELS, PRIORITIES } from "../lib/tasks.js";

export default function TaskModal({ task, members, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    assignee: task.assignee ?? "",
    priority: task.priority,
    labels: task.labels,
    dueDate: task.dueDate ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleLabel = (id) =>
    setForm((f) => ({ ...f, labels: f.labels.includes(id) ? f.labels.filter((l) => l !== id) : [...f.labels, id] }));
  const creator = members.find((m) => m.id === task.createdBy);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, assignee: form.assignee || null, dueDate: form.dueDate || null });
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Editar tarea" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Título</span>
          <input value={form.title} onChange={set("title")} required maxLength={140} autoFocus />
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea value={form.description} onChange={set("description")} rows={3} maxLength={2000} placeholder="Añade más detalles…" />
        </label>

        <div className="field">
          <span>Prioridad</span>
          <div className="segmented" role="radiogroup" aria-label="Prioridad">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={form.priority === p.id}
                className={`seg priority-${p.id} ${form.priority === p.id ? "active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, priority: p.id }))}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Etiquetas</span>
          <div className="label-picker">
            {LABELS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={form.labels.includes(l.id)}
                className={`label label-${l.id} ${form.labels.includes(l.id) ? "on" : "off"}`}
                onClick={() => toggleLabel(l.id)}
              >
                {form.labels.includes(l.id) && "✓ "}{l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Asignada a</span>
            <select value={form.assignee} onChange={set("assignee")}>
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fecha límite</span>
            <div className="row">
              <input type="date" value={form.dueDate} onChange={set("dueDate")} />
              {form.dueDate && (
                <button type="button" className="icon-btn" onClick={() => setForm((f) => ({ ...f, dueDate: "" }))} aria-label="Quitar fecha">×</button>
              )}
            </div>
          </label>
        </div>

        <p className="meta">
          {COLUMNS.find((c) => c.id === task.status)?.title}
          {creator && ` · Creada por ${creator.name}`}
          {` · ${new Date(task.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="row spread">
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={async () => {
              if (confirm("¿Eliminar esta tarea?")) {
                await onDelete();
                onClose();
              }
            }}
          >
            Eliminar
          </button>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
