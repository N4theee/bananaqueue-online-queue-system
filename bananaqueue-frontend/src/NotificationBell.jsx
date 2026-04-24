import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch, getSocket, s } from "./helpers.jsx";

// ── NOTIFICATION BELL (Admin + Staff) ────────────────────────
export function NotificationBell({ token, user }) {
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState([]); // { id, icon, title, body, time, read }
  const [adminN, setAdminN] = useState([]); // admin pending requests from DB
  const bellRef  = useRef(null);
  const idRef    = useRef(0);
  const isAdmin  = user?.role === "admin";
  const isStaff  = user?.role === "staff";

  const addLocalNotif = (icon, title, body) => {
    const id = ++idRef.current;
    setNotifs(prev => [{ id, icon, title, body, time: new Date(), read: false }, ...prev].slice(0, 30));
  };

  // Admin: load pending queue-toggle requests from DB
  const loadAdminNotifs = useCallback(async () => {
    if (!isAdmin) return;
    const d = await apiFetch("/admin/notifications", "GET", null, token);
    if (Array.isArray(d)) setAdminN(d.filter(n => n.status === "pending"));
  }, [token, isAdmin]);

  useEffect(() => { loadAdminNotifs(); }, [loadAdminNotifs]);

  // Socket listeners
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket(token);
    const myQueueId = user?.department?._id ? String(user.department._id) : null;

    // Staff: hear when a customer in their queue cancels
    const onCancelled = (data) => {
      if (!isStaff) return;
      // Only show if it's for their own queue (or admin shows all)
      addLocalNotif("❌", "Customer Cancelled",
        `#${data.queueNumber} — ${data.customerName} cancelled their spot.`);
    };

    // Admin: new request from staff
    const onNewNotif = () => {
      if (!isAdmin) return;
      loadAdminNotifs();
      addLocalNotif("📩", "New Staff Request", "A staff member sent a queue request.");
    };

    // General queue updates for staff
    const onQueueUpdated = (data) => {
      if (!isStaff) return;
      if (data.event === "cancelled") {
        // Already handled by onCancelled — skip double
      }
    };

    socket.on("customerCancelled", onCancelled);
    socket.on("newNotification",   onNewNotif);
    socket.on("notificationResolved", () => { if (isAdmin) loadAdminNotifs(); });

    return () => {
      socket.off("customerCancelled", onCancelled);
      socket.off("newNotification",   onNewNotif);
      socket.off("notificationResolved");
    };
  }, [token, user, isAdmin, isStaff, loadAdminNotifs]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.read).length + adminN.length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  const approve = async (id) => {
    await apiFetch(`/admin/notifications/${id}/approve`, "POST", null, token);
    loadAdminNotifs();
  };
  const reject = async (id) => {
    await apiFetch(`/admin/notifications/${id}/reject`, "POST", null, token);
    loadAdminNotifs();
  };

  return (
    <div ref={bellRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); markAllRead(); }}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          padding: "6px 10px", borderRadius: 8, position: "relative",
          fontSize: 20, lineHeight: 1, color: "#4a5568",
          transition: "background .15s",
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 4,
            background: "#e53e3e", color: "#fff",
            borderRadius: "50%", width: 17, height: 17,
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, system-ui, sans-serif",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 340, background: "#fff",
          border: "1px solid #e2e8f0", borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          zIndex: 9999, maxHeight: 480, overflowY: "auto",
          fontFamily: "Inter, system-ui, sans-serif",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>🔔 Notifications</span>
            {notifs.length > 0 && (
              <button style={{ ...s.signOutBtn, fontSize: 12 }} onClick={() => setNotifs([])}>Clear</button>
            )}
          </div>

          {/* Admin pending requests */}
          {adminN.map(n => (
            <div key={n._id} style={{
              padding: "12px 16px", borderBottom: "1px solid #f0f4f8",
              borderLeft: "4px solid #f59e0b", background: "#fffbeb",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2d3748", marginBottom: 4 }}>
                📩 {n.message}
              </div>
              <div style={{ fontSize: 11, color: "#a0aec0", marginBottom: 8 }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => approve(n._id)}
                  style={{ ...s.greenBtn, fontSize: 11, padding: "4px 12px" }}>✓ Approve</button>
                <button onClick={() => reject(n._id)}
                  style={{ ...s.cancelBtnSm, fontSize: 11 }}>✕ Reject</button>
              </div>
            </div>
          ))}

          {/* Local real-time notifications */}
          {notifs.map(n => (
            <div key={n.id} style={{
              padding: "12px 16px",
              borderBottom: "1px solid #f0f4f8",
              background: n.read ? "#fff" : "#f7fafc",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 20 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2d3748" }}>{n.title}</div>
                <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 4 }}>
                  {n.time.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {notifs.length === 0 && adminN.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "#a0aec0", fontSize: 14 }}>
              No notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}
