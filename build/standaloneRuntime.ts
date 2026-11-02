import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
/** Inline every first-party module; Node builtins and declared runtime dependencies use native require. */
export function standaloneRuntime(): string {
  const paths = [
    'src/renderer/src/data/nodeCatalog',
    'src/shared/graph',
    'src/shared/nodeSupport',
    'src/main/runtimeStorage',
    'src/main/runtimeValues',
    'src/main/catalogRuntime',
    'src/main/botRunner'
  ]
  const modules = paths.map(
    (path) =>
      JSON.stringify(path) +
      ': function(module, exports, require) {\n' +
      ts.transpileModule(readFileSync(resolve(path + '.ts'), 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true
        }
      }).outputText +
      '\n}'
  )
  return `const runtimeFactories={${modules.join(',\n')}};
const runtimeCache={};
function runtimeRequire(name,from=''){
 if(!name.startsWith('.'))return require(name);
 const id=require('node:path').posix.normalize(require('node:path').posix.join(require('node:path').posix.dirname(from),name));
 return runtimeLoad(id);
}
function runtimeLoad(id){
 if(runtimeCache[id])return runtimeCache[id].exports;
 const module={exports:{}};runtimeCache[id]=module;
 if(!runtimeFactories[id])throw Error('Missing runtime module '+id);
 runtimeFactories[id](module,module.exports,name=>runtimeRequire(name,id));return module.exports;
}
Object.assign(exports,runtimeLoad('src/main/botRunner'));`
}
