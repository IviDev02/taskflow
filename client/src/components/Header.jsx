import { Link } from "react-router";
import { useAuth } from "../lib/auth.jsx";
import { useSocket } from "../lib/socket.jsx";
import { useEffect, useState } from "react";
import Avatar from "./Avatar.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const update = () => setConnected(socket.connected);
    update();
    socket.on("connect", update);
    socket.on("disconnect", update);
    return () => {
      socket.off("connect", update);
      socket.off("disconnect", update);
    };
  }, [socket]);

  return (
    <header className="header">
      <Link to="/" className="brand">
        <span className="brand-logo">✓</span>TaskFlow
      </Link>
      <span className={`conn ${connected ? "on" : ""}`} title={connected ? "Conectado en tiempo real" : "Reconectando…"}>
        <span className="conn-dot" />
        {connected ? "En vivo" : "Reconectando…"}
      </span>
      <div className="header-user">
        <Avatar user={user} size={30} />
        <span className="header-name">{user.name}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
      </div>
    </header>
  );
}
