import { useState, useEffect, useCallback } from "react";
import { apiFetch, s, DEPT_ICONS, DEPT_COLORS, statusBadge, getSocket } from "./helpers.jsx";

// ── ADMIN DASHBOARD ──────────────────────────────────────────
export function AdminDashboard({ token, setPage }) {
  const [overview, setOverview] = useState([]);

  const load = useCallback(async () => {
    const d = await apiFetch("/admin/overview", "GET", null, token);
    if (Array.isArray(d)) setOverview(d);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket(token);
    socket.on("queueUpdated", load);
    socket.on("queueReset",   load);
    return () => { socket.off("queueUpdated", load); socket.off("queueReset", load); };
  }, [load, token]);

  const pageMap = { Cashier: "cashier", Clinic: "clinic", Auditing: "auditing" };

  return (
    <div className="page-pad" style={s.main}>
      <h2 style={s.pageTitle}>🍌 BananaQue — Admin</h2>
      <p style={s.pageSubtitle}>Manage queues, users, and services from here.</p>

      <div className="card-grid2" style={s.cardGrid2}>
        <div style={{ ...s.mgmtCard, borderTop: "4px solid #38a169" }} onClick={() => setPage("users")}>
          <span style={{ fontSize: 28 }}>👥</span>
          <div style={{ fontWeight: 700, marginTop: 8 }}>Manage Users</div>
          <div style={s.muted}>Register and view all users</div>
          <div style={{ color: "#38a169", fontSize: 13, marginTop: 10, fontWeight: 600 }}>Manage →</div>
        </div>
        <div style={{ ...s.mgmtCard, borderTop: "4px solid #667eea" }} onClick={() => setPage("service")}>
          <span style={{ fontSize: 28 }}>⚙</span>
          <div style={{ fontWeight: 700, marginTop: 8 }}>Manage Service</div>
          <div style={s.muted}>Enable or disable department queues</div>
          <div style={{ color: "#667eea", fontSize: 13, marginTop: 10, fontWeight: 600 }}>Configure →</div>
        </div>
      </div>

      <h3 style={{ fontWeight: 700, fontSize: 17, margin: "8px 0 16px" }}>Queue Overview</h3>
      <div className="card-grid" style={s.cardGrid}>
        {overview.map(q => {
          const dname = q.department?.name || "Queue";
          const icon  = DEPT_ICONS[dname]  || "🏢";
          const color = DEPT_COLORS[dname] || { bg: "#f0f4ff", border: "#667eea" };
          const dest  = pageMap[dname];
          return (
            <div key={q._id} onClick={() => dest && setPage(dest)}
              style={{ ...s.overviewCard, borderTop: `4px solid ${color.border}`, cursor: dest ? "pointer" : "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{dname}</span>
                </div>
                <span style={{ fontSize: 13, color: "#718096" }}>{q.waitingCount} waiting</span>
              </div>
              <div style={{ fontSize: 13, color: "#718096", marginTop: 8 }}>
                Serving: {q.currentEntry
                  ? `#${String(q.currentEntry.queueNumber || q.currentNumber).padStart(3,"0")} — ${q.currentEntry.customer?.name || q.currentEntry.customer?.email || ""}`
                  : "None"}
              </div>
              <div style={{ color: q.isActive ? "#38a169" : "#e53e3e", fontSize: 13, marginTop: 10, fontWeight: 600 }}>
                {q.isActive ? "Active — Manage →" : "⛔ Disabled"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MANAGE SERVICE ───────────────────────────────────────────
export function ManageService({ token }) {
  const [queues, setQueues] = useState([]);
  const [msg,    setMsg]    = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const load  = useCallback(async () => {
    const d = await apiFetch("/queues", "GET", null, token);
    if (Array.isArray(d)) setQueues(d);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket(token);
    socket.on("queueUpdated", load);
    return () => socket.off("queueUpdated", load);
  }, [load, token]);

  const toggle = async (q) => {
    await apiFetch(`/queues/${q._id}`, "PUT", { isActive: !q.isActive }, token);
    flash(`${q.department?.name} queue ${!q.isActive ? "enabled" : "disabled"}`);
    load();
  };
  const reset = async (q) => {
    const res = await apiFetch(`/queues/${q._id}/reset`, "POST", null, token);
    flash(res.message || "Reset done");
    load();
  };

  return (
    <div className="page-pad" style={s.main}>
      <h2 style={s.pageTitle}>⚙ Manage Service</h2>
      <p style={s.pageSubtitle}>Enable or disable department queues and reset numbers.</p>
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
              <button style={{ ...s.outlineBtn, fontSize: 13 }} onClick={() => reset(q)}>🔄 Reset</button>
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

// ── MANAGE USERS ─────────────────────────────────────────────
export function ManageUsers({ token }) {
  const [customers,  setCustomers]  = useState([]);
  const [staff,      setStaff]      = useState([]);
  const [depts,      setDepts]      = useState([]);
  const [tab,        setTab]        = useState("customers");
  const [form,       setForm]       = useState({ name: "", email: "", password: "", departmentId: "" });
  const [msg,        setMsg]        = useState("");
  const [msgType,    setMsgType]    = useState("info");
  // Edit state
  const [editStaff,  setEditStaff]  = useState(null); // { id, name, departmentId }
  const [editCust,   setEditCust]   = useState(null); // { id, name }

  const flash = (m, type = "info") => { setMsg(m); setMsgType(type); setTimeout(() => setMsg(""), 4000); };

  const load = useCallback(async () => {
    const [c, st, d] = await Promise.all([
      apiFetch("/admin/customers",   "GET", null, token),
      apiFetch("/admin/staff",       "GET", null, token),
      apiFetch("/admin/departments", "GET", null, token),
    ]);
    if (Array.isArray(c))  setCustomers(c);
    if (Array.isArray(st)) setStaff(st);
    if (Array.isArray(d))  setDepts(d);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const createStaff = async () => {
    if (!form.name || !form.email || !form.password || !form.departmentId)
      return flash("All fields are required", "error");
    const res = await apiFetch("/admin/staff", "POST", form, token);
    if (res.id || res._id) {
      flash(`✅ Staff "${res.name}" created!`);
      setForm({ name:"",email:"",password:"",departmentId:"" });
      load();
    } else flash(res.message, "error");
  };

  const saveStaff = async () => {
    if (!editStaff?.name) return flash("Name is required", "error");
    const res = await apiFetch(`/admin/staff/${editStaff.id}`, "PUT",
      { name: editStaff.name, departmentId: editStaff.departmentId }, token);
    if (res._id) { flash("✅ Staff updated!"); setEditStaff(null); load(); }
    else flash(res.message, "error");
  };

  const deleteStaff = async (id) => {
    await apiFetch(`/admin/staff/${id}`, "DELETE", null, token);
    flash("Staff removed"); load();
  };

  // Admin edits a customer's name (via admin staff endpoint — reuse updateMe logic)
  const saveCust = async () => {
    if (!editCust?.name) return flash("Name is required", "error");
    // We use the same updateStaff endpoint (it works for any user by ID)
    const res = await apiFetch(`/admin/staff/${editCust.id}`, "PUT", { name: editCust.name }, token);
    if (res._id || res.name) { flash("✅ Customer name updated!"); setEditCust(null); load(); }
    else flash(res.message || "Failed", "error");
  };

  return (
    <div className="page-pad" style={s.main}>
      <h2 style={s.pageTitle}>👥 Manage Users</h2>
      {msg && <div style={msgType === "error" ? s.flashErr : s.flash}>{msg}</div>}

      <div style={s.tabRow}>
        {["customers", "staff", "create staff"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* CUSTOMERS TAB */}
      {tab === "customers" && (
        <>
          <p style={s.muted}>{customers.length} registered customers</p>
          <div style={{ ...s.tableWrap, marginTop: 12 }}>
            <table style={s.table}>
              <thead><tr>{["Name","Email","Registered","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id} style={s.tr}>
                    <td style={s.td}>
                      {editCust?.id === c._id ? (
                        <input style={{ ...s.input, marginBottom: 0, width: 160 }}
                          value={editCust.name}
                          onChange={e => setEditCust({ ...editCust, name: e.target.value })} />
                      ) : c.name}
                    </td>
                    <td style={s.td}>{c.email}</td>
                    <td style={s.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={s.td}>
                      {editCust?.id === c._id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...s.greenBtn, fontSize: 12, padding: "4px 12px" }} onClick={saveCust}>Save</button>
                          <button style={s.cancelBtnSm} onClick={() => setEditCust(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button style={{ ...s.outlineBtn, fontSize: 12, padding: "4px 12px" }}
                          onClick={() => setEditCust({ id: c._id, name: c.name })}>✏ Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* STAFF TAB */}
      {tab === "staff" && (
        <>
          <p style={s.muted}>{staff.length} staff members</p>
          <div style={{ ...s.tableWrap, marginTop: 12 }}>
            <table style={s.table}>
              <thead><tr>{["Name","Email","Department","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {staff.map(st => (
                  <tr key={st._id} style={s.tr}>
                    <td style={s.td}>
                      {editStaff?.id === st._id ? (
                        <input style={{ ...s.input, marginBottom: 0, width: 150 }}
                          value={editStaff.name}
                          onChange={e => setEditStaff({ ...editStaff, name: e.target.value })} />
                      ) : st.name}
                    </td>
                    <td style={s.td}>{st.email}</td>
                    <td style={s.td}>
                      {editStaff?.id === st._id ? (
                        <select style={{ ...s.input, marginBottom: 0, width: 140 }}
                          value={editStaff.departmentId}
                          onChange={e => setEditStaff({ ...editStaff, departmentId: e.target.value })}>
                          {depts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                      ) : st.department?.name || "—"}
                    </td>
                    <td style={s.td}>
                      {editStaff?.id === st._id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...s.greenBtn, fontSize: 12, padding: "4px 12px" }} onClick={saveStaff}>Save</button>
                          <button style={s.cancelBtnSm} onClick={() => setEditStaff(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...s.outlineBtn, fontSize: 12, padding: "4px 12px" }}
                            onClick={() => setEditStaff({ id: st._id, name: st.name, departmentId: st.department?._id || "" })}>
                            ✏ Edit
                          </button>
                          <button style={s.cancelBtnSm} onClick={() => deleteStaff(st._id)}>Remove</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CREATE STAFF TAB */}
      {tab === "create staff" && (
        <div style={{ maxWidth: 440 }}>
          <p style={{ ...s.muted, marginBottom: 16 }}>Create a new staff account and assign them to a department.</p>
          <input placeholder="Full name"  style={s.input} value={form.name}     onChange={e => setForm({...form, name: e.target.value})} />
          <input placeholder="Email"      style={s.input} value={form.email}    onChange={e => setForm({...form, email: e.target.value})} />
          <input placeholder="Password" type="password" style={s.input} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <select style={s.input} value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>
            <option value="">Select department</option>
            {depts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <button style={{ ...s.greenBtn, width: "100%", marginTop: 4 }} onClick={createStaff}>
            Create Staff Account
          </button>
        </div>
      )}
    </div>
  );
}
