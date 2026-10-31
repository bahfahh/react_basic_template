/**
 * Masks secrets and identity data before anything reaches event logs, analytics or
 * external agents. Task inputs keep only what the package needs; logs keep less.
 */

const SECRET_KEYS = /pass(word)?|otp|one.?time|驗證碼|cvv|cvc|pin|secret|token|credential/i;

const PATTERNS: Array<[RegExp, string]> = [
  // Card numbers (13–19 digits, optional separators)
  [/\b(?:\d[ -]?){12,18}\d\b/g, '[已遮蔽:卡號]'],
  // Taiwan national ID
  [/\b[A-Z][12]\d{8}\b/g, '[已遮蔽:身分證]'],
  // Passport-like: 1–2 letters followed by 7–8 digits
  [/\b[A-Z]{1,2}\d{7,8}\b/g, '[已遮蔽:證件號]'],
  // Email
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[已遮蔽:email]'],
  // Taiwan mobile
  [/\b09\d{2}[- ]?\d{3}[- ]?\d{3}\b/g, '[已遮蔽:電話]'],
  // OTP mentioned inline: "OTP 123456", "驗證碼:123456"
  [/(otp|驗證碼|認證碼|one[- ]?time (?:password|code))\s*[:：是為]?\s*\d{4,8}/gi, '$1 [已遮蔽]'],
];

export function redactText(text: string): string {
  return PATTERNS.reduce((acc, [re, replacement]) => acc.replace(re, replacement), text);
}

export function redact<T>(value: T): T {
  return redactValue(value, undefined) as T;
}

const PASSTHROUGH_KEYS = /^(id|seq|at)$|Id$|Hash$|^hash$/;

function redactValue(value: unknown, key: string | undefined): unknown {
  if (key && PASSTHROUGH_KEYS.test(key)) return value;
  if (key && SECRET_KEYS.test(key)) return '[已遮蔽]';
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, undefined));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactValue(v, k);
    return out;
  }
  return value;
}
