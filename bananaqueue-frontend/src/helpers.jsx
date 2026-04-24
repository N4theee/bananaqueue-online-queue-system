import { io } from "socket.io-client";

export const API = "http://localhost:5000/api";
export const SOCKET_URL = "http://localhost:5000";

export async function apiFetch(path, method = "GET", body = null, token = null) {
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

export const DEPT_ICONS = { Cashier: "💰", Clinic: "🏥", Auditing: "📋" };
export const DEPT_COLORS = {
  Cashier:  { bg: "#fff8e1", border: "#f59e0b" },
  Clinic:   { bg: "#fce4ec", border: "#e91e63" },
  Auditing: { bg: "#e8f5e9", border: "#4caf50" },
};

export function statusBadge(status) {
  const map = {
    waiting:   { bg: "#fff3cd", color: "#856404", label: "Waiting" },
    called:    { bg: "#cce5ff", color: "#004085", label: "Called" },
    serving:   { bg: "#d4edda", color: "#155724", label: "Serving" },
    completed: { bg: "#e2e3e5", color: "#383d41", label: "Completed" },
    cancelled: { bg: "#f8d7da", color: "#721c24", label: "Cancelled" },
  };
  const sv = map[status] || map.waiting;
  return (
    <span style={{ background: sv.bg, color: sv.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {sv.label}
    </span>
  );
}

export const s = {
  app:          { display: "flex", minHeight: "100vh", background: "#f7fafc", fontFamily: "'Inter',system-ui,sans-serif" },
  authWrap:     { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "linear-gradient(135deg,#f7fafc,#edf2f7)" },
  authCard:     { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, padding: "40px 36px", width: 390, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  sidebarLogo:  { display: "flex", alignItems: "center", gap: 8, padding: "20px 20px 16px", fontWeight: 800, fontSize: 15, color: "#2d3748", borderBottom: "1px solid #e2e8f0", marginBottom: 8 },
  sidebarFooter:{ padding: "16px 20px", borderTop: "1px solid #e2e8f0" },
  navBtn:       { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "#4a5568", textAlign: "left" },
  navBtnActive: { background: "#f0fff4", color: "#276749", fontWeight: 700, borderRight: "3px solid #38a169" },
  signOutBtn:   { background: "none", border: "none", color: "#718096", cursor: "pointer", fontSize: 13, padding: 0 },
  main:         { flex: 1, padding: "32px 36px", maxWidth: 960 },
  pageTitle:    { fontWeight: 800, fontSize: 24, color: "#1a202c", marginBottom: 4 },
  pageSubtitle: { color: "#718096", fontSize: 14, marginBottom: 24 },
  muted:        { color: "#718096", fontSize: 14 },
  flash:        { background: "#fefcbf", border: "1px solid #f6e05e", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "#744210" },
  flashErr:     { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "#c53030" },
  cardGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 8 },
  cardGrid2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 },
  queueCard:    { border: "2px solid", borderRadius: 14, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", textAlign: "center", cursor: "pointer", transition: "transform .15s, box-shadow .15s" },
  overviewCard: { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20, cursor: "pointer", transition: "box-shadow .2s" },
  mgmtCard:     { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 24, cursor: "pointer", transition: "box-shadow .2s" },
  entryCard:    { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, maxWidth: 480 },
  servingCard:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tabRow:       { display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0" },
  tabBtn:       { background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "8px 16px", cursor: "pointer", fontSize: 14, color: "#718096", marginBottom: -2 },
  tabBtnActive: { color: "#38a169", borderBottomColor: "#38a169", fontWeight: 700 },
  input:        { display: "block", width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "'Inter',system-ui,sans-serif" },
  greenBtn:     { background: "#38a169", color: "#fff", border: "none", padding: "11px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "background .15s" },
  yellowBtn:    { background: "#d97706", color: "#fff", border: "none", padding: "11px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  outlineBtn:   { background: "#fff", color: "#4a5568", border: "1px solid #e2e8f0", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  cancelBtn:    { background: "#e53e3e", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  cancelBtnSm:  { background: "#fff", color: "#e53e3e", border: "1px solid #e53e3e", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  tableWrap:    { overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th:           { padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "#718096", textTransform: "uppercase", letterSpacing: .5, background: "#f7fafc", borderBottom: "1px solid #e2e8f0" },
  tr:           { borderBottom: "1px solid #f0f4f8" },
  td:           { padding: "12px 14px", color: "#2d3748" },
};

let _socket = null;
export function getSocket(token) {
  if (!_socket) {
    _socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
  }
  return _socket;
}
export function disconnectSocket() {
  if (_socket) { _socket.disconnect(); _socket = null; }
}
