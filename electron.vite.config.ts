import { resolve } from 'path'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import ts from 'typescript'

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
          const { outputText } = ts.transpileModule(readFileSync(source, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
          })
          return `export default ${JSON.stringify(outputText)}`
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
