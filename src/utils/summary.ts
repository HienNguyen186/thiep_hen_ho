import type { ResponseData } from '../../shared/schema';
import { labels, dresscodes, foods, desserts, drinks, activities, returnTimes } from '../../shared/options';
export const formatDate = (date: string) => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`));
export function summary(data: ResponseData) {
  return [
    { step: 1, title: 'Ngày & giờ rảnh', value: data.flexibleDate ? 'Ngày nào cũng được, anh chọn nhé' : data.availableDates.map(d => `${formatDate(d.date)} · ${d.timeSlots.map(t => `${t.start} – ${t.end}`).join(', ')}`).join('\n') },
    { step: 2, title: 'Trang phục', value: [labels(data.dresscodes, dresscodes), data.dresscodeNote].filter(Boolean).join('\n') },
    { step: 3, title: 'Món ăn', value: labels(data.foods, foods) },
    { step: 4, title: 'Một chút ngọt ngào', value: `Tráng miệng: ${labels(data.desserts, desserts) || 'Bỏ qua'}\nĐồ uống: ${labels(data.drinks, drinks) || 'Bỏ qua'}` },
    { step: 5, title: 'Hoạt động', value: labels(data.activities, activities) },
    { step: 6, title: 'Giờ về', value: [data.returnTime === 'specific' ? data.specificReturnTime : labels([data.returnTime], returnTimes), data.returnNote].filter(Boolean).join('\n') },
    { step: 7, title: 'Lời nhắn dành cho anh', value: data.notes || 'Không có lời nhắn thêm' },
  ];
}
