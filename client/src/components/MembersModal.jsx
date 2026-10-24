import { useState } from "react";
import Modal from "./Modal.jsx";
import Avatar from "./Avatar.jsx";

export default function MembersModal({ board, me, online, onInvite, onRemove, onClose }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const isOwner = board.owner === me.id;

  const invite = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await onInvite(email.trim());
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Miembros del tablero" onClose={onClose}>
      <ul className="members">
        {board.members.map((m) => (
          <li key={m.id}>
            <Avatar user={m} size={34} online={online.has(m.id)} />
            <div>
              <strong>{m.name}{m.id === me.id && " (tú)"}</strong>
              <span>{m.email}</span>
            </div>
            {m.id === board.owner ? (
              <span className="badge">Propietario</span>
            ) : (
              (isOwner || m.id === me.id) && (
                <button className="btn btn-ghost btn-sm" onClick={() => onRemove(m.id)}>
                  {m.id === me.id ? "Salir" : "Quitar"}
                </button>
              )
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <form className="form invite" onSubmit={invite}>
          <label className="field">
            <span>Invitar por email</span>
            <div className="row">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="compañero@email.com" />
              <button className="btn" disabled={sending}>Invitar</button>
            </div>
          </label>
          <p className="hint">La persona debe tener una cuenta en TaskFlow. Recibirá una notificación al instante.</p>
          {error && <p className="form-error">{error}</p>}
        </form>
      )}
    </Modal>
  );
}
