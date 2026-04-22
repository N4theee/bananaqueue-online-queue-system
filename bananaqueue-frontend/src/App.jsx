import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5000/api";

async function apiFetch(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(API + path, options);
    return res.json();
  } catch {
    return { message: "Cannot connect to server. Is the backend running?" };
  }
}

const DEPT_ICONS = { Cashier: "💰", Clinic: "🏥", Auditing: "📋" };
const DEPT_COLORS = {
  Cashier:  { bg: "#fff8e1", border: "#f59e0b", icon: "#f59e0b" },
  Clinic:   { bg: "#fce4ec", border: "#e91e63", icon: "#e91e63" },
  Auditing: { bg: "#e8f5e9", border: "#4caf50", icon: "#4caf50" },
};

function statusBadge(status) {
  const map = {
    waiting:   { bg: "#fff3cd", color: "#856404", label: "Waiting" },
    called:    { bg: "#cce5ff", color: "#004085", label: "Called" },
    serving:   { bg: "#d4edda", color: "#155724", label: "Serving" },
    completed: { bg: "#e2e3e5", color: "#383d41", label: "Completed" },
    cancelled: { bg: "#f8d7da", color: "#721c24", label: "Cancelled" },
  };
  const s = map[status] || map.waiting;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ user, page, setPage, onLogout }) {
  const customerLinks = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "history",   label: "History",   icon: "◷" },
  ];
  const staffLinks = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "account",   label: "My Account", icon: "◉" },
  ];
  const adminLinks = [
    { id: "dashboard",  label: "Dashboard",    icon: "▦" },
    { id: "cashier",    label: "Cashier",       icon: "💰" },
    { id: "auditing",   label: "Auditing",      icon: "📋" },
    { id: "clinic",     label: "Clinic",        icon: "🏥" },
    { id: "service",    label: "Manage Service",icon: "⚙" },
    { id: "users",      label: "Manage Users",  icon: "◉" },
  ];

  const links = user?.role === "admin" ? adminLinks : user?.role === "staff" ? staffLinks : customerLinks;

  return (
    <div style={s.sidebar}>
      <div style={s.sidebarLogo}>
        <span style={{ fontSize: 20 }}>🍌</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>BANANAQUE</span>
      </div>
      <nav style={{ flex: 1 }}>
        {links.map(l => (
          <button key={l.id} onClick={() => setPage(l.id)}
            style={{ ...s.navBtn, ...(page === l.id ? s.navBtnActive : {}) }}>
            <span style={{ fontSize: 15 }}>{l.icon}</span>
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
  );
}

// ── CUSTOMER DASHBOARD ───────────────────────────────────────
function CustomerDashboard({ token, user, setPage }) {
  const [queues, setQueues]   = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [msg, setMsg]         = useState("");

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

  const join = async (queueId) => {
    const res = await apiFetch("/entries/join", "POST", { queueId }, token);
    if (res._id) { flash(`Joined! Your number is #${res.queueNumber}`); load(); }
    else flash(res.message);
  };

  const cancel = async () => {
    const res = await apiFetch("/entries/cancel", "DELETE", null, token);
    if (res.entry) { flash("Queue cancelled."); load(); }
    else flash(res.message);
  };

  return (
    <div style={s.main}>
      <h2 style={s.pageTitle}>Dashboard</h2>
      <p style={s.pageSubtitle}>Select a queue to join or view your active queues.</p>
      {msg && <div style={s.flash}>{msg}</div>}

      <div style={s.cardGrid}>
        {queues.map(q => {
          const dname = q.department?.name || q.name.replace(" Queue", "");
          const color = DEPT_COLORS[dname] || { bg: "#f0f4ff", border: "#667eea", icon: "#667eea" };
          const icon  = DEPT_ICONS[dname] || "🏢";
          const avail = q.isActive;
          return (
            <button key={q._id} disabled={!avail || !!myEntry}
              onClick={() => avail && !myEntry && join(q._id)}
              style={{ ...s.queueCard, background: color.bg, borderColor: color.border, opacity: avail ? 1 : 0.5, cursor: avail && !myEntry ? "pointer" : "default" }}>
              <span style={{ fontSize: 36 }}>{icon}</span>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{dname} Queue</div>
              {!avail && <div style={{ color: "#e53e3e", fontSize: 12, marginTop: 4 }}>Unavailable</div>}
            </button>
          );
        })}
        <button onClick={() => setPage("history")} style={{ ...s.queueCard, background: "#f0f4ff", borderColor: "#667eea", cursor: "pointer" }}>
          <span style={{ fontSize: 36 }}>🕐</span>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>View History</div>
        </button>
      </div>

      <h3 style={{ fontWeight: 700, fontSize: 17, marginTop: 32, marginBottom: 16 }}>Your Active Queues</h3>
      {!myEntry ? (
        <p style={s.muted}>You are not in any queue right now.</p>
      ) : (
        <div style={s.entryCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 24, color: "#2d3748" }}>#{myEntry.queueNumber}</div>
              <div style={{ color: "#718096", fontSize: 14, marginTop: 2 }}>
                Service: <b>{myEntry.queue?.name?.replace(" Queue", "") || "—"}</b>
              </div>
            </div>
            {statusBadge(myEntry.status)}
          </div>
          <div style={{ fontSize: 12, color: "#718096", marginTop: 8 }}>TXN: {myEntry.transactionId}</div>
          <button style={{ ...s.cancelBtn, marginTop: 14, width: "100%" }} onClick={cancel}>
            ✕ Cancel Queue
          </button>
        </div>
      )}
    </div>
  );
}

// ── CUSTOMER HISTORY ─────────────────────────────────────────
function CustomerHistory({ token }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    apiFetch("/entries/my/history", "GET", null, token).then(d => {
      if (Array.isArray(d)) setHistory(d);
    });
  }, [token]);

  return (
    <div style={s.main}>
      <h2 style={s.pageTitle}>Queue History</h2>
      <p style={s.pageSubtitle}>Your past queue transactions.</p>
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
                  <td style={s.td} >{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── STAFF DASHBOARD ──────────────────────────────────────────
function StaffDashboard({ token, user }) {
  const [queue,   setQueue]   = useState(null);
  const [entries, setEntries] = useState([]);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab,     setTab]     = useState("queue");
  const [msg,     setMsg]     = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const load = useCallback(async () => {
    const queues = await apiFetch("/queues", "GET", null, token);
    if (!Array.isArray(queues)) return;
    const deptName = user?.department?.name;
    const q = queues.find(x => x.department?.name === deptName) || queues[0];
    if (!q) return;
    setQueue(q);

    const e = await apiFetch(`/entries/queue/${q._id}`, "GET", null, token);
    if (Array.isArray(e)) {
      setEntries(e.filter(x => x.status === "waiting"));
      setCurrent(e.find(x => x.status === "called" || x.status === "serving") || null);
    }

    const h = await apiFetch(`/entries/queue/${q._id}/history`, "GET", null, token);
    if (Array.isArray(h)) setHistory(h);
  }, [token, user]);

  useEffect(() => { load(); }, [load]);

  const callNext = async () => {
    if (!queue) return;
    const res = await apiFetch(`/admin/call-next/${queue._id}`, "POST", null, token);
    flash(res.message || JSON.stringify(res));
    load();
  };

  const complete = async (entryId) => {
    const res = await apiFetch(`/admin/complete/${entryId}`, "POST", null, token);
    flash(res.message || "Completed");
    load();
  };

  const remove = async (entryId) => {
    const res = await apiFetch(`/admin/entry/${entryId}`, "DELETE", null, token);
    flash(res.message || "Removed");
    load();
  };

  return (
    <div style={s.main}>
      <h2 style={s.pageTitle}>
        {DEPT_ICONS[user?.department?.name] || "🏢"} {user?.department?.name || "Your"} — Staff Dashboard
      </h2>
      {msg && <div style={s.flash}>{msg}</div>}

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
              {current ? (
                <>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    #{String(current.queueNumber).padStart(3, "0")} &nbsp;
                    <span style={{ fontSize: 16, fontWeight: 400, color: "#718096" }}>{current.customer?.email}</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 20, fontWeight: 700, color: "#a0aec0" }}>No one serving</div>
              )}
            </div>
            <div style={{ fontSize: 14, color: "#718096" }}>{entries.length} waiting</div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <button style={{ ...s.outlineBtn, flex: 1 }}
              onClick={() => current && complete(current._id)} disabled={!current}>
              ✓ Complete
            </button>
            <button style={{ ...s.greenBtn, flex: 1 }} onClick={callNext}>
              Serve Next
            </button>
          </div>

          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Waiting List</h3>
          {entries.length === 0 ? <p style={s.muted}>No customers waiting.</p> : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>{["#", "Name", "Status", "Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e._id} style={s.tr}>
                      <td style={s.td}><b>{String(e.queueNumber).padStart(3, "0")}</b></td>
                      <td style={s.td}>{e.customer?.email || "—"}</td>
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
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Transaction History</h3>
          {history.length === 0 ? <p style={s.muted}>No history yet.</p> : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>{["#", "Customer", "Status", "Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {history.map(e => (
                    <tr key={e._id} style={s.tr}>
                      <td style={s.td}><b>#{e.queueNumber}</b></td>
                      <td style={s.td}>{e.customer?.email || "—"}</td>
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

// ── ADMIN DASHBOARD ──────────────────────────────────────────
function AdminDashboard({ token }) {
  const [overview, setOverview] = useState([]);

  useEffect(() => {
    apiFetch("/admin/overview", "GET", null, token).then(d => {
      if (Array.isArray(d)) setOverview(d);
    });
  }, [token]);

  return (
    <div style={s.main}>
      <h2 style={s.pageTitle}>🍌 BananaQue — Admin</h2>
      <div style={s.cardGrid2}>
        <div style={s.mgmtCard} onClick={() => {}}>
          <span style={{ fontSize: 28 }}>👥</span>
          <div style={{ fontWeight: 700, marginTop: 8 }}>Manage Users</div>
          <div style={s.muted}>Register new accounts and view all users</div>
          <div style={{ color: "#38a169", fontSize: 13, marginTop: 8, fontWeight: 600 }}>Manage →</div>
        </div>
        <div style={s.mgmtCard}>
          <span style={{ fontSize: 28 }}>⚙</span>
          <div style={{ fontWeight: 700, marginTop: 8 }}>Manage Service</div>
          <div style={s.muted}>Enable or disable department services</div>
          <div style={{ color: "#38a169", fontSize: 13, marginTop: 8, fontWeight: 600 }}>Configure →</div>
        </div>
      </div>

      <h3 style={{ fontWeight: 700, fontSize: 17, margin: "28px 0 16px" }}>Queue Overview</h3>
      <p style={s.pageSubtitle}>Select a queue to manage.</p>
      <div style={s.cardGrid}>
        {overview.map(q => {
          const dname = q.department?.name || "Queue";
          const icon  = DEPT_ICONS[dname] || "🏢";
          const color = DEPT_COLORS[dname] || { bg: "#f0f4ff", border: "#667eea" };
          return (
            <div key={q._id} style={{ ...s.overviewCard, borderTop: `4px solid ${color.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{dname}</span>
                </div>
                <span style={{ fontSize: 13, color: "#718096" }}>{q.waitingCount} waiting</span>
              </div>
              <div style={{ fontSize: 13, color: "#718096", marginTop: 8 }}>
                Serving: {q.currentEntry
                  ? `#${String(q.currentEntry.queueNumber || q.currentNumber).padStart(3,"0")} — ${q.currentEntry.customer?.email || ""}`
                  : "None"}
              </div>
              <div style={{ color: "#38a169", fontSize: 13, marginTop: 12, fontWeight: 600 }}>Manage →</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ADMIN QUEUE PAGE ─────────────────────────────────────────
function AdminQueuePage({ token, deptName }) {
  const [queue,   setQueue]   = useState(null);
  const [entries, setEntries] = useState([]);
  const [current, setCurrent] = useState(null);
  const [msg,     setMsg]     = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const load = useCallback(async () => {
    const queues = await apiFetch("/queues", "GET", null, token);
    if (!Array.isArray(queues)) return;
    const q = queues.find(x => x.department?.name === deptName);
    if (!q) return;
    setQueue(q);
    const e = await apiFetch(`/entries/queue/${q._id}`, "GET", null, token);
    if (Array.isArray(e)) {
      setEntries(e.filter(x => x.status === "waiting"));
      setCurrent(e.find(x => x.status === "called" || x.status === "serving") || null);
    }
  }, [token, deptName]);

  useEffect(() => { load(); }, [load]);

  const callNext = async () => {
    if (!queue) return;
    const res = await apiFetch(`/admin/call-next/${queue._id}`, "POST", null, token);
    flash(res.message || JSON.stringify(res));
    load();
  };

  const complete = async (id) => {
    await apiFetch(`/admin/complete/${id}`, "POST", null, token);
    flash("Marked as completed"); load();
  };

  const remove = async (id) => {
    await apiFetch(`/admin/entry/${id}`, "DELETE", null, token);
    flash("Entry removed"); load();
  };

  const toggleQueue = async () => {
    if (!queue) return;
    await apiFetch(`/queues/${queue._id}`, "PUT", { isActive: !queue.isActive }, token);
    load();
  };

  return (
    <div style={s.main}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={s.pageTitle}>{DEPT_ICONS[deptName] || "🏢"} {deptName} Queue</h2>
        {queue && (
          <button onClick={toggleQueue}
            style={{ ...s.outlineBtn, fontSize: 13, padding: "6px 14px", borderColor: queue.isActive ? "#e53e3e" : "#38a169", color: queue.isActive ? "#e53e3e" : "#38a169" }}>
            {queue.isActive ? "Disable Queue" : "Enable Queue"}
          </button>
        )}
      </div>
      {msg && <div style={s.flash}>{msg}</div>}

      <div style={s.servingCard}>
        <div>
          <div style={{ fontSize: 13, color: "#718096" }}>Currently Serving</div>
          {current
            ? <div style={{ fontSize: 26, fontWeight: 700 }}>#{String(current.queueNumber).padStart(3,"0")} &nbsp;<span style={{ fontSize: 15, fontWeight: 400, color: "#718096" }}>{current.customer?.email}</span></div>
            : <div style={{ fontSize: 18, color: "#a0aec0", fontWeight: 600 }}>No one currently serving</div>}
        </div>
        <div style={{ fontSize: 14, color: "#718096" }}>{entries.length} waiting</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button style={{ ...s.outlineBtn, flex: 1 }} onClick={() => current && complete(current._id)} disabled={!current}>✓ Complete</button>
        <button style={{ ...s.greenBtn, flex: 1 }} onClick={callNext}>Serve Next</button>
      </div>

      <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Waiting List</h3>
      {entries.length === 0 ? <p style={s.muted}>No customers waiting.</p> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead><tr>{["#", "Email", "Status", "Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e._id} style={s.tr}>
                  <td style={s.td}><b>{String(e.queueNumber).padStart(3,"0")}</b></td>
                  <td style={s.td}>{e.customer?.email || "—"}</td>
                  <td style={s.td}>{statusBadge(e.status)}</td>
                  <td style={s.td}><button style={s.cancelBtnSm} onClick={() => remove(e._id)}>Cancel</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── MANAGE USERS ─────────────────────────────────────────────
function ManageUsers({ token }) {
  const [customers, setCustomers] = useState([]);
  const [staff,     setStaff]     = useState([]);
  const [depts,     setDepts]     = useState([]);
  const [tab,       setTab]       = useState("customers");
  const [form,      setForm]      = useState({ name: "", email: "", password: "", departmentId: "" });
  const [msg,       setMsg]       = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const load = useCallback(async () => {
    const [c, st, d] = await Promise.all([
      apiFetch("/admin/customers", "GET", null, token),
      apiFetch("/admin/staff", "GET", null, token),
      apiFetch("/admin/departments", "GET", null, token),
    ]);
    if (Array.isArray(c))  setCustomers(c);
    if (Array.isArray(st)) setStaff(st);
    if (Array.isArray(d))  setDepts(d);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const createStaff = async () => {
    if (!form.name || !form.email || !form.password || !form.departmentId)
      return flash("All fields are required");
    const res = await apiFetch("/admin/staff", "POST", form, token);
    if (res.id) { flash(`Staff ${res.name} created!`); setForm({ name:"",email:"",password:"",departmentId:"" }); load(); }
    else flash(res.message);
  };

  const deleteStaff = async (id) => {
    await apiFetch(`/admin/staff/${id}`, "DELETE", null, token);
    flash("Staff removed"); load();
  };

  return (
    <div style={s.main}>
      <h2 style={s.pageTitle}>👥 Manage Users</h2>
      {msg && <div style={s.flash}>{msg}</div>}

      <div style={s.tabRow}>
        {["customers", "staff", "create staff"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "customers" && (
        <>
          <p style={s.muted}>{customers.length} registered customers</p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{["Name","Email","Registered"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id} style={s.tr}>
                    <td style={s.td}>{c.name}</td>
                    <td style={s.td}>{c.email}</td>
                    <td style={s.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "staff" && (
        <>
          <p style={s.muted}>{staff.length} staff members</p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{["Name","Email","Department","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {staff.map(st => (
                  <tr key={st._id} style={s.tr}>
                    <td style={s.td}>{st.name}</td>
                    <td style={s.td}>{st.email}</td>
                    <td style={s.td}>{st.department?.name || "—"}</td>
                    <td style={s.td}><button style={s.cancelBtnSm} onClick={() => deleteStaff(st._id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "create staff" && (
        <div style={{ maxWidth: 440 }}>
          <p style={{ ...s.muted, marginBottom: 16 }}>Create a new staff account and assign them to a department.</p>
          <input placeholder="Full name" style={s.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input placeholder="Email" style={s.input} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input placeholder="Password" type="password" style={s.input} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <select style={s.input} value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>
            <option value="">Select department</option>
            {depts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <button style={{ ...s.greenBtn, width: "100%", marginTop: 8 }} onClick={createStaff}>
            Create Staff Account
          </button>
        </div>
      )}
    </div>
  );
}

// ── MANAGE SERVICE ───────────────────────────────────────────
function ManageService({ token }) {
  const [queues, setQueues] = useState([]);
  const [msg,    setMsg]    = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const load = () => apiFetch("/queues", "GET", null, token).then(d => { if (Array.isArray(d)) setQueues(d); });
  useEffect(() => { load(); }, [token]);

  const toggle = async (q) => {
    await apiFetch(`/queues/${q._id}`, "PUT", { isActive: !q.isActive }, token);
    flash(`${q.department?.name} queue ${!q.isActive ? "enabled" : "disabled"}`);
    load();
  };

  const reset = async (q) => {
    await apiFetch(`/queues/${q._id}/reset`, "POST", null, token);
    flash(`${q.department?.name} queue reset`);
    load();
  };

  return (
    <div style={s.main}>
      <h2 style={s.pageTitle}>⚙ Manage Service</h2>
      <p style={s.pageSubtitle}>Enable or disable department queues.</p>
      {msg && <div style={s.flash}>{msg}</div>}
      {queues.map(q => {
        const dname = q.department?.name || "Queue";
        return (
          <div key={q._id} style={{ ...s.servingCard, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{DEPT_ICONS[dname]} {dname}</div>
              <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>
                Status: <b style={{ color: q.isActive ? "#38a169" : "#e53e3e" }}>{q.isActive ? "Active" : "Disabled"}</b>
                &nbsp;|&nbsp; Current: #{q.currentNumber} &nbsp;|&nbsp; Next: #{q.nextNumber}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...s.outlineBtn, fontSize: 13 }} onClick={() => reset(q)}>Reset</button>
              <button onClick={() => toggle(q)}
                style={{ ...s.outlineBtn, fontSize: 13, borderColor: q.isActive ? "#e53e3e" : "#38a169", color: q.isActive ? "#e53e3e" : "#38a169" }}>
                {q.isActive ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AUTH SCREEN ──────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ name: "", email: "", password: "" });
  const [msg,  setMsg]    = useState("");
  const [busy, setBusy]   = useState(false);

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
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🍌</div>
          <div style={{ fontWeight: 800, fontSize: 22, marginTop: 4 }}>BananaQueue</div>
          <div style={{ color: "#718096", fontSize: 14 }}>Online Queue Management System</div>
        </div>

        <div style={s.tabRow}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ ...s.tabBtn, ...(mode === m ? s.tabBtnActive : {}), flex: 1, justifyContent: "center" }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <input placeholder="Full name" style={s.input} value={form.name}
            onChange={e => setForm({...form, name: e.target.value})} />
        )}
        <input placeholder="Email" style={s.input} value={form.email}
          onChange={e => setForm({...form, email: e.target.value})} />
        <input placeholder="Password" type="password" style={s.input} value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          onKeyDown={e => e.key === "Enter" && submit()} />

        {msg && <div style={{ color: "#e53e3e", fontSize: 13, marginBottom: 8 }}>{msg}</div>}

        <button style={{ ...s.greenBtn, width: "100%" }} onClick={submit} disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

// ── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("bq_token") || "");
  const [user,  setUser]  = useState(null);
  const [page,  setPage]  = useState("dashboard");

  useEffect(() => {
    if (!token) return;
    apiFetch("/auth/me", "GET", null, token).then(data => {
      if (data._id) setUser(data);
      else { setToken(""); localStorage.removeItem("bq_token"); }
    });
  }, [token]);

  const handleLogin = (t, u) => {
    localStorage.setItem("bq_token", t);
    setToken(t); setUser(u); setPage("dashboard");
  };

  const handleLogout = () => {
    setToken(""); setUser(null); setPage("dashboard");
    localStorage.removeItem("bq_token");
  };

  if (!token || !user) return <AuthScreen onLogin={handleLogin} />;

  const renderPage = () => {
    if (user.role === "customer") {
      if (page === "history") return <CustomerHistory token={token} />;
      return <CustomerDashboard token={token} user={user} setPage={setPage} />;
    }
    if (user.role === "staff") {
      return <StaffDashboard token={token} user={user} />;
    }
    if (user.role === "admin") {
      if (page === "cashier")  return <AdminQueuePage token={token} deptName="Cashier" />;
      if (page === "clinic")   return <AdminQueuePage token={token} deptName="Clinic" />;
      if (page === "auditing") return <AdminQueuePage token={token} deptName="Auditing" />;
      if (page === "users")    return <ManageUsers token={token} />;
      if (page === "service")  return <ManageService token={token} />;
      return <AdminDashboard token={token} />;
    }
    return <div style={s.main}><p>Unknown role</p></div>;
  };

  return (
    <div style={s.app}>
      <Sidebar user={user} page={page} setPage={setPage} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: "auto" }}>{renderPage()}</div>
    </div>
  );
}

// ── STYLES ───────────────────────────────────────────────────
const s = {
  app:          { display: "flex", minHeight: "100vh", background: "#f7fafc", fontFamily: "system-ui, -apple-system, sans-serif" },
  authWrap:     { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f7fafc" },
  authCard:     { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "40px 36px", width: 380 },
  sidebar:      { width: 220, minHeight: "100vh", background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "0 0 16px" },
  sidebarLogo:  { display: "flex", alignItems: "center", gap: 8, padding: "20px 20px 16px", fontWeight: 700, fontSize: 14, color: "#2d3748", borderBottom: "1px solid #e2e8f0", marginBottom: 8 },
  sidebarFooter:{ padding: "16px 20px", borderTop: "1px solid #e2e8f0" },
  navBtn:       { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "#4a5568", textAlign: "left" },
  navBtnActive: { background: "#f0fff4", color: "#276749", fontWeight: 600, borderRight: "3px solid #38a169" },
  signOutBtn:   { background: "none", border: "none", color: "#718096", cursor: "pointer", fontSize: 13, padding: 0 },
  main:         { flex: 1, padding: "32px 36px", maxWidth: 900 },
  pageTitle:    { fontWeight: 700, fontSize: 24, color: "#1a202c", marginBottom: 4 },
  pageSubtitle: { color: "#718096", fontSize: 14, marginBottom: 24 },
  muted:        { color: "#718096", fontSize: 14 },
  flash:        { background: "#fefcbf", border: "1px solid #f6e05e", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "#744210" },
  cardGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 8 },
  cardGrid2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  queueCard:    { border: "2px solid", borderRadius: 12, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", transition: "transform .15s", textAlign: "center" },
  overviewCard: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, cursor: "pointer" },
  mgmtCard:     { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, cursor: "pointer" },
  entryCard:    { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, maxWidth: 480 },
  servingCard:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tabRow:       { display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0" },
  tabBtn:       { background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "8px 16px", cursor: "pointer", fontSize: 14, color: "#718096", marginBottom: -2 },
  tabBtnActive: { color: "#38a169", borderBottomColor: "#38a169", fontWeight: 600 },
  input:        { display: "block", width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" },
  greenBtn:     { background: "#38a169", color: "#fff", border: "none", padding: "11px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  outlineBtn:   { background: "#fff", color: "#4a5568", border: "1px solid #e2e8f0", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  cancelBtn:    { background: "#e53e3e", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  cancelBtnSm:  { background: "#fff", color: "#e53e3e", border: "1px solid #e53e3e", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  tableWrap:    { overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th:           { padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: .5, background: "#f7fafc", borderBottom: "1px solid #e2e8f0" },
  tr:           { borderBottom: "1px solid #f0f4f8" },
  td:           { padding: "12px 14px", color: "#2d3748" },
};