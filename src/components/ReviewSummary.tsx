import { Pencil } from 'lucide-react';
import type { ResponseData } from '../../shared/schema';
import { summary } from '../utils/summary';
export function ReviewSummary({ data, onEdit }: { data: ResponseData; onEdit?: (step: number) => void }) {
  return <div className="review-list">{summary(data).map(group => <section className="review-group" key={group.step}><div><h3>{group.title}</h3><p>{group.value || 'Chưa chọn'}</p></div>{onEdit && <button className="text-button edit" onClick={() => onEdit(group.step)} aria-label={`Sửa ${group.title}`}><Pencil size={14}/> Sửa</button>}</section>)}</div>;
}
