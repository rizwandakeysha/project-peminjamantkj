const TOKEN_KEY = "admin_token";
const ADMIN_INFO_KEY = "admin_info";

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminInfo(adminInfo: { id: number; username: string; nama_lengkap: string }) {
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminInfo));
}

export function getAdminInfo(): { id: number; username: string; nama_lengkap: string } | null {
  const info = localStorage.getItem(ADMIN_INFO_KEY);
  return info ? JSON.parse(info) : null;
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
}

// Parse JWT token to get admin info (without verifying signature on client)
export function parseAdminToken(): any {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
}

// Check if token exists and is valid
export function isAdminAuthenticated(): boolean {
  const token = getAdminToken();
  if (!token) return false;

  const decoded = parseAdminToken();
  if (!decoded) return false;

  // Check if token is expired (exp is in seconds)
  if (decoded.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      clearAdminToken();
      return false;
    }
  }

  return true;
}


