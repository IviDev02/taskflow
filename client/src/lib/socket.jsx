import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router";
import { useAuth } from "./auth.jsx";
import { useToasts } from "./toasts.jsx";

const SocketContext = createContext(null);

// Una conexión por sesión, autenticada con el JWT
export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const { push } = useToasts();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    const s = io({ auth: { token } });
    setSocket(s);

    // Notificaciones personales: invitaciones, asignaciones…
    s.on("notification", (n) => {
      push(n.message, {
        type: n.type === "board:removed" ? "warning" : "info",
        action: n.type === "board:removed" ? null : { label: "Ver", onClick: () => navigate(`/tableros/${n.boardId}`) },
      });
    });

    return () => {
      s.close();
      setSocket(null);
    };
  }, [token, user, push, navigate]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

// Suscribe handlers a eventos del socket mientras el componente está montado
export function useSocketEvents(handlers, deps) {
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const entries = Object.entries(handlers);
    entries.forEach(([event, fn]) => socket.on(event, fn));
    return () => entries.forEach(([event, fn]) => socket.off(event, fn));
  }, [socket, ...deps]);
}
