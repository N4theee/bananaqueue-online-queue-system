import { useState, useEffect } from "react";
import "./index.css";
import { apiFetch, getSocket, disconnectSocket } from "./helpers.jsx";
import { Sidebar, AuthScreen }                   from "./Sidebar.jsx";
import { CustomerDashboard, CustomerHistory }    from "./CustomerViews.jsx";
import { QueuePage }                             from "./QueuePage.jsx";
import {
  AdminDashboard, ManageService, ManageUsers,
}                                                from "./AdminViews.jsx";
import { PublicDisplay }                         from "./PublicDisplay.jsx";
import { NotificationBell }                      from "./NotificationBell.jsx";

// ── PUBLIC DISPLAY ROUTE (no login needed) ───────────────────
if (window.location.pathname === "/display") {
  // Render just the display; handled in main JSX below
}

export default function App() {
  const isDisplay = window.location.pathname === "/display";

  const [token, setToken] = useState(localStorage.getItem("bq_token") || "");
  const [user,  setUser]  = useState(null);
  const [page,  setPage]  = useState("dashboard");

  // Resolve user from stored token on mount
  useEffect(() => {
    if (!token || isDisplay) return;
    apiFetch("/auth/me", "GET", null, token).then(data => {
      if (data._id) {
        setUser(data);
        if (data.role === "staff") setPage("queue");
      } else {
        setToken("");
        localStorage.removeItem("bq_token");
      }
    });
  }, [token, isDisplay]);

  // Socket lifecycle cleanup on logout
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket(token);
    return () => {};
  }, [token, user]);

  const handleLogin = (t, u) => {
    localStorage.setItem("bq_token", t);
    setToken(t);
    setUser(u);
    setPage(u.role === "staff" ? "queue" : "dashboard");
  };

  const handleLogout = () => {
    disconnectSocket();
    setToken(""); setUser(null); setPage("dashboard");
    localStorage.removeItem("bq_token");
  };

  // ── Public Display ───────────────────────────────────────
  if (isDisplay) return <PublicDisplay />;

  // ── Auth wall ────────────────────────────────────────────
  if (!token || !user) return <AuthScreen onLogin={handleLogin} />;

  // ── Page routing ─────────────────────────────────────────
  const renderPage = () => {
    if (user.role === "customer") {
      if (page === "history") return <CustomerHistory token={token} />;
      return <CustomerDashboard token={token} user={user} setPage={setPage} />;
    }

    if (user.role === "staff") {
      if (user.department?.name) {
        return <QueuePage token={token} user={user} deptName={user.department.name} />;
      }
      return <div style={{ padding: 40 }}><p>No department assigned. Contact admin.</p></div>;
    }

    if (user.role === "admin") {
      if (page === "cashier")  return <QueuePage token={token} user={user} deptName="Cashier" />;
      if (page === "clinic")   return <QueuePage token={token} user={user} deptName="Clinic" />;
      if (page === "auditing") return <QueuePage token={token} user={user} deptName="Auditing" />;
      if (page === "service")  return <ManageService token={token} />;
      if (page === "users")    return <ManageUsers token={token} />;
      // notifs panel removed — bell handles notifications inline
      return <AdminDashboard token={token} setPage={setPage} />;
    }

    return <div style={{ padding: 40 }}><p>Unknown role.</p></div>;
  };

  return (
    <div className="app-layout">
      <Sidebar user={user} page={page} setPage={setPage} onLogout={handleLogout} />
      <div className="main-content">
        {/* Top bar with bell */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(247,250,252,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e2e8f0",
          display: "flex", justifyContent: "flex-end",
          padding: "8px 24px",
        }}>
          {(user.role === "admin" || user.role === "staff") && (
            <NotificationBell token={token} user={user} />
          )}
        </div>
        {renderPage()}
      </div>
    </div>
  );
}