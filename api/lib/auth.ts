import type { VercelRequest } from "@vercel/node"
import { getDb } from "./db"

export async function validateSession(req: VercelRequest): Promise<boolean> {
  const cookies = parseCookies(req.headers.cookie || "")
  const token = cookies["cms_session"]
  if (!token) return false

  const sql = getDb()
  const rows = await sql`
    SELECT token FROM sessions
    WHERE token = ${token} AND expires_at > NOW()
  `
  return rows.length > 0
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.split("=")
    if (key) cookies[key.trim()] = rest.join("=").trim()
  }
  return cookies
}

export function sessionCookie(token: string, maxAge: number): string {
  return `cms_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return `cms_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}
