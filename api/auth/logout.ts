import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getDb } from "../lib/db"
import { clearSessionCookie } from "../lib/auth"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const cookies = parseCookies(req.headers.cookie || "")
  const token = cookies["cms_session"]

  if (token) {
    const sql = getDb()
    await sql`DELETE FROM sessions WHERE token = ${token}`
  }

  res.setHeader("Set-Cookie", clearSessionCookie())
  return res.status(200).json({ ok: true })
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.split("=")
    if (key) cookies[key.trim()] = rest.join("=").trim()
  }
  return cookies
}
