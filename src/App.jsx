import { useEffect } from 'react';
import { StoreProvider, useStore, useHash } from './store.jsx';
import { Landing, Login } from './pages/public.jsx';
import { Dashboard, Classes, ClassDetail, Enrollments, Payments, Requests, Attendance, Timetable, Leads, Reports } from './pages/pages.jsx';
import { Students, Master, Staff } from './pages/master.jsx';
import { ROLE } from './lib/util.js';
import { useAsk } from './ui.jsx';

const MENU = { dashboard: ['📊', 'Tổng quan'], classes: ['🏫', 'Lớp học'], timetable: ['🗓️', 'Thời khóa biểu'], students: ['🎓', 'Học viên'], enrollments: ['📝', 'Đăng ký học'], payments: ['💳', 'Học phí'], requests: ['📨', 'Bảo lưu · Chuyển lớp · Học bù'], attendance: ['✅', 'Điểm danh'], staff: ['👥', 'Nhân viên'], master: ['⚙️', 'Danh mục'], leads: ['📞', 'Tư vấn'], reports: ['📈', 'Báo cáo'] };
const ROLE_MENU = { manager: Object.keys(MENU), enroll: ['dashboard', 'students', 'classes', 'enrollments', 'requests', 'timetable', 'leads'], accountant: ['dashboard', 'payments', 'enrollments', 'reports'], teacher: ['dashboard', 'timetable', 'attendance'] };
const PAGES = { dashboard: Dashboard, classes: Classes, timetable: Timetable, students: Students, enrollments: Enrollments, payments: Payments, requests: Requests, attendance: Attendance, staff: Staff, master: Master, leads: Leads, reports: Reports };

function Shell({ page = 'dashboard', arg }) {
  const { user, setUser, reset } = useStore(), ask = useAsk();
  const key = page === 'class' ? 'classes' : page, menu = ROLE_MENU[user.role];
  useEffect(() => { if (!menu.includes(key)) location.hash = '#/app/dashboard'; }, [key, menu]);
  if (!menu.includes(key)) return null;
  const Page = page === 'class' ? ClassDetail : PAGES[page] || Dashboard;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="no-print flex flex-wrap gap-1 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-3 text-slate-300 md:sticky md:top-0 md:block md:h-screen md:overflow-auto md:px-3 md:py-4">
        <a href="#/" className="group flex w-full items-center gap-2.5 px-2 pb-4 text-lg font-extrabold text-white"><i className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 not-italic shadow-lg shadow-indigo-500/30 transition group-hover:rotate-6">A</i> ABC English</a>
        {menu.map((k) => (
          <a key={k} href={`#/app/${k}`} className={`group relative mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition duration-200 ${k === key ? 'bg-white/10 text-white' : 'hover:translate-x-1 hover:bg-white/5 hover:text-white'}`}>
            <span className={`absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-400 transition-all duration-300 ${k === key ? 'opacity-100' : 'h-0 opacity-0'}`} />
            <span className="transition group-hover:scale-125">{MENU[k][0]}</span>{MENU[k][1]}
          </a>
        ))}
        <div className="mt-4 w-full border-t border-white/10 px-2 pt-3.5 text-[13px]">
          <div className="flex items-center gap-2.5"><i className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-pink-500 font-bold text-white not-italic">{user.name.split(' ').slice(-1)[0][0]}</i><div><b className="block text-white">{user.name}</b>{ROLE[user.role]}</div></div>
          <a href="#/" className="mt-2 block py-1.5 hover:text-white">Trang giới thiệu</a>
          <a href="#/" onClick={() => setUser(null)} className="block hover:text-white">Đăng xuất</a>
          {user.role === 'manager' && <a href="#/app/dashboard" onClick={() => ask({ title: 'Khôi phục dữ liệu demo?', message: 'Toàn bộ thay đổi bạn đã thực hiện sẽ bị xóa và dữ liệu demo ban đầu được nạp lại.', ok: 'Khôi phục', danger: true, onConfirm: reset })} className="block py-1.5 text-xs opacity-70 hover:opacity-100">↺ Khôi phục dữ liệu demo</a>}
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8 md:pb-16"><div key={`${page}/${arg}`} className="animate-fade-up"><Page id={arg} /></div></main>
    </div>
  );
}

function Router() {
  const { user } = useStore();
  const [a, b, c] = useHash();
  useEffect(() => { if (a === 'app' && !user) location.hash = '#/login'; }, [a, user]);
  if (a === 'login') return <Login />;
  if (a === 'app') return user ? <Shell page={b || undefined} arg={c} /> : null;
  return <Landing />;
}

export default function App() { return <StoreProvider><Router /></StoreProvider>; }
