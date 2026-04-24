import { useState, useEffect, useCallback } from "react";
import { apiFetch, s, DEPT_ICONS, statusBadge, getSocket } from "./helpers.jsx";

// ── SHARED QUEUE PAGE (used by both Admin and Staff) ─────────
export function QueuePage({ token, user, deptName }) {
  const isStaff = user?.role === "staff";

  const [queue,      setQueue]      = useState(null);
  const [entries,    setEntries]    = useState([]);
  const [current,    setCurrent]    = useState(null);
  const [history,    setHistory]    = useState([]);
  const [dailyCount, setDailyCount] = useState(0);
  const [tab,        setTab]        = useState("queue");
  const [msg,        setMsg]        = useState("");
  const [msgType,    setMsgType]    = useState("info"); // info | error
  const [histMsg,    setHistMsg]    = useState("");
  // Keep queue._id accessible to socket handler
  const queueRef = { current: null };

  const flash = (m, type = "info") => { setMsg(m); setMsgType(type); setTimeout(() => setMsg(""), 5000); };

  const load = useCallback(async () => {
    const queues = await apiFetch("/queues", "GET", null, token);
    if (!Array.isArray(queues)) return;
    const q = queues.find(x => x.department?.name === deptName);
    if (!q) return;
    setQueue(q);
    queueRef.current = q;

    const [e, h, stats] = await Promise.all([
      apiFetch(`/entries/queue/${q._id}`, "GET", null, token),
      apiFetch(`/entries/queue/${q._id}/history`, "GET", null, token),
      apiFetch(`/entries/queue/${q._id}/stats/today`, "GET", null, token),
    ]);
    if (Array.isArray(e)) {
      setEntries(e.filter(x => x.status === "waiting"));
      setCurrent(e.find(x => x.status === "called" || x.status === "serving") || null);
    }
    if (Array.isArray(h)) setHistory(h);
    if (stats?.completed !== undefined) setDailyCount(stats.completed);
  }, [token, deptName]);

  useEffect(() => { load(); }, [load]);

  // Real-time via Socket.IO
  useEffect(() => {
    const socket = getSocket(token);
    const handler = (data) => {
      const currentQid = queueRef.current ? String(queueRef.current._id) : null;
      if (!currentQid) return;
      if (String(data.queueId) === currentQid || data.event === "toggled") {
        load();
      }
    };
    // Customer cancelled — always reload (they may have cancelled before queue was set)
    const cancelHandler = (data) => {
      const currentQid = queueRef.current ? String(queueRef.current._id) : null;
      if (currentQid && String(data.queueId) === currentQid) load();
    };
    socket.on("queueUpdated",    handler);
    socket.on("queueReset",      handler);
    socket.on("customerCancelled", cancelHandler);
    return () => {
      socket.off("queueUpdated",    handler);
      socket.off("queueReset",      handler);
      socket.off("customerCancelled", cancelHandler);
    };
  }, [load, token]);

  const callNext = async () => {
    if (!queue) return;
    const res = await apiFetch(`/admin/call-next/${queue._id}`, "POST", null, token);
    flash(res.message || JSON.stringify(res));
    load();
  };

  const complete = async (id) => {
    await apiFetch(`/admin/complete/${id}`, "POST", null, token);
    flash("✅ Marked as completed");
    load();
  };

  const remove = async (id) => {
    await apiFetch(`/admin/entry/${id}`, "DELETE", null, token);
    flash("Entry removed");
    load();
  };

  const resetQueue = async () => {
    if (!queue) return;
    const res = await apiFetch(`/queues/${queue._id}/reset`, "POST", null, token);
    if (res.message?.includes("Cannot")) flash(res.message, "error");
    else { flash("Queue reset to #1!"); load(); }
  };

  // Staff requests toggle; Admin directly toggles
  const handleToggle = async () => {
    if (!queue) return;
    if (isStaff) {
      const type = queue.isActive ? "REQUEST_DISABLE" : "REQUEST_ENABLE";
      const res = await apiFetch("/admin/notifications/request", "POST", { queueId: queue._id, type }, token);
      flash(res.message || "Request sent to admin ✉️");
    } else {
      await apiFetch(`/queues/${queue._id}`, "PUT", { isActive: !queue.isActive }, token);
      load();
    }
  };

  const clearHistory = async () => {
    if (!queue) return;
    // Staff clear: just reload to get fresh data (no server-side clear needed for staff)
    // We reload so the history refreshes. If you want a server clear endpoint, add it later.
    setHistory([]);
    setHistMsg("History display cleared.");
    setTimeout(() => setHistMsg(""), 3000);
  };

  const canReset = entries.length === 0 && !current;

  return (
    <div className="page-pad" style={s.main}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <h2 style={s.pageTitle}>{DEPT_ICONS[deptName] || "🏢"} {deptName} Queue</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {canReset && (
            <button onClick={resetQueue}
              style={{ ...s.outlineBtn, fontSize: 13, padding: "7px 14px", borderColor: "#d97706", color: "#d97706" }}>
              🔄 Reset to #1
            </button>
          )}
          {queue && (
            <button onClick={handleToggle}
              style={{ ...s.outlineBtn, fontSize: 13, padding: "7px 14px",
                borderColor: queue.isActive ? "#e53e3e" : "#38a169",
                color:       queue.isActive ? "#e53e3e" : "#38a169" }}>
              {isStaff
                ? (queue.isActive ? "📩 Request Disable" : "📩 Request Enable")
                : (queue.isActive ? "Disable Queue"     : "Enable Queue")}
            </button>
          )}
        </div>
      </div>

      {msg && <div style={msgType === "error" ? s.flashErr : s.flash}>{msg}</div>}

      {/* Daily Stats */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-number">{dailyCount}</div>
          <div className="stat-label">Served Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: "#667eea" }}>{entries.length}</div>
          <div className="stat-label">Waiting Now</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: current ? "#e53e3e" : "#a0aec0" }}>
            {current ? `#${String(current.queueNumber).padStart(3,"0")}` : "—"}
          </div>
          <div className="stat-label">Now Serving</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {["queue", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }}>
            {t === "queue" ? "Queue Management" : "History"}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <>
          <div style={s.servingCard}>
            <div>
              <div style={{ fontSize: 13, color: "#718096" }}>Currently Serving</div>
              {current
                ? <div style={{ fontSize: 26, fontWeight: 800 }}>
                    #{String(current.queueNumber).padStart(3,"0")}
                    <span style={{ fontSize: 15, fontWeight: 400, color: "#718096", marginLeft: 8 }}>
                      {current.customer?.name || current.customer?.email}
                    </span>
                  </div>
                : <div style={{ fontSize: 18, color: "#a0aec0", fontWeight: 600 }}>No one currently serving</div>
              }
            </div>
            <div style={{ fontSize: 14, color: "#718096" }}>{entries.length} waiting</div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <button style={{ ...s.outlineBtn, flex: 1 }}
              onClick={() => current && complete(current._id)} disabled={!current}>
              ✓ Complete
            </button>
            <button style={{ ...s.greenBtn, flex: 1 }} onClick={callNext}>Serve Next</button>
          </div>

          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Waiting List</h3>
          {entries.length === 0 ? <p style={s.muted}>No customers waiting.</p> : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr>{["#","Name / Email","Status","Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e._id} style={s.tr}>
                      <td style={s.td}><b>{String(e.queueNumber).padStart(3,"0")}</b></td>
                      <td style={s.td}>{e.customer?.name || e.customer?.email || "—"}</td>
                      <td style={s.td}>{statusBadge(e.status)}</td>
                      <td style={s.td}>
                        <button style={s.cancelBtnSm} onClick={() => remove(e._id)}>Cancel</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Transaction History</h3>
            {history.length > 0 && (
              <button style={{ ...s.cancelBtn, fontSize: 12, padding: "6px 12px" }} onClick={clearHistory}>
                🗑 Clear Display
              </button>
            )}
          </div>
          {histMsg && <div style={s.flash}>{histMsg}</div>}
          {history.length === 0 ? <p style={s.muted}>No history yet.</p> : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr>{["#","Customer","Status","Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {history.map(e => (
                    <tr key={e._id} style={s.tr}>
                      <td style={s.td}><b>#{e.queueNumber}</b></td>
                      <td style={s.td}>{e.customer?.name || e.customer?.email || "—"}</td>
                      <td style={s.td}>{statusBadge(e.status)}</td>
                      <td style={s.td}>{new Date(e.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
