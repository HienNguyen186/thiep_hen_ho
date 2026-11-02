import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Heart, LoaderCircle, RotateCcw } from 'lucide-react';
import { responseSchema, type ResponseData } from '../../shared/schema';
import { Brand, Footer } from '../components/Brand';
import { InvitationCover } from '../components/InvitationCover';
import { QuestionSteps, steps } from '../components/QuestionSteps';
import { readDraft, saveDraft, clearDraft } from '../utils/storage';
import { api } from '../services/api';
import { invitation } from '../config/invitation';

export default function InvitationPage() {
  const [initial] = useState(readDraft);
  const [data, setData] = useState(initial.data);
  const [step, setStep] = useState(0);
  const [lastStep, setLastStep] = useState(initial.step);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(true);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (step < 9) setSaved(saveDraft(data, step || lastStep)); }, [data, step, lastStep]);
  useEffect(() => { if (step > 0) { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); } }, [step]);
  function go(next: number) { setError(''); setStep(next); if (next > 0 && next < 9) setLastStep(next); }
  function update(patch: Partial<ResponseData>) { setData(d => ({ ...d, ...patch })); setError(''); }
  function validateStep() {
    const fields: Record<number, string[]> = { 1: ['availableDates', 'flexibleDate'], 2: ['dresscodes', 'dresscodeNote'], 3: ['foods'], 4: ['desserts', 'drinks'], 5: ['activities'], 6: ['returnTime', 'specificReturnTime', 'returnNote'], 7: ['notes'] };
    const result = responseSchema.safeParse(data);
    if (!result.success) { const issue = result.error.issues.find(i => fields[step]?.includes(String(i.path[0]))); if (issue) { setError(issue.message); return false; } }
    return true;
  }
  function next() { if (validateStep()) { if (editing) { setEditing(false); go(8); } else go(step + 1); } }
  async function submit() {
    if (lock.current) return;
    const parsed = responseSchema.safeParse(data);
    if (!parsed.success) { setError(parsed.error.issues[0].message + ' Em có thể bấm Sửa ở phần tương ứng.'); return; }
    lock.current = true; setSending(true); setError('');
    try { await api('/responses', { method: 'POST', body: JSON.stringify(parsed.data) }); clearDraft(); go(9); }
    catch (err) { setError(err instanceof Error ? err.message : 'Chưa gửi được. Em thử lại nhé.'); }
    finally { lock.current = false; setSending(false); }
  }
  return <div className="site-shell"><header className="site-header"><Brand/><span className="header-note">a little date, a lovely memory <span>♡</span></span></header>
    <main>
      {step === 0 && <>{lastStep > 0 && <div className="resume-banner"><span>Thiệp vẫn đang chờ em, mình đã lưu câu trả lời trước đó.</span><button className="text-button" onClick={() => go(lastStep)}>Viết tiếp <ArrowRight size={15}/></button></div>}<InvitationCover paused={paused} onLater={() => setPaused(true)} onAccept={() => go(lastStep || 1)}/></>}
      {step > 0 && step < 9 && <div className="wizard-layout"><nav className="progress" aria-label="Tiến trình trả lời"><div className="progress-caption"><span>OUR LITTLE DATE PLAN</span><span>{String(step).padStart(2, '0')} / 08</span></div><div className="progress-bars">{steps.map((s, i) => <span className={i < step ? 'done' : ''} key={s.short}/>)}</div><div className="progress-labels"><span>{steps[step - 1].short}</span><span>Mỗi lựa chọn là một chút về em ♡</span></div></nav>
        <section className="question-card enter" key={step}><div className="step-heading"><span className="step-icon" aria-hidden="true">{steps[step - 1].icon}</span><span className="eyebrow">CHƯƠNG {String(step).padStart(2, '0')} · {steps[step - 1].short.toUpperCase()}</span><h1 ref={heading} tabIndex={-1}>{steps[step - 1].title}</h1><p>{steps[step - 1].description}</p></div>
          <QuestionSteps step={step} data={data} update={update} onEdit={target => { setEditing(true); go(target); }}/>
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="question-navigation"><button className="text-button" disabled={sending} onClick={() => { setEditing(false); go(step - 1); }}><ArrowLeft size={17}/> Quay lại</button><button className="button primary" disabled={sending} onClick={step === 8 ? submit : next}>{sending ? <><LoaderCircle size={17} className="spin"/> Đang gửi…</> : step === 8 ? <>Hoàn tất câu trả lời <Heart size={17}/></> : editing ? <>Lưu & xem lại <Check size={17}/></> : <>Tiếp theo <ArrowRight size={17}/></>}</button></div>
        </section><p className="autosave"><Check size={13}/>{saved ? 'Câu trả lời được lưu nháp trên thiết bị này.' : 'Trình duyệt không cho lưu nháp. Hãy giữ trang mở đến khi gửi xong.'}</p></div>}
      {step === 9 && <section className="thank-you enter"><div className="celebration" aria-hidden="true">{['♡', '✧', '♡', '✿', '♡', '✧'].map((s, i) => <span key={i}>{s}</span>)}<div className="thank-heart"><Heart size={49} strokeWidth={1}/></div></div><span className="eyebrow">IT’S A DATE!</span><h1 ref={heading} tabIndex={-1}>Thank you,<br/><em>my love!</em></h1><p>Cảm ơn em đã dành thời gian trả lời. Anh sẽ chuẩn bị<br className="desktop-break"/> một buổi hẹn thật đáng nhớ cho chúng mình.</p><div className="closing-note">{invitation.closing}<span>— {invitation.inviter}, {invitation.signature.toLowerCase()}</span></div><span className="sent-badge"><Check size={15}/> Câu trả lời đã được gửi đến anh</span><button className="text-button" onClick={() => { setData({ ...data, submissionId: crypto.randomUUID() }); setLastStep(0); go(0); }}><RotateCcw size={14}/> Mở lại tấm thiệp</button></section>}
    </main><Footer/>
  </div>;
}
