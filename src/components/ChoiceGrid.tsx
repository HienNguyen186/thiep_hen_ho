import { Check } from 'lucide-react';
import { useState } from 'react';
import type { Option } from '../../shared/options';
function Thumbnail({ option }: { option: Option }) {
  const [failed, setFailed] = useState(false);
  return <span className="thumbnail">{option.photo && !failed ? <img src={option.photo} alt="" loading="lazy" width="120" height="120" onError={() => setFailed(true)}/> : <span aria-hidden="true">{option.emoji}</span>}</span>;
}
export function ChoiceGrid({ options, selected, onChange, circular = false }: { options: Option[]; selected: string[]; onChange: (ids: string[]) => void; circular?: boolean }) {
  function toggle(id: string) {
    const exclusive = ['no-preference', 'none'];
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else if (exclusive.includes(id)) onChange([id]);
    else onChange([...selected.filter(s => !exclusive.includes(s)), id]);
  }
  return <div className={circular ? 'choice-grid circular-grid' : 'choice-grid'}>{options.map(option => <button type="button" className={`choice ${circular ? 'circular-choice' : ''} ${selected.includes(option.id) ? 'selected' : ''}`} key={option.id} onClick={() => toggle(option.id)} aria-pressed={selected.includes(option.id)}>
    {circular ? <Thumbnail option={option}/> : <span className="choice-emoji" aria-hidden="true">{option.emoji}</span>}
    <span className="choice-text"><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span><span className="choice-check" aria-hidden="true">{selected.includes(option.id) && <Check size={13}/>}</span>
  </button>)}</div>;
}
