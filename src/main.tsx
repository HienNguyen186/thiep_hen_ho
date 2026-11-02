import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import InvitationPage from './pages/InvitationPage';
import './styles.css';
const AdminPage = lazy(() => import('./pages/AdminPage'));
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p className="loading-panel">Đang mở thiệp…</p>}>{location.pathname.replace(/\/$/, '') === '/admin' ? <AdminPage/> : <InvitationPage/>}</Suspense></StrictMode>);
