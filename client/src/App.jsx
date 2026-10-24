import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./lib/auth.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import BoardsPage from "./pages/BoardsPage.jsx";
import BoardPage from "./pages/BoardPage.jsx";
import Header from "./components/Header.jsx";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="splash"><span className="spinner" /></div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/registro" element={<AuthPage mode="register" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<BoardsPage />} />
          <Route path="/tableros/:id" element={<BoardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
