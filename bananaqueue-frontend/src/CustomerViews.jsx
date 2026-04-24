import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, s, DEPT_ICONS, DEPT_COLORS, statusBadge, getSocket } from "./helpers.jsx";

// ── TOAST NOTIFICATION ────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, maxWidth: 340,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "called"  ? "#276749" :
                      t.type === "almost"  ? "#c05621" : "#1a202c",
          color: "#fff",
          borderRadius: 14,
          padding: "14px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "flex-start", gap: 12,
          animation: "slideIn 0.3s ease",
          fontSize: 14,
          lineHeight: 1.5,
        }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>
            {t.type === "called" ? "📢" : t.type === "almost" ? "⏳" : "ℹ️"}
          </span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.title}</div>
            <div style={{ opacity: 0.88 }}>{t.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CUSTOMER DASHBOARD ───────────────────────────────────────
export function CustomerDashboard({ token, user, setPage }) {
  const [queues,  setQueues]  = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [msg,     setMsg]     = useState("");
  const [toasts,  setToasts]  = useState([]);
  const toastId = useRef(0);

  const addToast = (title, body, type = "info") => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  };

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const load = useCallback(async () => {
    const [q, e] = await Promise.all([
      apiFetch("/queues", "GET", null, token),
      apiFetch("/entries/my", "GET", null, token),
    ]);
    if (Array.isArray(q)) setQueues(q);
    if (e && e._id) setMyEntry(e);
    else setMyEntry(null);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── Real-time socket listeners ────────────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = getSocket(token);
    const myId   = String(user._id);

    // General queue update → reload queues list
    const onQueueUpdated = () => { load(); };

    // Customer was called to the counter
    const onCalled = (data) => {
      if (String(data.customerId) !== myId) return;
      load(); // refresh entry status
      addToast(
        "🎉 It's your turn!",
        `Number #${String(data.queueNumber).padStart(3,"0")} — Please proceed to the ${data.queueName} counter now.`,
        "called"
      );
      // Browser notification if permitted
      if (Notification.permission === "granted") {
        new Notification("BananaQueue — Your turn!", {
          body: `#${data.queueNumber} — Please go to the ${data.queueName} counter.`,
          icon: "/favicon.ico",
        });
      }
    };

    // Customer is almost in line (5th position)
    const onAlmost = (data) => {
      if (String(data.customerId) !== myId) return;
      addToast(
        "⏳ Almost your turn!",
        `You are now #${data.position} in the ${data.queueName} queue. Please get ready!`,
        "almost"
      );
    };

    socket.on("queueUpdated",  onQueueUpdated);
    socket.on("customerCalled", onCalled);
    socket.on("almostInLine",   onAlmost);

    return () => {
      socket.off("queueUpdated",  onQueueUpdated);
      socket.off("customerCalled", onCalled);
      socket.off("almostInLine",   onAlmost);
    };
  }, [user, token, load]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const [editName, setEditName] = useState(false);
  const [newName,  setNewName]  = useState(user?.name || "");

  const saveName = async () => {
    const res = await apiFetch("/auth/me", "PUT", { name: newName }, token);
    if (res._id) { flash("✅ Name updated!"); setEditName(false); }
    else flash(res.message || "Failed to update name");
  };

  const join = async (queueId) => {
    const res = await apiFetch("/entries/join", "POST", { queueId }, token);
    if (res._id) { flash(`✅ Joined! Your number is #${res.queueNumber}`); load(); }
    else flash(res.message);
  };

  const cancel = async () => {
    const res = await apiFetch("/entries/cancel", "DELETE", null, token);
    if (res.entry) { flash("Queue cancelled."); load(); }
    else flash(res.message);
  };

  return (
    <>
      <Toast toasts={toasts} />
      <div className="page-pad" style={s.main}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <h2 style={s.pageTitle}>👋 Welcome, {user?.name}!</h2>
          {!editName ? (
            <button style={{ ...s.outlineBtn, fontSize: 12, padding: "4px 12px" }}
              onClick={() => { setEditName(true); setNewName(user?.name || ""); }}>
              ✏ Edit Name
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={{ ...s.input, marginBottom: 0, width: 180 }}
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveName()} />
              <button style={{ ...s.greenBtn, fontSize: 12, padding: "6px 14px" }} onClick={saveName}>Save</button>
              <button style={s.cancelBtnSm} onClick={() => setEditName(false)}>Cancel</button>
            </div>
          )}
        </div>
        <p style={s.pageSubtitle}>Select a queue to join below.</p>
        {msg && <div style={s.flash}>{msg}</div>}

        <div className="card-grid" style={s.cardGrid}>
          {queues.map(q => {
            const dname = q.department?.name || q.name.replace(" Queue", "");
            const color = DEPT_COLORS[dname] || { bg: "#f0f4ff", border: "#667eea" };
            const icon  = DEPT_ICONS[dname]  || "🏢";
            const avail = q.isActive;
            return (
              <button key={q._id} disabled={!avail || !!myEntry}
                onClick={() => avail && !myEntry && join(q._id)}
                style={{
                  ...s.queueCard, background: color.bg, borderColor: color.border,
                  opacity: avail ? 1 : 0.5,
                  cursor: avail && !myEntry ? "pointer" : "not-allowed"
                }}>
                <span style={{ fontSize: 36 }}>{icon}</span>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{dname}</div>
                <div style={{ fontSize: 12, color: "#718096", marginTop: 4 }}>
                  {avail ? `${q.waitingCount || 0} waiting` : "Unavailable"}
                </div>
              </button>
            );
          })}
          <button onClick={() => setPage("history")}
            style={{ ...s.queueCard, background: "#f0f4ff", borderColor: "#667eea" }}>
            <span style={{ fontSize: 36 }}>🕐</span>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>View History</div>
          </button>
        </div>

        <h3 style={{ fontWeight: 700, fontSize: 17, marginTop: 32, marginBottom: 16 }}>Your Active Queue</h3>
        {!myEntry ? (
          <p style={s.muted}>You are not in any queue right now.</p>
        ) : (
          <div style={s.entryCard}>
            {/* Called banner */}
            {myEntry.status === "called" && (
              <div style={{
                background: "#276749", color: "#fff", borderRadius: 10,
                padding: "12px 16px", marginBottom: 14, fontWeight: 700,
                fontSize: 15, textAlign: "center",
                animation: "pulse-in 0.4s ease",
              }}>
                📢 You are being called! Please proceed to the counter.
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 28, color: "#2d3748" }}>
                  #{myEntry.queueNumber}
                </div>
                <div style={{ color: "#718096", fontSize: 14, marginTop: 2 }}>
                  {myEntry.queue?.name?.replace(" Queue", "") || "—"} Queue
                </div>
              </div>
              {statusBadge(myEntry.status)}
            </div>
            <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 8 }}>
              TXN: {myEntry.transactionId}
            </div>
            <button style={{ ...s.cancelBtn, marginTop: 14, width: "100%" }} onClick={cancel}>
              ✕ Cancel Queue
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ── CUSTOMER HISTORY ─────────────────────────────────────────
export function CustomerHistory({ token }) {
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const d = await apiFetch("/entries/my/history", "GET", null, token);
    if (Array.isArray(d)) setHistory(d);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const clearHistory = async () => {
    await apiFetch("/entries/my/history/clear", "DELETE", null, token);
    setMsg("History cleared!");
    setTimeout(() => setMsg(""), 3000);
    load();
  };

  return (
    <div className="page-pad" style={s.main}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={s.pageTitle}>Queue History</h2>
        {history.length > 0 && (
          <button style={{ ...s.cancelBtn, fontSize: 13, padding: "7px 14px" }} onClick={clearHistory}>
            🗑 Clear History
          </button>
        )}
      </div>
      <p style={s.pageSubtitle}>Your past queue transactions.</p>
      {msg && <div style={s.flash}>{msg}</div>}
      {history.length === 0 ? <p style={s.muted}>No history yet.</p> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>{["Transaction ID", "Queue", "Number", "Status", "Date"].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {history.map(e => (
                <tr key={e._id} style={s.tr}>
                  <td style={s.td}><span style={{ fontSize: 12, fontFamily: "monospace" }}>{e.transactionId}</span></td>
                  <td style={s.td}>{e.queue?.name || "—"}</td>
                  <td style={s.td}><b>#{e.queueNumber}</b></td>
                  <td style={s.td}>{statusBadge(e.status)}</td>
                  <td style={s.td}>{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
