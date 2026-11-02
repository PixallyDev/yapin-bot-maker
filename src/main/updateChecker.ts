import { dialog, shell, type BrowserWindow } from 'electron'
import { GITHUB_REPOSITORY, ITCH_DOWNLOAD } from '../shared/appLinks'

declare const __APP_BUILD_COMMIT__: string
export const BUILD_COMMIT = typeof __APP_BUILD_COMMIT__ === 'string' ? __APP_BUILD_COMMIT__ : ''
const API = 'https://api.github.com/repos/PixallyDev/yapin-bot-maker'
const revisionPattern = /^[a-f0-9]{40}$/i
type Update = { revision: string; summary: string }

/** Read-only, unauthenticated check; never sends bot credentials or blocks startup. */
export async function checkForUpdate(revision: string): Promise<Update | null> {
  if (!revisionPattern.test(revision)) return null
  const signal = AbortSignal.timeout(8000)
  const request = async (path: string): Promise<unknown> => {
    const response = await fetch(`${API}${path}`, {
      signal,
      redirect: 'error',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Yapper-Maker-Update-Check',
        'Cache-Control': 'no-cache'
      }
    })
    if (!response.ok) throw Error(`Update check returned HTTP ${response.status}.`)
    return response.json()
  }
  try {
    const commits = await request('/commits?per_page=1')
    if (!Array.isArray(commits)) return null
    const latest = commits[0]
    if (!latest || !revisionPattern.test(String(latest.sha)) || latest.sha === revision) return null
    const comparison = await request(`/compare/${revision}...${latest.sha}?per_page=1`)
    if (
      !comparison ||
      typeof comparison !== 'object' ||
      !('status' in comparison) ||
      !['ahead', 'diverged'].includes(String(comparison.status))
    )
      return null
    return {
      revision: latest.sha,
      summary:
        typeof latest.commit?.message === 'string'
          ? latest.commit.message.split('\n')[0].slice(0, 200)
          : 'New repository changes are available.'
    }
  } catch {
    // Offline, rate-limited and unavailable repositories must never interrupt the studio.
    return null
  }
}

export async function showStartupUpdate(
  window: BrowserWindow,
  revision = BUILD_COMMIT
): Promise<void> {
  const update = await checkForUpdate(revision)
  if (!update || window.isDestroyed()) return
  try {
    const { response } = await dialog.showMessageBox(window, {
      type: 'info',
      title: 'Yapper Maker Update',
      message: 'A new update is available',
      detail: `The GitHub repository has changed since this app was built.\n\n${update.summary}\n\nVisit GitHub or itch.io to download the latest available build.\n\nGitHub: ${GITHUB_REPOSITORY}\nitch.io: ${ITCH_DOWNLOAD}`,
      buttons: ['Open GitHub', 'Open itch.io', 'Later'],
      defaultId: 2,
      cancelId: 2,
      noLink: true
    })
    if (response === 0) await shell.openExternal(GITHUB_REPOSITORY)
    else if (response === 1) await shell.openExternal(ITCH_DOWNLOAD)
  } catch {
    // Closing the app while checking, or a missing browser, is non-fatal.
  }
}
