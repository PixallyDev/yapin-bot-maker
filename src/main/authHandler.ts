import { createServer, type ServerResponse } from 'node:http'
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { join } from 'node:path'
import { app, shell, ipcMain, type BrowserWindow } from 'electron'

export const YAPIN_CLIENT_ID = '2012d842-7d7e-466c-aef3-d78c89d1016e'
export const OAUTH_PORT = 4189
export const OAUTH_REDIRECT_URI = 'http://127.0.0.1:4189/yapin/callback'
export interface YapinUserProfile {
  id: string
  username: string
  displayName: string
  handle: string
  email: string
  avatar?: string
  verified: true
  isVerified: true
}
export interface AuthResult {
  success: boolean
  error?: string
  user?: YapinUserProfile
}
let cancelPending: (() => void) | null = null

export function loadAuthEnvironment(file: string): void {
  try {
    const values = parseEnv(readFileSync(file, 'utf8'))
    for (const key of ['YAPIN_CLIENT_ID', 'YAPIN_CLIENT_SECRET']) {
      if (process.env[key] === undefined && values[key]) process.env[key] = values[key]
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      console.error('[OAuth] Could not read local OAuth configuration.')
  }
}
export async function closeActiveAuthServer(): Promise<void> {
  cancelPending?.()
}
function html(success: boolean): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Yapper Maker Sign In</title><style>body{background:#0b0f19;color:#f3f4f6;font:16px system-ui;display:grid;place-items:center;min-height:95vh}.card{background:#111827;border:1px solid #5865f2;border-radius:18px;padding:48px;max-width:480px;text-align:center}h1{font-size:26px}p{color:#aeb5c4;line-height:1.6}</style><main class="card"><h1>${success ? 'Sign In Complete' : 'Sign In Not Completed'}</h1><p>${success ? 'You can return to Yapper Maker now.' : 'Return to Yapper Maker to view the error and try again.'}</p></main></html>`
}
function respond(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
    Connection: 'close'
  })
  res.end(body)
}
async function oauthRequest(
  paths: string[],
  options: RequestInit,
  signal: AbortSignal
): Promise<Record<string, unknown>> {
  for (const path of paths) {
    const response = await fetch(`https://www.yapin.gg${path}`, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)])
    })
    if (response.status === 404 && path !== paths.at(-1)) {
      console.warn(`[OAuth] ${path} returned HTTP 404; trying alternate OAuth endpoint.`)
      await response.body?.cancel()
      continue
    }
    if (!response.ok)
      throw new Error(
        `OAuth ${path} returned HTTP ${response.status}. Check the OAuth app configuration and registered redirect URI.`
      )
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error(`OAuth invalid response from ${path}.`)
    return body as Record<string, unknown>
  }
  throw new Error('OAuth endpoint unavailable.')
}
export function startOAuthLoopback(
  mainWindow?: BrowserWindow | null,
  port = OAUTH_PORT
): Promise<AuthResult> {
  cancelPending?.()
  return new Promise((resolve) => {
    const controller = new AbortController()
    const state = randomBytes(32).toString('base64url')
    const verifier = randomBytes(32).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const redirect = `http://127.0.0.1:${port}/yapin/callback`
    const clientId = process.env.YAPIN_CLIENT_ID || YAPIN_CLIENT_ID
    let settled = false,
      processing = false
    const server = createServer((req, res) => {
      void callback(req.method, req.url, req.headers.host, res)
    })
    const finish = (result: AuthResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      controller.abort()
      server.close()
      server.closeIdleConnections()
      if (cancelPending === cancel) cancelPending = null
      resolve(result)
    }
    const cancel = (): void => {
      finish({ success: false, error: 'Sign in cancelled.' })
      server.closeAllConnections()
    }
    cancelPending = cancel
    const timer = setTimeout(() => {
      finish({ success: false, error: 'Sign in timed out. Please try again.' })
      server.closeAllConnections()
    }, 300_000)
    timer.unref()
    async function callback(
      method: string | undefined,
      path: string | undefined,
      host: string | undefined,
      res: ServerResponse
    ): Promise<void> {
      try {
        const url = new URL(path || '/', redirect)
        if (host !== `127.0.0.1:${port}` || url.pathname !== '/yapin/callback') {
          respond(res, 404, html(false))
          return
        }
        if (method !== 'GET') {
          respond(res, 405, html(false))
          return
        }
        const supplied = Buffer.from(url.searchParams.get('state') || '')
        const expected = Buffer.from(state)
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
          respond(res, 400, html(false))
          return
        }
        if (settled || processing) {
          respond(res, 409, html(false))
          return
        }
        if (url.searchParams.has('error')) {
          res.once('finish', () =>
            finish({ success: false, error: 'Authorization was denied or cancelled in Yapin.' })
          )
          respond(res, 400, html(false))
          return
        }
        const code = url.searchParams.get('code')
        if (!code) {
          respond(res, 400, html(false))
          return
        }
        processing = true
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirect,
          client_id: clientId,
          code_verifier: verifier
        })
        const secret = process.env.YAPIN_CLIENT_SECRET
        if (secret && !/^(replace_me|your_client_secret_here)$/i.test(secret))
          body.set('client_secret', secret)
        const token = await oauthRequest(
          ['/api/oauth/token', '/oauth/token'],
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
          },
          controller.signal
        )
        if (typeof token.access_token !== 'string' || !token.access_token)
          throw new Error('OAuth token response did not contain an access token.')
        const profile = await oauthRequest(
          ['/api/oauth/me', '/oauth/me'],
          {
            headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' }
          },
          controller.signal
        )
        if (
          typeof profile.id !== 'string' ||
          typeof profile.username !== 'string' ||
          !profile.id ||
          !profile.username
        )
          throw new Error('OAuth profile is missing id or username.')
        controller.signal.throwIfAborted()
        const avatar =
          typeof profile.avatar_url === 'string' && profile.avatar_url.startsWith('https://')
            ? profile.avatar_url
            : undefined
        const user: YapinUserProfile = {
          id: profile.id,
          username: profile.username,
          displayName:
            typeof profile.display_name === 'string' ? profile.display_name : profile.username,
          handle: `@${profile.username}`,
          email: '',
          avatar,
          verified: true,
          isVerified: true
        }
        res.once('finish', () => {
          finish({ success: true, user })
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
          }
        })
        respond(res, 200, html(true))
      } catch (error) {
        if (settled) return
        const message =
          error instanceof Error && error.message.startsWith('OAuth')
            ? error.message
            : 'OAuth sign in failed. Check your connection and OAuth app configuration.'
        console.error(`[OAuth] ${message}`)
        res.once('finish', () => finish({ success: false, error: message }))
        respond(res, 502, html(false))
      }
    }
    server.once('error', (error: NodeJS.ErrnoException) =>
      finish({
        success: false,
        error:
          error.code === 'EADDRINUSE'
            ? `Port ${port} is in use by another application. Close it and retry sign in.`
            : 'Could not start the local sign-in callback server.'
      })
    )
    server.listen(port, '127.0.0.1', () => {
      if (settled) {
        server.close()
        return
      }
      const url = new URL('https://www.yapin.gg/oauth/authorize')
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect,
        response_type: 'code',
        scope: 'identify',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256'
      }).toString()
      void shell.openExternal(url.toString()).catch(() => {
        finish({ success: false, error: 'Could not open the system browser.' })
        server.closeAllConnections()
      })
    })
  })
}
export function setupAuthHandlers(getMainWindow: () => BrowserWindow | null): void {
  loadAuthEnvironment(join(app.isPackaged ? app.getPath('userData') : app.getAppPath(), '.env'))
  ipcMain.handle('auth:login-yapin', () => startOAuthLoopback(getMainWindow()))
  ipcMain.handle('auth:cancel-yapin', () => closeActiveAuthServer())
  app.on('before-quit', () => {
    void closeActiveAuthServer()
  })
}
