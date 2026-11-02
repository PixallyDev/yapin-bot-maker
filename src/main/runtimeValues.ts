import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
export function stringify(value: unknown): string {
  return typeof value === 'string' ? value : (JSON.stringify(value) ?? '')
}
export function jsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
export function listValue(value: unknown): unknown[] {
  const parsed = jsonValue(value)
  if (!Array.isArray(parsed)) throw Error('Expected a JSON list.')
  return parsed
}
export function jsonPath(value: unknown, path: string): unknown {
  let result = value
  for (const part of path
    .replace(/^\$\.?/, '')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)) {
    if (['__proto__', 'constructor', 'prototype'].includes(part)) throw Error('Unsafe JSON path.')
    if (result === null || typeof result !== 'object') return undefined
    result = Object.hasOwn(result, part) ? (result as Record<string, unknown>)[part] : undefined
  }
  return result
}
/** Numeric grammar only: arithmetic, parentheses and powers; never executes JavaScript. */
export function calculate(expression: string): number {
  if (expression.length > 2000) throw Error('Expression too long.')
  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\*\*|[()+\-*/%^]/gi) ?? []
  if (tokens.join('') !== expression.replace(/\s/g, '') || !tokens.length || tokens.length > 500)
    throw Error('Invalid math expression.')
  let index = 0
  const atom = (): number => {
    const token = tokens[index++]
    if (token === '+' || token === '-') return (token === '-' ? -1 : 1) * expr(2)
    if (token === '(') {
      const n = expr(0)
      if (tokens[index++] !== ')') throw Error('Unclosed parenthesis.')
      return n
    }
    if (token === undefined || !/^\d|^\./.test(token)) throw Error('Expected a number.')
    return Number(token)
  }
  const ranks: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3, '**': 3 }
  const expr = (minimum: number): number => {
    let left = atom()
    while (index < tokens.length && (ranks[tokens[index]] ?? 0) > minimum) {
      const op = tokens[index++],
        rank = ranks[op],
        right = expr(op === '^' || op === '**' ? rank - 1 : rank)
      left =
        op === '+'
          ? left + right
          : op === '-'
            ? left - right
            : op === '*'
              ? left * right
              : op === '/'
                ? left / right
                : op === '%'
                  ? left % right
                  : left ** right
    }
    return left
  }
  const result = expr(0)
  if (index !== tokens.length || !Number.isFinite(result))
    throw Error('Math result is not finite or the expression is invalid.')
  return result
}
export function cryptText(
  value: string,
  password: string,
  decrypt: boolean,
  encoding: 'hex' | 'base64' = 'base64'
): string {
  if (!password) throw Error('Set an encryption key variable first.')
  if (value.length > 1024 * 1024) throw Error('Encryption input too large.')
  if (decrypt) {
    const packet = JSON.parse(Buffer.from(value, encoding).toString('utf8'))
    if (packet.v !== 1) throw Error('Unsupported encrypted text format.')
    const key = scryptSync(password, Buffer.from(packet.salt, 'base64'), 32)
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(packet.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(packet.tag, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(packet.data, 'base64')),
      decipher.final()
    ]).toString('utf8')
  }
  const salt = randomBytes(16),
    iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', scryptSync(password, salt, 32), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return Buffer.from(
    JSON.stringify({
      v: 1,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64')
    })
  ).toString(encoding)
}
