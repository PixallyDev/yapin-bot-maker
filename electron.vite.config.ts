import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { standaloneRuntime } from './build/standaloneRuntime'

export default defineConfig({
  main: {
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
