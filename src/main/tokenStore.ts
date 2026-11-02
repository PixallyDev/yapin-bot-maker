import { safeStorage } from 'electron'
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface TokenSettings {
  success: boolean
  available: boolean
  remember: boolean
  token?: string
  error?: string
}

/** Credentials stay in the OS-backed vault under app userData, never in projects. */
export class TokenStore {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private directory: string) {}

  private available(): boolean {
    return (
      safeStorage.isEncryptionAvailable() &&
      (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text')
    )
  }

  public async get(): Promise<TokenSettings> {
    await this.queue
    const available = this.available()
    try {
      const encrypted = await readFile(join(this.directory, 'bot-token.enc'))
      if (!available) throw new Error('Encrypted storage is unavailable.')
      return {
        success: true,
        available,
        remember: true,
        token: safeStorage.decryptString(encrypted)
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { success: true, available, remember: false }
      }
      return {
        success: false,
        available,
        remember: !available,
        error:
          'Saved token could not be unlocked. Enter it again; enable Remember token to replace it, or disable it to clear it.'
      }
    }
  }

  public set(token: unknown, remember: unknown): Promise<TokenSettings> {
    const operation = this.queue.then(async (): Promise<TokenSettings> => {
      const available = this.available()
      if (typeof token !== 'string' || typeof remember !== 'boolean') {
        return { success: false, available, remember: false, error: 'Invalid token settings.' }
      }
      const file = join(this.directory, 'bot-token.enc')
      let temporary: string | undefined
      try {
        if (!remember) {
          await rm(file, { force: true })
          return { success: true, available, remember: false }
        }
        if (!available) throw new Error('Encrypted storage is unavailable.')
        await mkdir(this.directory, { recursive: true })
        temporary = join(this.directory, `bot-token-${randomUUID()}.tmp`)
        await writeFile(temporary, safeStorage.encryptString(token), { mode: 0o600, flag: 'wx' })
        await rename(temporary, file)
        return { success: true, available, remember: true }
      } catch {
        return {
          success: false,
          available,
          remember: false,
          error: 'Could not save token securely. The token remains available for this session.'
        }
      } finally {
        if (temporary) await rm(temporary, { force: true }).catch(() => {})
      }
    })
    this.queue = operation.catch(() => {})
    return operation
  }
}
