import { useState } from 'react';
import { CalendarDays, Plus, Trash2, X } from 'lucide-react';
import { futureDate, type ResponseData } from '../../shared/schema';
import { formatDate } from '../utils/summary';
export function DateAvailabilityPicker({ data, update }: { data: ResponseData; update: (patch: Partial<ResponseData>) => void }) {
  const [date, setDate] = useState(futureDate);
  const [error, setError] = useState('');
  function addDay() { if (date < futureDate()) { setError('Em chọn một ngày trong tương lai nhé.'); return; } if (data.availableDates.some(d => d.date === date)) { setError('Ngày này đã có trong danh sách rồi.'); return; } update({ flexibleDate: false, availableDates: [...data.availableDates, { date, timeSlots: [{ start: '18:00', end: '21:00' }] }].sort((a, b) => a.date.localeCompare(b.date)) }); setError(''); }
  return <div>
    <label className="flexible-option"><input type="checkbox" checked={data.flexibleDate} onChange={e => update({ flexibleDate: e.target.checked, availableDates: [] })}/><span>Ngày nào cũng được, anh chọn nhé <span aria-hidden="true">♡</span></span></label>
    {!data.flexibleDate && <><div className="date-add"><label>Chọn ngày rảnh<input aria-label="Chọn ngày rảnh" type="date" min={futureDate()} value={date} onChange={e => setDate(e.target.value)}/></label><button className="button secondary" disabled={!date || data.availableDates.length >= 20} onClick={addDay}><Plus size={17}/> Thêm ngày</button></div>
      {error && <p role="alert" className="field-error">{error}</p>}
      {data.availableDates.length === 0 && <div className="empty-dates"><CalendarDays size={29}/><p>Một ngày đẹp đang chờ chúng mình.</p><small>Thêm ngày rảnh, rồi chọn giờ phù hợp với em.</small></div>}
      {data.availableDates.map((day, i) => <div className="date-card" key={day.date}><div className="date-card-title"><strong><CalendarDays size={17}/>{formatDate(day.date)}</strong><button className="icon-button" aria-label={`Xóa ngày ${day.date}`} onClick={() => update({ availableDates: data.availableDates.filter((_, j) => i !== j) })}><Trash2 size={17}/></button></div>
        {day.timeSlots.map((slot, j) => <div className="time-slot" key={j}><label>Từ<input aria-label={`Ngày ${day.date}, giờ bắt đầu khung ${j + 1}`} type="time" value={slot.start} onChange={e => update({ availableDates: data.availableDates.map((d, di) => di !== i ? d : { ...d, timeSlots: d.timeSlots.map((s, si) => si !== j ? s : { ...s, start: e.target.value }) }) })}/></label><span>—</span><label>Đến<input aria-label={`Ngày ${day.date}, giờ kết thúc khung ${j + 1}`} type="time" value={slot.end} onChange={e => update({ availableDates: data.availableDates.map((d, di) => di !== i ? d : { ...d, timeSlots: d.timeSlots.map((s, si) => si !== j ? s : { ...s, end: e.target.value }) }) })}/></label><button className="icon-button" aria-label={`Xóa khung giờ ${j + 1} ngày ${day.date}`} onClick={() => update({ availableDates: data.availableDates.map((d, di) => di !== i ? d : { ...d, timeSlots: d.timeSlots.filter((_, si) => si !== j) }) })}><X size={17}/></button></div>)}
        <button className="text-button add-slot" disabled={day.timeSlots.length >= 8} onClick={() => update({ availableDates: data.availableDates.map((d, di) => di !== i ? d : { ...d, timeSlots: [...d.timeSlots, { start: '14:00', end: '17:00' }] }) })}><Plus size={15}/> Thêm khung giờ</button>
      </div>)}<p className="input-hint">Có thể thêm tối đa 20 ngày và 8 khung giờ mỗi ngày. Khung giờ trong cùng ngày.</p></>}
  </div>;
}
