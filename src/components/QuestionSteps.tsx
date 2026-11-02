import { Clock3 } from 'lucide-react';
import type { ResponseData } from '../../shared/schema';
import { dresscodes, foods, desserts, drinks, activities, returnTimes } from '../../shared/options';
import { ChoiceGrid } from './ChoiceGrid';
import { DateAvailabilityPicker } from './DateAvailabilityPicker';
import { ReviewSummary } from './ReviewSummary';
export const steps = [
  { short: 'Ngày hẹn', title: 'Em rảnh vào ngày nào nhỉ?', description: 'Cho anh một vài ngày và khung giờ, để mình không bỏ lỡ nhau.', icon: '🗓️' },
  { short: 'Trang phục', title: 'Hôm đó mình mặc gì?', description: 'Thoải mái hay điệu đà một chút? Em có thể chọn nhiều phong cách.', icon: '🎀' },
  { short: 'Món ăn', title: 'Em muốn ăn món gì?', description: 'Chiếc bụng nhỏ hôm nay đang nghĩ đến món nào? Cứ chọn những món em thích.', icon: '🍝' },
  { short: 'Ngọt ngào', title: 'Thêm một chút ngọt ngào?', description: 'Một món tráng miệng, một ly nước ngon, và chuyện của hai đứa mình.', icon: '🍰' },
  { short: 'Cùng làm gì', title: 'Em muốn làm gì sau đó?', description: 'Buổi hẹn còn dài. Mình cùng viết tiếp những khoảnh khắc dễ thương.', icon: '📸' },
  { short: 'Giờ về', title: 'Em muốn về lúc mấy giờ?', description: 'Vui đến đâu cũng nhớ lịch riêng của em. Anh sẽ lên kế hoạch vừa vặn.', icon: '🌙' },
  { short: 'Lời nhắn', title: 'Em có điều gì muốn nhắn anh?', description: 'Một mong muốn nho nhỏ, hay điều gì anh cần nhớ cho buổi hẹn này.', icon: '💌' },
  { short: 'Xem lại', title: 'Để em xem lại một chút nhé!', description: 'Mọi điều em chọn đều ở đây. Mình sửa lại bất cứ phần nào nếu muốn.', icon: '🤍' },
];
export function Note({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="note-label">{label}<textarea value={value} onChange={e => onChange(e.target.value)} maxLength={2000} rows={3} placeholder={placeholder}/><span className="char-count">{value.length}/2000</span></label>; }
export function QuestionSteps({ step, data, update, onEdit }: { step: number; data: ResponseData; update: (patch: Partial<ResponseData>) => void; onEdit: (step: number) => void }) {
  switch (step) {
    case 1: return <DateAvailabilityPicker data={data} update={update}/>;
    case 2: return <><ChoiceGrid options={dresscodes} selected={data.dresscodes} onChange={dresscodes => update({ dresscodes })}/><Note label="Một chút về trang phục (không bắt buộc)" value={data.dresscodeNote} onChange={dresscodeNote => update({ dresscodeNote })} placeholder="Ví dụ: Em muốn mình cùng mặc màu kem…"/></>;
    case 3: return <ChoiceGrid options={foods} selected={data.foods} onChange={foods => update({ foods })} circular/>;
    case 4: return <><h3 className="group-heading">Tráng miệng <span>CHỌN NHIỀU HOẶC BỎ QUA</span></h3><ChoiceGrid options={desserts} selected={data.desserts} onChange={desserts => update({ desserts })} circular/><h3 className="group-heading">Đồ uống <span>THÊM MỘT LY EM THÍCH</span></h3><ChoiceGrid options={drinks} selected={data.drinks} onChange={drinks => update({ drinks })} circular/></>;
    case 5: return <ChoiceGrid options={activities} selected={data.activities} onChange={activities => update({ activities })}/>;
    case 6: return <><div className="return-grid">{returnTimes.map(o => <label className={`return-choice ${data.returnTime === o.id ? 'selected' : ''}`} key={o.id}><input type="radio" name="returnTime" value={o.id} checked={data.returnTime === o.id} onChange={() => update({ returnTime: o.id })}/><span>{o.label}</span></label>)}</div>{data.returnTime === 'specific' && <label className="specific-time"><Clock3 size={18}/> Giờ về em muốn<input aria-label="Giờ về cụ thể" type="time" value={data.specificReturnTime} onChange={e => update({ specificReturnTime: e.target.value })}/></label>}<Note label="Lịch riêng của em (không bắt buộc)" value={data.returnNote} onChange={returnNote => update({ returnNote })} placeholder="Ví dụ: Em cần về sớm để chuẩn bị cho ngày mai…"/></>;
    case 7: return <><Note label="Lời nhắn của em (không bắt buộc)" value={data.notes} onChange={notes => update({ notes })} placeholder="Em muốn đến đâu? Có món nào em không ăn được, dị ứng cần lưu ý, hay một điều anh nên biết?"/><div className="private-note">♡ Anh sẽ ghi nhớ những điều em chia sẻ.<br/>Em cũng có thể để trống và tiếp tục nhé.</div></>;
    case 8: return <ReviewSummary data={data} onEdit={onEdit}/>;
    default: return null;
  }
}
