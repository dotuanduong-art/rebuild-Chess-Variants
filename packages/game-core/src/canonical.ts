/** Strict JSON-only encoding: reject values that JSON.stringify would silently drop/coerce. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}
export function canonicalEncode(value: unknown): string {
  const ancestors = new Set<object>();
  function visit(item: unknown): unknown {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (!item || typeof item !== 'object' || ancestors.has(item))
      throw new Error('NON_SERIALIZABLE');
    if (
      !Array.isArray(item) &&
      Object.getPrototypeOf(item) !== Object.prototype &&
      Object.getPrototypeOf(item) !== null
    )
      throw new Error('NON_SERIALIZABLE');
    if (Object.getOwnPropertySymbols(item).length) throw new Error('NON_SERIALIZABLE');
    ancestors.add(item);
    let result: unknown;
    if (Array.isArray(item)) {
      const keys = Object.keys(item);
      if (keys.length !== item.length || keys.some((key, index) => key !== String(index)))
        throw new Error('NON_SERIALIZABLE');
      result = item.map(visit);
    } else {
      result = Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, visit((item as Record<string, unknown>)[key])]),
      );
    }
    ancestors.delete(item);
    return result;
  }
  return JSON.stringify(visit(value));
}
/** Deterministic diagnostic fingerprint, not a security/authentication primitive. */
export function fingerprint(text: string): string {
  let hash = 0xcbf29ce484222325n;
  const byte = (value: number) => {
    hash = BigInt.asUintN(64, (hash ^ BigInt(value)) * 0x100000001b3n);
  };
  for (const char of text) {
    let code = char.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) byte(code);
    else if (code < 0x800) {
      byte(0xc0 | (code >> 6));
      byte(0x80 | (code & 63));
    } else if (code < 0x10000) {
      byte(0xe0 | (code >> 12));
      byte(0x80 | ((code >> 6) & 63));
      byte(0x80 | (code & 63));
    } else {
      byte(0xf0 | (code >> 18));
      byte(0x80 | ((code >> 12) & 63));
      byte(0x80 | ((code >> 6) & 63));
      byte(0x80 | (code & 63));
    }
  }
  return hash.toString(16).padStart(16, '0');
}
export function cloneData<T>(value: T): T {
  return JSON.parse(canonicalEncode(value)) as T;
}
