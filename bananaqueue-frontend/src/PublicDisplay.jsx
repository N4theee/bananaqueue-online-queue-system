import { useState, useEffect } from "react";
import { apiFetch, DEPT_ICONS, getSocket } from "./helpers.jsx";

export function PublicDisplay() {
  const [queues, setQueues] = useState([]);
  const [time,   setTime]   = useState(new Date());

  const load = async () => {
    // Public endpoint — no token needed
    try {
      const res = await fetch("http://localhost:5000/api/queues");
      const data = await res.json();
      if (Array.isArray(data)) setQueues(data);
    } catch { /* server offline */ }
  };

  useEffect(() => {
    load();
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const socket = getSocket(null);
    socket.on("queueUpdated", load);
    socket.on("queueReset",   load);
    return () => { socket.off("queueUpdated", load); socket.off("queueReset", load); };
  }, []);

  const deptColors = {
    Cashier:  "#f59e0b",
    Clinic:   "#e91e63",
    Auditing: "#4caf50",
  };

  return (
    <div className="display-page">
      <div style={{ marginBottom: 8, display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize: 40 }}>🍌</span>
        <div>
          <div className="display-title">BananaQueue — Live Display</div>
          <div className="display-subtitle">Queue numbers update in real time</div>
        </div>
      </div>

      <div className="display-grid">
        {queues.map(q => {
          const dname = q.department?.name || q.name;
          const color = deptColors[dname] || "#667eea";
          const icon  = DEPT_ICONS[dname] || "🏢";
          return (
            <div key={q._id} className="display-card">
              <div className="display-dept">{icon} {dname}</div>
              <div className="display-number queue-number-animate" style={{ color }}>
                {q.currentNumber > 0 ? `#${String(q.currentNumber).padStart(3,"0")}` : "—"}
              </div>
              <div className="display-status">
                {q.currentNumber > 0 ? "Now Serving" : "Waiting to start"}
              </div>
              <div style={{ marginTop: 8 }}>
                {q.isActive
                  ? <span className="display-badge-active">🟢 Open</span>
                  : <span className="display-badge-inactive">🔴 Closed</span>}
              </div>
              <div style={{ color: "#718096", fontSize: 12, marginTop: 8 }}>
                {q.waitingCount || 0} in queue
              </div>
            </div>
          );
        })}
      </div>

      <div className="display-clock">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        &nbsp;—&nbsp;
        {time.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}
