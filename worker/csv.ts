import type { D1Database } from '@cloudflare/workers-types';
import { labels, dresscodes, foods, desserts, drinks, activities, returnTimes } from '../shared/options';
import type { ResponseData } from '../shared/schema';
import type { ResponseRow } from './types';

const columns = ['ID', 'Ngày gửi (UTC)', 'Đã xem', 'Ngày và giờ rảnh', 'Trang phục', 'Ghi chú trang phục', 'Món ăn', 'Tráng miệng', 'Đồ uống', 'Hoạt động', 'Giờ về', 'Ghi chú giờ về', 'Lời nhắn'];
function cell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function row(values: unknown[]) { return values.map(cell).join(',') + '\r\n'; }
function responseRow(record: ResponseRow) {
  const data = JSON.parse(record.payload) as ResponseData;
  return row([record.id, record.created_at, record.viewed ? 'Có' : 'Chưa', data.flexibleDate ? 'Ngày nào cũng được' : data.availableDates.map(day => `${day.date}: ${day.timeSlots.map(slot => `${slot.start}–${slot.end}`).join(', ')}`).join('; '), labels(data.dresscodes, dresscodes), data.dresscodeNote, labels(data.foods, foods), labels(data.desserts, desserts), labels(data.drinks, drinks), labels(data.activities, activities), data.returnTime === 'specific' ? data.specificReturnTime : labels([data.returnTime], returnTimes), data.returnNote, data.notes]);
}

export function csvStream(db: D1Database) {
  const encoder = new TextEncoder();
  let first = true;
  let date = '';
  let id = '';
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (first) { controller.enqueue(encoder.encode('\uFEFF' + row(columns))); first = false; return; }
        const page = await db.prepare('SELECT * FROM responses WHERE created_at > ? OR (created_at = ? AND id > ?) ORDER BY created_at ASC, id ASC LIMIT 100').bind(date, date, id).all<ResponseRow>();
        if (!page.results.length) { controller.close(); return; }
        controller.enqueue(encoder.encode(page.results.map(responseRow).join('')));
        const last = page.results[page.results.length - 1];
        date = last.created_at; id = last.id;
        if (page.results.length < 100) controller.close();
      } catch { controller.error(new Error('Không thể xuất CSV lúc này.')); }
    },
  });
}
