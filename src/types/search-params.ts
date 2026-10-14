export function parseSearchArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'string') ? value : undefined
  }

  if (typeof value !== 'string') return undefined

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed
    }
  } catch {
    if (value.startsWith('[')) return undefined
  }

  return [value]
}

export function serializeSearchArray(values: readonly string[]): string {
  return JSON.stringify(values)
}
