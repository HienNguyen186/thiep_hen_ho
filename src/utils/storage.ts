import { draftSchema, newDraft, type ResponseData } from '../../shared/schema';
const KEY = 'date-with-you:draft:v1';
export function readDraft(): { data: ResponseData; step: number } {
  try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); const parsed = draftSchema.safeParse(raw?.data); if (parsed.success) return { data: parsed.data, step: Math.max(0, Math.min(8, Number(raw.step) || 0)) }; } catch { /* Use a fresh draft if storage is unavailable or invalid. */ }
  return { data: newDraft(), step: 0 };
}
export function saveDraft(data: ResponseData, step: number) { try { localStorage.setItem(KEY, JSON.stringify({ data, step })); return true; } catch { return false; } }
export function clearDraft() { try { localStorage.removeItem(KEY); } catch { /* Storage is optional. */ } }
