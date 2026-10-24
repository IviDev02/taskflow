import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth.jsx";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-side">
        <div className="brand big"><span className="brand-logo">✓</span>TaskFlow</div>
        <h1>Organiza el trabajo de tu equipo <span className="gradient">en tiempo real</span>.</h1>
        <ul className="features">
          <li>Tableros kanban con arrastrar y soltar</li>
          <li>Cambios sincronizados al instante con WebSockets</li>
          <li>Invita a tu equipo y asigna tareas</li>
          <li>Notificaciones y presencia en vivo</li>
        </ul>
      </div>

      <form className="auth-card form" onSubmit={submit}>
        <h2>{isLogin ? "Inicia sesión" : "Crea tu cuenta"}</h2>
        <p className="muted">{isLogin ? "Bienvenido de nuevo 👋" : "Empieza gratis en segundos"}</p>

        {!isLogin && (
          <label className="field">
            <span>Nombre</span>
            <input value={form.name} onChange={set("name")} required minLength={2} maxLength={60} autoComplete="name" placeholder="Tu nombre" />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set("email")} required autoComplete="email" placeholder="tu@email.com" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            required
            minLength={isLogin ? 1 : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={isLogin ? "••••••••" : "Mínimo 8 caracteres"}
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-block" disabled={sending}>
          {sending ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}
        </button>
        <p className="switch">
          {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <Link to={isLogin ? "/registro" : "/login"}>{isLogin ? "Regístrate" : "Inicia sesión"}</Link>
        </p>
      </form>
    </div>
  );
}
