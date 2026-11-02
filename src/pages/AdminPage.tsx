import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Download, Heart, LoaderCircle, LockKeyhole, LogOut, RefreshCw } from 'lucide-react';
import type { SavedResponse } from '../../shared/schema';
import { api, ApiError } from '../services/api';
import { Brand, Footer } from '../components/Brand';
import { ReviewSummary } from '../components/ReviewSummary';
import { summary } from '../utils/summary';
import { copyText } from '../utils/clipboard';
const sentAt = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value));
export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [selected, setSelected] = useState<SavedResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  async function load() { try { const rows = await api<SavedResponse[]>('/admin/responses'); setResponses(rows); setLoggedIn(true); } catch (err) { if (err instanceof ApiError && err.status === 401) { setLoggedIn(false); setSelected(null); } else setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function login(e: FormEvent) { e.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); setPassword(''); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Không thể đăng nhập.'); } finally { setBusy(false); } }
  async function open(id: string) { setBusy(true); setError(''); setCopied(false); try { const row = await api<SavedResponse>(`/admin/responses/${id}`); setSelected(row); setResponses(rows => rows.map(r => r.id === row.id ? row : r)); } catch (err) { handleError(err); } finally { setBusy(false); } }
  function handleError(err: unknown) { if (err instanceof ApiError && err.status === 401) { setLoggedIn(false); setSelected(null); } setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.'); }
  async function logout() { setBusy(true); try { await api('/admin/logout', { method: 'POST' }); setLoggedIn(false); setSelected(null); setResponses([]); } catch (err) { handleError(err); } finally { setBusy(false); } }
  async function copy() { if (!selected) return; try { await copyText(`DATE WITH YOU\nGửi lúc: ${sentAt(selected.createdAt)}\n\n${summary(selected.data).map(g => `${g.title}\n${g.value}`).join('\n\n')}`); setCopied(true); } catch { setError('Trình duyệt chưa cho phép sao chép. Em có thể chọn và sao chép nội dung trực tiếp.'); } }
  return <div className="site-shell"><header className="site-header"><Brand/><a className="text-button" href="/"><ArrowLeft size={15}/> Về tấm thiệp</a></header><main className="admin-main">
    {loading ? <div className="loading-panel" role="status"><LoaderCircle className="spin"/> Đang mở những lời nhắn…</div> : !loggedIn ? <form className="login-card question-card enter" onSubmit={login}><span className="login-icon"><LockKeyhole size={26}/></span><span className="eyebrow">A LITTLE SPACE FOR THE PLANNER</span><h1>Góc của người mời.</h1><p>Những lời nhắn nhỏ, cho một buổi hẹn thật xinh.</p><label>Mật khẩu quản trị<input type="password" autoComplete="current-password" value={password} required maxLength={256} onChange={e => setPassword(e.target.value)}/></label>{error && <div role="alert" className="error-message">{error}</div>}<button className="button primary" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <>Mở lời nhắn <ArrowRight size={17}/></>}</button></form> : <div className="admin-content enter"><div className="admin-heading"><div><span className="eyebrow">THE LITTLE DETAILS THAT MATTER</span><h1>Những lời nhắn <em>từ em.</em></h1><p>{responses.length} câu trả lời · {responses.filter(r => !r.viewed).length} lời nhắn chưa xem</p></div><div className="admin-actions"><button className="icon-button" onClick={() => { setError(''); void load(); }} aria-label="Làm mới"><RefreshCw size={18}/></button><a className="button secondary" href="/api/admin/responses/export" download="date-with-you.csv"><Download size={16}/> Xuất CSV</a><button className="icon-button" disabled={busy} onClick={logout} aria-label="Đăng xuất"><LogOut size={18}/></button></div></div>
      {error && <div role="alert" className="error-message">{error}</div>}
      <div className="admin-grid"><section className="response-list" aria-label="Danh sách câu trả lời">{responses.length === 0 && <div className="admin-empty"><Heart size={34} strokeWidth={1}/><h2>Chờ một lời nhắn thương.</h2><p>Khi người nhận gửi câu trả lời, mọi lựa chọn sẽ xuất hiện ở đây.</p></div>}{responses.map(r => <button key={r.id} disabled={busy} className={`response-item ${selected?.id === r.id ? 'active' : ''}`} onClick={() => open(r.id)}><span className="response-icon">💌</span><span><strong>Một buổi hẹn của chúng mình</strong><small>{sentAt(r.createdAt)}</small><span className={`viewed-badge ${r.viewed ? '' : 'unread'}`}>{r.viewed ? 'Đã xem' : 'Chưa xem'}</span></span><ArrowRight size={16}/></button>)}</section>
        <section className="response-detail">{selected ? <><div className="detail-heading"><div><span className="eyebrow">CÂU TRẢ LỜI CỦA EM</span><p>Gửi lúc {sentAt(selected.createdAt)} (GMT+7)</p></div><button className="text-button" onClick={copy}>{copied ? <Check size={15}/> : <Copy size={15}/>}{copied ? 'Đã chép' : 'Sao chép'}</button></div><ReviewSummary data={selected.data}/></> : <div className="detail-placeholder"><Heart size={36} strokeWidth={1}/><p>Chọn một lời nhắn để bắt đầu<br/>lên kế hoạch cho buổi hẹn.</p></div>}</section></div>
    </div>}
  </main><Footer/></div>;
}
