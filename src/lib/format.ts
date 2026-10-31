import { formatDateZh, type TravelerCategory } from '@/core';

export const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`;
export const twd = (n: number) => `NT$${Math.round(n).toLocaleString('zh-TW')}`;
export const dateZh = formatDateZh;

export function dateTimeZh(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const CATEGORY_LABEL: Record<TravelerCategory, string> = { adult: '大人', child: '兒童', infant: '幼兒' };

export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `web-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
