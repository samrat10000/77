export const BACKEND_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
export const LS_TOKEN = "jam_token";
export const LS_USERNAME = "jam_username";
export const LS_SESSION = "jam_session_id";

export const getStoredUsername = () => localStorage.getItem(LS_USERNAME) || "";
export const getStoredToken = () => localStorage.getItem(LS_TOKEN) || "";

export async function apiAuth(endpoint, body) {
  const res = await fetch(`${BACKEND_URL}/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
