// JSON Pointer helpers shared by the validator and the wizard (kept free of the validator
// so browser code can use them without bundling the schema)

export function escapePointer(key: string) {
  return key.replace(/~/g, '~0').replace(/\//g, '~1')
}

export function findNullPointers(node: unknown, base = ''): string[] {
  if (node === null) return [base]
  if (Array.isArray(node)) return node.flatMap((v, i) => findNullPointers(v, `${base}/${i}`))
  if (typeof node === 'object' && node) {
    return Object.entries(node).flatMap(([k, v]) => findNullPointers(v, `${base}/${escapePointer(k)}`))
  }
  return []
}
