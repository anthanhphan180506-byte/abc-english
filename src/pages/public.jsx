import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Btn, LinkBtn, Card, Table, Fld, In, Sel } from '../ui.jsx';
import { Reveal, CountUp, useScrolled, Typewriter, Tilt, ScrollProgress, confetti } from '../fx.jsx';
import { HeroArt, Wave, TESTIMONIALS } from '../art.jsx';
import { R, U, CFG } from '../lib/rules.js';
import { by, vnd, dmy, ROLE } from '../lib/util.js';

const Logo = ({ dark }) => (
  <a href="#/" className={`group flex items-center gap-2.5 text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-800'}`}>
    <i className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-base text-white not-italic shadow-lg shadow-indigo-500/30 transition group-hover:rotate-6 group-hover:scale-110">A</i> Trung tâm tiếng Anh ABC
  </a>
);

/* Hai đốm sáng trôi nổi làm nền */
const Blobs = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-24 -left-24 size-96 animate-float rounded-full bg-cyan-400/30 blur-3xl" />
    <div className="absolute -right-20 bottom-0 size-[28rem] animate-float-slow rounded-full bg-fuchsia-500/30 blur-3xl" />
    <div className="absolute top-1/3 left-1/2 size-64 animate-float rounded-full bg-amber-300/20 blur-3xl" />
  </div>
);

function LeadForm() {
  const { db, commit, toast } = useStore();
  const submit = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    db.leads.push({ id: U.id('ld'), name: fd.get('name').trim(), phone: fd.get('phone').trim(), course: fd.get('course'), note: fd.get('note').trim(), status: 'Mới', createdAt: U.today() });
    if (commit('Gửi yêu cầu tư vấn')) { e.target.reset(); toast('Đã gửi! ABC sẽ liên hệ với bạn trong ngày.', 'ok'); confetti(); }
  };
  return (
    <Card className="p-6 shadow-xl shadow-indigo-900/10"><form onSubmit={submit}>
      <Fld label="Họ và tên"><In required name="name" /></Fld>
      <Fld label="Số điện thoại"><In required name="phone" type="tel" pattern="0[0-9]{9,10}" title="Số điện thoại 10–11 chữ số, bắt đầu bằng 0" /></Fld>
      <Fld label="Khóa quan tâm"><Sel name="course" options={db.courses.map((c) => [c.name, c.name])} /></Fld>
      <Fld label="Ghi chú"><In name="note" /></Fld>
      <Btn type="submit" className="shine w-full">Gửi yêu cầu tư vấn</Btn>
    </form></Card>
  );
}

const Sec = ({ id, alt, title, sub, children }) => (
  <section id={id} className={`scroll-mt-16 py-20 ${alt ? 'bg-white/70' : ''}`}>
    <div className="mx-auto max-w-6xl px-5">
      <Reveal className="mb-11 text-center"><h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>{sub && <p className="mt-2.5 text-slate-500">{sub}</p>}<div className="mx-auto mt-4 h-1 w-14 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" /></Reveal>
      {children}
    </div>
  </section>
);

