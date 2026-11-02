import { resolve } from 'path'
import { execFileSync } from 'node:child_process'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { standaloneRuntime } from './build/standaloneRuntime'

function buildCommit(): string {
  const supplied = process.env.YAPPER_BUILD_COMMIT || process.env.GITHUB_SHA
  if (supplied && /^[a-f0-9]{40}$/i.test(supplied)) return supplied
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return ''
  }
}

export default defineConfig({
  main: {
    define: { __APP_BUILD_COMMIT__: JSON.stringify(buildCommit()) },
    plugins: [
      {
        name: 'standalone-bot-runtime',
        resolveId(id) {
          return id === 'virtual:bot-runtime' ? '\0virtual:bot-runtime' : undefined
        },
        load(id) {
          if (id !== '\0virtual:bot-runtime') return
          const source = resolve('src/main/botRunner.ts')
          this.addWatchFile(source)
          for (const path of [
            'src/renderer/src/data/nodeCatalog.ts',
            'src/shared/graph.ts',
            'src/shared/nodeSupport.ts',
            'src/main/runtimeStorage.ts',
            'src/main/runtimeValues.ts',
            'src/main/catalogRuntime.ts'
          ])
            this.addWatchFile(resolve(path))
          return `export default ${JSON.stringify(standaloneRuntime())}`
        }
      }
    ]
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
