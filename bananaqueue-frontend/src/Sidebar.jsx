import { useState } from "react";
import { apiFetch, s, DEPT_ICONS } from "./helpers.jsx";

// ── SIDEBAR ──────────────────────────────────────────────────
export function Sidebar({ user, page, setPage, onLogout }) {
  const [open, setOpen] = useState(false);

  const customerLinks = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "history",   label: "History",   icon: "◷" },
  ];
  const staffLinks = user?.department?.name
    ? [{ id: "queue", label: user.department.name, icon: DEPT_ICONS[user.department.name] || "🏢" }]
    : [{ id: "dashboard", label: "Dashboard", icon: "▦" }];
  const adminLinks = [
    { id: "dashboard", label: "Dashboard",     icon: "▦" },
    { id: "cashier",   label: "Cashier",       icon: "💰" },
    { id: "auditing",  label: "Auditing",      icon: "📋" },
    { id: "clinic",    label: "Clinic",        icon: "🏥" },
    { id: "service",   label: "Manage Service",icon: "⚙" },
    { id: "users",     label: "Manage Users",  icon: "◉" },
  ];
  const links = user?.role === "admin" ? adminLinks
              : user?.role === "staff"  ? staffLinks
              : customerLinks;

  const handleNav = (id) => { setPage(id); setOpen(false); };

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(o => !o)}>☰</button>
      {open && <div className="sidebar-overlay visible" onClick={() => setOpen(false)} />}
      <div className={`sidebar ${open ? "open" : ""}`}>
        <div style={s.sidebarLogo}>
          <span style={{ fontSize: 22 }}>🍌</span>
          <span>BANANAQUE</span>
        </div>
        <nav style={{ flex: 1 }}>
          {links.map(l => (
            <button key={l.id} onClick={() => handleNav(l.id)}
              style={{ ...s.navBtn, ...(page === l.id ? s.navBtnActive : {}) }}>
              <span style={{ fontSize: 16 }}>{l.icon}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2d3748" }}>{user?.email}</div>
          <div style={{ fontSize: 12, color: "#718096", marginBottom: 8, textTransform: "capitalize" }}>{user?.role}</div>
          <button style={s.signOutBtn} onClick={onLogout}>↪ Sign Out</button>
        </div>
      </div>
    </>
  );
}

// ── AUTH SCREEN ──────────────────────────────────────────────
export function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg,  setMsg]  = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.email || !form.password) return setMsg("Please fill in all fields");
    setBusy(true);
    const path = mode === "login" ? "/auth/login" : "/auth/register";
    const body = mode === "login"
      ? { email: form.email, password: form.password }
      : { name: form.name, email: form.email, password: form.password };
    const data = await apiFetch(path, "POST", body);
    setBusy(false);
    if (data.token) onLogin(data.token, data.user);
    else setMsg(data.message || "Something went wrong");
  };

  return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48 }}>🍌</div>
          <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6, color: "#1a202c" }}>BananaQueue</div>
          <div style={{ color: "#718096", fontSize: 14, marginTop: 4 }}>Online Queue Management System</div>
        </div>
        <div style={s.tabRow}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setMsg(""); }}
              style={{ ...s.tabBtn, ...(mode === m ? s.tabBtnActive : {}), flex: 1, justifyContent: "center" }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {mode === "register" && (
          <input placeholder="Full name" style={s.input} value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
        )}
        <input placeholder="Email" style={s.input} value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" style={s.input} value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          onKeyDown={e => e.key === "Enter" && submit()} />
        {msg && <div style={s.flashErr}>{msg}</div>}
        <button style={{ ...s.greenBtn, width: "100%" }} onClick={submit} disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          <a href="/display" style={{ color: "#38a169", fontWeight: 600, textDecoration: "none" }}>
            📺 View Public Display Board
          </a>
        </div>
      </div>
    </div>
  );
}