export function Landing() {
  const { db, user } = useStore();
  const scrolled = useScrolled(12);
  const open = db.classes.filter((c) => c.status === 'Mở đăng ký');
  const jump = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const ICON = { KID: '🧸', A1: '🌱', A2: '🌿', B1: '🌳', B2: '🚀', IELTS: '🎯' };
  return (
    <>
      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl transition-all duration-300 ${scrolled ? 'border-slate-200 bg-white/90 shadow-md shadow-slate-900/5' : 'border-transparent bg-white/60'}`}>
        <div className={`mx-auto flex max-w-6xl items-center gap-6 px-5 transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
          <Logo />
          <nav className="ml-auto hidden gap-6 font-medium md:flex">{[['khoa-hoc', 'Khóa học'], ['lop-mo', 'Lớp đang mở'], ['chi-nhanh', 'Chi nhánh'], ['tu-van', 'Tư vấn']].map(([id, l]) => <a key={id} href={`#${id}`} onClick={jump(id)} className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-blue-600 after:transition-all hover:text-blue-700 hover:after:w-full">{l}</a>)}</nav>
          <LinkBtn sm className="ml-auto md:ml-0" href={user ? '#/app' : '#/login'}>{user ? 'Vào hệ thống' : 'Đăng nhập nhân viên'}</LinkBtn>
        </div>
      </header>

      <ScrollProgress />
      <section className="relative -mt-16 animate-gradient overflow-hidden bg-[linear-gradient(120deg,#0f172a,#1d4ed8,#6d28d9,#0f172a)] bg-[length:300%_300%] pt-32 pb-28 text-white">
        <Blobs />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 md:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="mb-5 inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-sm backdrop-blur"><i className="size-2 animate-pulse rounded-full bg-emerald-400" /> Đang nhận đăng ký đợt mới</span>
            <h1 className="mb-5 animate-fade-up text-4xl leading-[1.12] font-extrabold tracking-tight [animation-delay:.1s] md:text-5xl">Học tiếng Anh để<br /><span className="inline-block min-h-[1.2em] bg-gradient-to-r from-amber-300 to-pink-300 bg-clip-text text-transparent"><Typewriter words={['tự tin giao tiếp', 'chinh phục IELTS', 'thăng tiến công việc', 'khám phá thế giới']} /></span></h1>
            <p className="max-w-xl animate-fade-up text-lg opacity-90 [animation-delay:.2s]">ABC có 4 chi nhánh tại Hà Nội, mở lớp theo chu kỳ 3 tháng, sĩ số nhỏ, giáo viên theo sát từng học viên. Bảo lưu, chuyển lớp, học bù linh hoạt khi bạn bận.</p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:.3s]"><LinkBtn v="warn" className="shine px-6 py-3" href="#tu-van" onClick={jump('tu-van')}>Nhận tư vấn miễn phí →</LinkBtn><LinkBtn v="ghost" className="border-white/40 bg-white/10 px-6 py-3 text-white backdrop-blur hover:bg-white/20" href="#khoa-hoc" onClick={jump('khoa-hoc')}>Xem khóa học</LinkBtn></div>
            <div className="mt-9 grid animate-fade-up grid-cols-2 gap-3 [animation-delay:.4s] sm:grid-cols-4">{[[4, 'chi nhánh'], [CFG.maxStudents, 'HV tối đa / lớp'], [db.courses.length, 'chương trình'], [3, 'tháng / chu kỳ']].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-white/20 bg-white/10 px-3.5 py-3 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/20"><b className="block text-2xl font-extrabold"><CountUp to={n} /></b><span className="text-xs opacity-85">{l}</span></div>
            ))}</div>
          </div>
          <div className="animate-fade-up [animation-delay:.25s]"><HeroArt /></div>
        </div>
        <Wave />
      </section>

      <Sec id="khoa-hoc" title="Chương trình đào tạo" sub={db.courses.length ? 'Số buổi và học phí từng khóa xem ở thẻ bên dưới.' : undefined}>
        {!db.courses.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Chương trình học đang được cập nhật. Vui lòng liên hệ trung tâm để được tư vấn.</p>}
        <div className="grid gap-5 md:grid-cols-3">{db.courses.map((c, i) => (
          <Reveal key={c.id} delay={(i % 3) * 110}>
            <Tilt className="h-full rounded-2xl"><Card className="group relative h-full overflow-hidden p-6">
              <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-blue-600 to-violet-600 transition duration-500 group-hover:scale-x-100" />
              <div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{c.code}</span><span className="text-3xl transition duration-300 group-hover:scale-125 group-hover:-rotate-12">{ICON[c.code]}</span></div>
              <h3 className="text-lg font-bold">{c.name}</h3><p className="mt-2 text-slate-500">{c.desc}</p>
              <div className="mt-4 flex items-end justify-between"><div><div className="text-xl font-extrabold text-blue-700">{vnd(c.fee)}</div><small className="text-slate-500">{c.sessions} buổi / khóa</small></div><a href="#tu-van" onClick={jump('tu-van')} className="text-sm font-semibold text-indigo-600 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">Tư vấn →</a></div>
            </Card></Tilt>
          </Reveal>
        ))}</div>
      </Sec>

      <Sec alt title="Vì sao chọn ABC">
        <div className="grid gap-5 md:grid-cols-4">{[['👩‍🏫', 'Giáo viên theo sát', `Lớp tối đa ${CFG.maxStudents} học viên, điểm danh và phản hồi mỗi buổi.`, 'from-blue-500 to-cyan-400'], ['🔁', 'Linh hoạt', `Bảo lưu tối đa ${CFG.reserveMonths} tháng, chuyển lớp, học bù buổi vắng.`, 'from-violet-500 to-fuchsia-400'], ['💳', 'Học phí rõ ràng', `Đóng từ ${CFG.minPaidPct * 100}% để giữ chỗ, phần còn lại đóng sau.`, 'from-emerald-500 to-lime-400'], ['📍', '4 chi nhánh', 'Chọn cơ sở và khung giờ thuận tiện nhất.', 'from-amber-500 to-orange-400']].map(([i, t, d, g], k) => (
          <Reveal key={t} delay={k * 100}><Card className="group h-full text-center"><div className={`mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${g} text-2xl shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110`}>{i}</div><h3 className="font-bold">{t}</h3><p className="mt-1.5 text-slate-500">{d}</p></Card></Reveal>
        ))}</div>
      </Sec>

      <Sec title="Bắt đầu chỉ với 4 bước">
        <div className="relative grid gap-6 md:grid-cols-4">
          <div aria-hidden className="absolute top-7 right-[12%] left-[12%] hidden h-0.5 bg-gradient-to-r from-blue-200 via-violet-300 to-blue-200 md:block" />
          {[['Tư vấn', 'Để lại thông tin, ABC gọi lại trong ngày.'], ['Kiểm tra đầu vào', 'Làm bài test ngắn để xếp đúng trình độ.'], ['Đăng ký & giữ chỗ', `Đóng từ ${CFG.minPaidPct * 100}% học phí để giữ chỗ.`], ['Khai giảng', `Lớp đủ ${CFG.minStudents} học viên là bắt đầu học.`]].map(([t, d], i) => (
            <Reveal key={t} delay={i * 120} className="relative text-center"><div className="relative mx-auto mb-3 grid size-14 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xl font-extrabold text-white shadow-lg shadow-indigo-500/30">{i + 1}</div><h3 className="font-bold">{t}</h3><p className="mt-1 text-slate-500">{d}</p></Reveal>
          ))}
        </div>
      </Sec>

      <section className="overflow-hidden bg-gradient-to-b from-white to-indigo-50/60 py-20">
        <div className="mx-auto max-w-6xl px-5"><Reveal className="mb-10 text-center"><h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Học viên nói gì về ABC</h2><div className="mx-auto mt-4 h-1 w-14 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" /></Reveal></div>
        <div className="[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="marquee-track flex w-max animate-marquee gap-5">
            {[...TESTIMONIALS, ...TESTIMONIALS].map(([n, r, q, e], i) => (
              <div key={i} className="w-80 shrink-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md shadow-indigo-900/5 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-2 text-amber-400">★★★★★</div><p className="text-slate-600">“{q}”</p>
                <div className="mt-4 flex items-center gap-3"><i className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-pink-100 text-xl not-italic">{e}</i><div><b className="block leading-tight">{n}</b><small className="text-slate-500">{r}</small></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Sec id="lop-mo" alt title="Lớp đang mở đăng ký" sub={`Lớp được xác nhận khai giảng khi đủ ${CFG.minStudents} học viên.`}>
        <Reveal><Table head={['Lớp', 'Khóa học', 'Chi nhánh', 'Lịch học', 'Khai giảng', 'Còn chỗ', 'Học phí']} rows={open.map((c) => <tr key={c.id}><td className="font-bold">{c.code}</td><td>{by(db, 'courses', c.courseId).name}</td><td>{by(db, 'branches', c.branchId).name}</td><td>{R.scheduleText(c)}</td><td>{dmy(c.startDate)}</td><td><span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">{CFG.maxStudents - R.live(db, c.id).length} chỗ</span></td><td>{vnd(by(db, 'courses', c.courseId).fee)}</td></tr>)} /></Reveal>
      </Sec>

      <Sec id="chi-nhanh" title="Hệ thống chi nhánh">
        <div className="grid gap-5 md:grid-cols-4">{db.branches.map((b, i) => <Reveal key={b.id} delay={i * 90}><Card className="h-full"><h3 className="font-bold">📍 {b.name}</h3><p className="my-2 text-slate-500">{b.address}</p><b className="text-indigo-700">{b.phone}</b></Card></Reveal>)}</div>
      </Sec>

      <section id="tu-van" className="relative scroll-mt-16 overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-100/60 py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 md:grid-cols-2">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Để lại thông tin, ABC gọi lại <span className="text-indigo-600">trong ngày</span></h2><p className="mt-4 text-slate-600">Nhân viên ghi danh sẽ tư vấn khóa học, lịch học và học phí phù hợp, kèm kiểm tra trình độ đầu vào miễn phí.</p></Reveal>
          <Reveal delay={150}><LeadForm /></Reveal>
        </div>
      </section>
      <footer className="bg-slate-900 py-8 text-center text-sm text-slate-300">© {new Date().getFullYear()} Trung tâm tiếng Anh ABC · Hệ thống quản lý đào tạo DT06 (bản demo)</footer>
    </>
  );
}

export function Login() {
  const { db, setUser } = useStore();
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const u = db.users.find((x) => x.username === fd.get('u').trim() && x.password === fd.get('p'));
    if (!u) return setErr('Sai tên đăng nhập hoặc mật khẩu.');
    setUser(u); location.hash = '#/app/dashboard';
  };
  const fill = (u) => { document.querySelector('[name=u]').value = u; document.querySelector('[name=p]').value = '123456'; setErr(''); };
  return (
    <div className="relative flex min-h-screen animate-gradient flex-wrap items-center justify-center gap-16 overflow-hidden bg-[linear-gradient(120deg,#0f172a,#1d4ed8,#6d28d9,#0f172a)] bg-[length:300%_300%] p-5">
      <Blobs />
      <div className="relative hidden w-full max-w-md text-white lg:block"><HeroArt /><h2 className="mt-6 text-center text-2xl font-extrabold">Chào mừng trở lại 👋</h2><p className="mt-1 text-center opacity-80">Quản lý lớp học, học phí và lịch dạy tại một nơi.</p></div>
      <form onSubmit={submit} className="relative w-full max-w-md animate-pop rounded-3xl border border-white/30 bg-white/95 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-5"><Logo /></div>
        <h2 className="mb-4 text-2xl font-extrabold">Đăng nhập hệ thống</h2>
        <Fld label="Tên đăng nhập"><In required name="u" autoComplete="username" autoFocus /></Fld>
        <Fld label="Mật khẩu"><In required name="p" type="password" autoComplete="current-password" /></Fld>
        {err && <p key={err} className="mb-2.5 animate-pop font-semibold text-red-600">{err}</p>}
        <Btn type="submit" className="shine w-full py-2.5">Đăng nhập</Btn>
        <div className="mt-5 border-t border-dashed border-slate-200 pt-3.5 text-[13px] text-slate-500"><b>Tài khoản demo</b> (mật khẩu 123456) – bấm để điền nhanh:
          {db.users.map((u) => <button type="button" key={u.id} onClick={() => fill(u.username)} className="mt-1.5 block w-full cursor-pointer rounded-lg bg-slate-50 px-2.5 py-1.5 text-left transition hover:translate-x-1 hover:bg-indigo-50"><b>{u.username}</b> · {ROLE[u.role]}{u.role === 'teacher' ? ` – ${u.name}` : ''}</button>)}
        </div>
      </form>
    </div>
  );
}
