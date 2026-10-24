import { useState } from "react";
import Modal from "./Modal.jsx";
import { COLUMNS } from "../lib/tasks.js";

export default function TaskModal({ task, members, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    assignee: task.assignee ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const creator = members.find((m) => m.id === task.createdBy);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, assignee: form.assignee || null });
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
          <textarea value={form.description} onChange={set("description")} rows={4} maxLength={2000} placeholder="Añade más detalles…" />
        </label>
        <label className="field">
          <span>Asignada a</span>
          <select value={form.assignee} onChange={set("assignee")}>
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
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
