import { z } from 'zod';
import { dresscodes, foods, desserts, drinks, activities, returnTimes, type Option } from './options';
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ.');
const selection = (options: Option[], required = true) => z.array(z.string()).max(options.length).refine(ids => ids.every(id => options.some(o => o.id === id)) && new Set(ids).size === ids.length, 'Lựa chọn không hợp lệ.').refine(ids => !required || ids.length > 0, 'Em chọn ít nhất một lựa chọn nhé.').refine(ids => ids.length <= 1 || !ids.some(id => ['no-preference', 'none'].includes(id)), 'Lựa chọn linh hoạt phải được chọn riêng.');
const note = z.string().trim().max(2000, 'Ghi chú tối đa 2.000 ký tự.');
export const draftSchema = z.object({
  submissionId: z.uuid(), flexibleDate: z.boolean(),
  availableDates: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timeSlots: z.array(z.object({ start: time, end: time })).max(8) })).max(20),
  dresscodes: z.array(z.string()), dresscodeNote: note, foods: z.array(z.string()),
  desserts: z.array(z.string()), drinks: z.array(z.string()), activities: z.array(z.string()),
  returnTime: z.string(), specificReturnTime: z.string(), returnNote: note, notes: note,
}).strict();
export const responseSchema = draftSchema.extend({
  dresscodes: selection(dresscodes), foods: selection(foods), desserts: selection(desserts, false), drinks: selection(drinks, false), activities: selection(activities),
  returnTime: z.string().refine(id => returnTimes.some(o => o.id === id), 'Em chọn giờ về nhé.'),
}).superRefine((data, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (data.flexibleDate && data.availableDates.length) issue(['availableDates'], 'Ngày linh hoạt không đi cùng ngày cụ thể.');
  if (!data.flexibleDate && !data.availableDates.length) issue(['availableDates'], 'Em thêm ít nhất một ngày rảnh nhé.');
  const seen = new Set<string>();
  data.availableDates.forEach((day, i) => {
    const parsed = new Date(`${day.date}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day.date || day.date <= today()) issue(['availableDates', i], 'Em chọn một ngày trong tương lai nhé.');
    if (seen.has(day.date)) issue(['availableDates', i], 'Ngày này đã được thêm rồi.');
    seen.add(day.date);
    if (!day.timeSlots.length) issue(['availableDates', i], 'Mỗi ngày cần ít nhất một khung giờ.');
    const slots = new Set<string>();
    day.timeSlots.forEach((slot, j) => {
      if (slot.end <= slot.start) issue(['availableDates', i, 'timeSlots', j], 'Giờ kết thúc phải sau giờ bắt đầu (trong cùng ngày).');
      const key = `${slot.start}-${slot.end}`;
      if (slots.has(key)) issue(['availableDates', i, 'timeSlots', j], 'Khung giờ này đã được thêm rồi.');
      slots.add(key);
    });
  });
  if (data.returnTime === 'specific' && !time.safeParse(data.specificReturnTime).success) issue(['specificReturnTime'], 'Em chọn giờ về cụ thể nhé.');
});
export type ResponseData = z.infer<typeof draftSchema>;
export type SavedResponse = { id: string; createdAt: string; viewed: boolean; data: ResponseData };
export const newDraft = (): ResponseData => ({ submissionId: crypto.randomUUID(), flexibleDate: false, availableDates: [], dresscodes: [], dresscodeNote: '', foods: [], desserts: [], drinks: [], activities: [], returnTime: '', specificReturnTime: '', returnNote: '', notes: '' });
export const futureDate = () => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); };
