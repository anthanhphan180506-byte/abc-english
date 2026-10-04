import { useState } from 'react';
import { CountUp } from '../fx.jsx';
import { useAsk, Btn, LinkBtn, Badge, Card, Note, H3, Bar, Meter, Table, In, Sel, Filter } from '../ui.jsx';
import { useStore } from '../store.jsx';
import { R, U, CFG } from '../lib/rules.js';
import { by, vnd, dmy, TYPE, ROLE, reqDesc, enLabel, canViewClass } from '../lib/util.js';
import { FinishForm, NewClassForm, ClassEditForm, ScheduleForm, EnrollForm, PayForm, ReserveForm, TransferForm, MakeupForm, RejectForm } from '../forms.jsx';

export const Head = ({ title, children }) => <div className="mb-5 flex flex-wrap items-center gap-2.5"><h1 className="bg-gradient-to-r from-slate-900 to-indigo-700 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">{title}</h1><div className="flex-1" />{children}</div>;
const Stu = ({ id }) => { const { db } = useStore(); const s = by(db, 'students', id); return <>{s.name} <small className="text-slate-500">{s.code}</small></>; };
const Muted = ({ children }) => <small className="text-slate-500">{children}</small>;
const statuses = (a) => a.map((s) => [s, s]);

/* ---------------- Tổng quan ---------------- */
export function Dashboard() {
  const { db, user } = useStore();
  const today = U.today(), month = today.slice(0, 7);
  if (user.role === 'teacher') {
    const mine = db.sessions.filter((s) => s.teacherId === user.teacherId && s.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).slice(0, 8);
    return (<><Head title={`Xin chào, ${user.name}`} /><H3>Các buổi dạy sắp tới</H3>
      <Table head={['Ngày', 'Giờ', 'Lớp', 'Phòng', 'Buổi']} rows={mine.map((s) => <tr key={s.id}><td>{dmy(s.date)} {s.date === today && <Badge t="Hôm nay" />}</td><td>{s.start}-{s.end}</td><td>{by(db, 'classes', s.classId).code}</td><td>{by(db, 'rooms', s.roomId).name}</td><td>{s.no}</td></tr>)} /></>);
  }
  const rev = db.payments.filter((p) => p.type === 'Thu' && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0);
  const debt = db.enrollments.filter((e) => R.COLLECTIBLE.includes(e.status)).reduce((s, e) => s + R.due(db, e), 0);
  const stat = [['Lớp đang học', db.classes.filter((c) => c.status === 'Đang học').length, '🏫', 'from-blue-500 to-cyan-400'], ['Lớp mở đăng ký', db.classes.filter((c) => c.status === 'Mở đăng ký').length, '📣', 'from-violet-500 to-fuchsia-400'], ['Học viên đang học', db.enrollments.filter((e) => e.status === 'Đã xác nhận').length, '🎓', 'from-emerald-500 to-lime-400'], ['Thu trong tháng', rev, '💰', 'from-amber-500 to-orange-400'], ['Học phí còn phải thu', debt, '🧾', 'from-rose-500 to-pink-400'], ['Yêu cầu chờ duyệt', db.requests.filter((r) => r.status === 'Chờ duyệt').length, '📨', 'from-indigo-500 to-blue-400']];
  const risk = db.classes.filter((c) => c.status === 'Mở đăng ký'), ts = db.sessions.filter((s) => s.date === today).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <>
      <div className="relative mb-6 animate-fade-up overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#1e3a8a,#4f46e5,#9333ea,#1e3a8a)] bg-[length:300%_300%] p-6 text-white shadow-xl shadow-indigo-900/20 md:p-8 animate-gradient">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-10 size-56 animate-float rounded-full bg-pink-400/30 blur-3xl" /><div className="absolute -bottom-20 left-1/3 size-56 animate-float-slow rounded-full bg-cyan-300/25 blur-3xl" />
          {[['8%', '20%', 0], ['70%', '18%', 0.9], ['88%', '62%', 1.7], ['42%', '70%', 0.4]].map(([l, t, d], i) => <i key={i} className="absolute animate-twinkle text-lg text-yellow-200 not-italic" style={{ left: l, top: t, animationDelay: `${d}s` }}>✦</i>)}
        </div>
        <div className="relative flex flex-wrap items-center gap-4">
          <div><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Xin chào, {user.name} <span className="inline-block origin-[70%_70%] animate-wave">👋</span></h1>
            <p className="mt-1.5 opacity-90">{ROLE[user.role]} · hôm nay {dmy(today)} · {db.sessions.filter((s) => s.date === today).length} buổi học đang diễn ra</p></div>
          <div className="ml-auto flex gap-2"><LinkBtn v="ghost" className="border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25" href="#/app/classes">🏫 Lớp học</LinkBtn><LinkBtn v="warn" className="shine" href="#/app/requests">📨 Yêu cầu</LinkBtn></div>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">{stat.map(([l, v, ico, g], i) => (
        <Card key={l} style={{ animationDelay: `${i * 70}ms` }} className="animate-fade-up">
          <div className={`mb-3 grid size-10 place-items-center rounded-xl bg-gradient-to-br ${g} text-lg shadow-md`}>{ico}</div>
          <span className="text-[13px] text-slate-500">{l}</span><b className="block text-2xl"><CountUp to={v} format={typeof v === 'number' && /thu/i.test(l) ? vnd : undefined} /></b>
        </Card>))}</div>
      <H3>Lớp đang mở đăng ký – theo dõi sĩ số tối thiểu</H3>
      <Table head={['Lớp', 'Chi nhánh', 'Khai giảng', 'Đã xác nhận', 'Trạng thái']} rows={risk.map((c) => { const n = R.confirmed(db, c.id).length; return (
        <tr key={c.id}><td>{canViewClass(user) ? <a className="font-bold text-blue-700" href={`#/app/class/${c.id}`}>{c.code}</a> : <b>{c.code}</b>}</td><td>{by(db, 'branches', c.branchId).name}</td><td>{dmy(c.startDate)}</td><td><div className="w-40">{n}/{CFG.minStudents}<Meter v={n} min={CFG.minStudents} /></div></td><td>{n >= CFG.minStudents ? <Badge t="Đủ điều kiện mở" /> : <Badge t={`Thiếu ${CFG.minStudents - n}`} c="amber" />}</td></tr>); })} />
      <H3>Buổi học hôm nay ({dmy(today)})</H3>
      <Table head={['Giờ', 'Lớp', 'Chi nhánh', 'Phòng', 'Giáo viên']} rows={ts.map((s) => <tr key={s.id}><td>{s.start}-{s.end}</td><td>{by(db, 'classes', s.classId).code}</td><td>{by(db, 'branches', by(db, 'classes', s.classId).branchId).name}</td><td>{by(db, 'rooms', s.roomId).name}</td><td>{by(db, 'teachers', s.teacherId).name}</td></tr>)} />
    </>
  );
}

/* ---------------- Lớp học ---------------- */
export function Classes() {
  const { db, user, act, openModal } = useStore(), ask = useAsk();
  const [cb, setCb] = useState(''), [ct, setCt] = useState(''), [cs, setCs] = useState('');
  const list = db.classes.filter((c) => (!cb || c.branchId === cb) && (!ct || c.termId === ct) && (!cs || c.status === cs)).sort((a, b) => a.code.localeCompare(b.code));
  return (
    <>
      <Head title="Lớp học">{R.can(user, 'klass') && <Btn onClick={() => openModal(<NewClassForm />)}>+ Tạo lớp</Btn>}</Head>
      <Note>Luật: lớp chỉ được <b>xác nhận mở</b> khi có ≥ {CFG.minStudents} học viên đã xác nhận (đóng ≥ {CFG.minPaidPct * 100}% học phí); tối đa {CFG.maxStudents}; lịch không được trùng phòng hoặc giáo viên.</Note>
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <Filter value={cb} onChange={(e) => setCb(e.target.value)} ph="Tất cả chi nhánh" options={db.branches.map((b) => [b.id, b.name])} />
        <Filter value={ct} onChange={(e) => setCt(e.target.value)} ph="Tất cả đợt" options={db.terms.map((t) => [t.id, t.name])} />
        <Filter value={cs} onChange={(e) => setCs(e.target.value)} ph="Tất cả trạng thái" options={statuses(['Nháp', 'Mở đăng ký', 'Đang học', 'Kết thúc', 'Đã hủy'])} />
      </div>
      <Table head={['Lớp', 'Khóa học', 'Chi nhánh', 'Đợt', 'Lịch học', 'Sĩ số', 'Trạng thái', '']} rows={list.map((c) => {
        const conf = R.confirmed(db, c.id).length, live = R.live(db, c.id).length;
        return (
          <tr key={c.id}><td className="font-bold">{c.code}</td><td>{by(db, 'courses', c.courseId).name}</td><td>{by(db, 'branches', c.branchId).name}</td><td>{by(db, 'terms', c.termId).name}</td>
            <td>{R.scheduleText(c)}<br /><Muted>{c.roomId ? `${by(db, 'rooms', c.roomId).name} · ${by(db, 'teachers', c.teacherId).name}` : ''}</Muted></td>
            <td className="min-w-40">{live}/{CFG.maxStudents} <Muted>(xác nhận {conf}, tối thiểu {CFG.minStudents})</Muted><Meter v={conf} min={CFG.minStudents} /></td>
            <td><Badge t={c.status} /></td>
            <td><div className="flex gap-1.5"><LinkBtn v="ghost" sm href={`#/app/class/${c.id}`}>Chi tiết</LinkBtn>
              {R.can(user, 'klass') && c.status === 'Nháp' && <Btn v="ghost" sm onClick={() => openModal(<ClassEditForm id={c.id} />)}>Sửa</Btn>}
              {R.can(user, 'klass') && ['Nháp', 'Đã hủy'].includes(c.status) && <Btn v="ghost" sm onClick={() => ask({ title: 'Bạn có chắc chắn muốn xóa lớp?', message: `Lớp ${c.code} sẽ bị xóa vĩnh viễn. Chỉ xóa được lớp chưa có dữ liệu đăng ký.`, ok: 'Xóa lớp', danger: true, onConfirm: () => act(() => R.deleteClass(db, user, c.id)) })}>Xóa</Btn>}
            </div></td></tr>
        );
      })} />
    </>
  );
}

export function ClassDetail({ id }) {
  const { db, user, act, openModal } = useStore(), ask = useAsk();
  const c = by(db, 'classes', id);
  if (!c.id) return <><Head title="Không tìm thấy lớp" /><LinkBtn v="ghost" href="#/app/classes">← Danh sách lớp</LinkBtn></>;
  const co = by(db, 'courses', c.courseId), ss = R.sessions(db, id), ens = db.enrollments.filter((e) => e.classId === id), conf = R.confirmed(db, id).length;
  const k = R.can(user, 'klass'), en = R.can(user, 'enroll'), open = ['Mở đăng ký', 'Đang học'].includes(c.status), pre = ['Nháp', 'Mở đăng ký'].includes(c.status);
  const KV = ({ l, children }) => <><dt className="text-slate-500">{l}</dt><dd className="font-semibold">{children}</dd></>;
  return (
    <>
      <Head title={<>Lớp {c.code} <Badge t={c.status} /></>}>
        <LinkBtn v="ghost" href="#/app/classes">← Danh sách</LinkBtn>
        {en && open && <Btn onClick={() => openModal(<EnrollForm cid={id} />)}>+ Đăng ký học viên</Btn>}
        {k && pre && <Btn v="ghost" onClick={() => openModal(<ScheduleForm id={id} />)}>{ss.length ? 'Sửa lịch' : 'Xếp lịch'}</Btn>}
        {k && c.status === 'Nháp' && <Btn onClick={() => ask({ title: 'Mở đăng ký cho lớp này?', message: 'Sau khi mở, nhân viên ghi danh có thể đăng ký học viên vào lớp.', ok: 'Mở đăng ký', onConfirm: () => act(() => R.openRegistration(db, user, id), 'Lớp đã mở đăng ký') })}>Mở đăng ký</Btn>}
        {k && c.status === 'Mở đăng ký' && <Btn v="ok" onClick={() => ask({ title: 'Xác nhận mở lớp?', message: 'Lớp sẽ chuyển sang “Đang học”. Hệ thống kiểm tra lại sĩ số tối thiểu và lịch học.', ok: 'Xác nhận mở lớp', onConfirm: () => act(() => { R.confirmOpen(db, user, id); }, 'Lớp đã được xác nhận mở – bắt đầu đào tạo', true) })}>Xác nhận mở lớp</Btn>}
        {k && c.status === 'Đang học' && <Btn v="warn" onClick={() => openModal(<FinishForm id={id} />)}>Kết thúc lớp</Btn>}
        {k && c.status === 'Nháp' && <Btn v="ghost" onClick={() => openModal(<ClassEditForm id={id} />)}>✏️ Sửa thông tin</Btn>}
        {k && ['Nháp', 'Đã hủy'].includes(c.status) && <Btn v="bad" onClick={() => ask({ title: 'Bạn có chắc chắn muốn xóa lớp?', message: `Lớp ${c.code} sẽ bị xóa vĩnh viễn cùng lịch học. Chỉ xóa được lớp chưa có dữ liệu đăng ký.`, ok: 'Xóa lớp', danger: true, onConfirm: () => { if (act(() => R.deleteClass(db, user, id))) location.hash = '#/app/classes'; } })}>🗑 Xóa lớp</Btn>}
        {k && pre && <Btn v="bad" onClick={() => ask({ title: 'Bạn có chắc chắn muốn hủy lớp?', message: `Lớp ${c.code} sẽ bị hủy, lịch học bị xóa và học phí đã đóng chuyển vào số dư của từng học viên.`, ok: 'Hủy lớp', danger: true, onConfirm: () => act(() => R.cancelClass(db, user, id), 'Đã hủy lớp') })}>Hủy lớp</Btn>}
      </Head>
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Card><dl className="grid grid-cols-[150px_1fr] gap-1.5">
          <KV l="Khóa học">{co.name}</KV><KV l="Học phí">{vnd(co.fee)}</KV><KV l="Chi nhánh">{by(db, 'branches', c.branchId).name}</KV><KV l="Đợt đào tạo">{by(db, 'terms', c.termId).name}</KV>
          <KV l="Lịch học">{R.scheduleText(c)}</KV><KV l="Phòng / Giáo viên">{c.roomId ? `${by(db, 'rooms', c.roomId).name} · ${by(db, 'teachers', c.teacherId).name}` : '—'}</KV><KV l="Thời gian">{c.startDate ? `${dmy(c.startDate)} → ${dmy(c.endDate)}` : '—'}</KV>
        </dl></Card>
        <Card><b>Sĩ số</b><div className="text-3xl font-extrabold">{R.live(db, id).length}<small className="text-base text-slate-500"> / {CFG.maxStudents}</small></div>
          <p className="my-1.5">Đã xác nhận: <b>{conf}</b> / tối thiểu {CFG.minStudents}</p><Meter v={conf} min={CFG.minStudents} /><p className="mt-2.5 text-slate-500">Đã học {R.held(db, id)}/{ss.length} buổi</p></Card>
      </div>
      <H3>Học viên</H3>
      <Table head={['Học viên', 'Trạng thái', 'Học phí', 'Đã đóng', 'Còn nợ', '']} right={[2, 3, 4]} rows={ens.map((e) => {
        const live = R.COLLECTIBLE.includes(e.status);
        return <tr key={e.id}><td><Stu id={e.studentId} /></td><td><Badge t={e.status} /></td><td className="text-right">{vnd(e.fee)}</td><td className="text-right">{vnd(R.paid(db, e.id))}</td><td className="text-right">{vnd(live ? R.due(db, e) : 0)}</td><td>{R.can(user, 'pay') && live && R.due(db, e) > 0 && <Btn sm onClick={() => openModal(<PayForm eid={e.id} />)}>Thu phí</Btn>}</td></tr>;
      })} />
      <H3>Các buổi học ({ss.length})</H3>
      <Table head={['Buổi', 'Ngày', 'Thứ', 'Giờ', 'Phòng', 'Giáo viên', 'Trạng thái']} rows={ss.map((s) => <tr key={s.id}><td>{s.no}</td><td>{dmy(s.date)}</td><td>{U.DOW[U.dow(s.date)]}</td><td>{s.start}-{s.end}</td><td>{by(db, 'rooms', s.roomId).name}</td><td>{by(db, 'teachers', s.teacherId).name}</td><td>{s.held ? <Badge t="Đã học" /> : s.date < U.today() ? <Badge t="Chưa điểm danh" c="red" /> : <Badge t="Sắp tới" />}</td></tr>)} />
    </>
  );
}

/* ---------------- Đăng ký học & học phí ---------------- */
export function Enrollments() {
  const { db, user, openModal } = useStore();
  const [q, setQ] = useState(''), [es, setEs] = useState('');
  const rows = db.enrollments.filter((e) => (!es || e.status === es) && (!q || enLabel(db, e).toLowerCase().includes(q.toLowerCase()))).slice().reverse();
  const canPay = R.can(user, 'pay'), canReq = R.can(user, 'request');
  return (
    <>
      <Head title="Đăng ký học" />
      <Note>Đăng ký mới được tạo tại <b>Lớp học → chi tiết lớp → Đăng ký học viên</b>. Bảo lưu, chuyển lớp, học bù tạo yêu cầu chờ Quản lý đào tạo duyệt.</Note>
      <div className="mb-3.5 flex flex-wrap gap-2.5"><In className="max-w-xs" placeholder="Tìm học viên / lớp…" value={q} onChange={(e) => setQ(e.target.value)} /><Filter value={es} onChange={(e) => setEs(e.target.value)} ph="Mọi trạng thái" options={statuses(['Chờ đóng phí', 'Đã xác nhận', 'Bảo lưu', 'Đã chuyển lớp', 'Hoàn thành', 'Đã hủy'])} /></div>
      <Table head={['Học viên', 'Lớp', 'Học phí', 'Đã đóng', 'Còn nợ', 'Trạng thái', '']} right={[2, 3, 4]} rows={rows.map((e) => {
        const live = ['Chờ đóng phí', 'Đã xác nhận'].includes(e.status), coll = R.COLLECTIBLE.includes(e.status);
        return (
          <tr key={e.id}><td><Stu id={e.studentId} /></td><td>{canViewClass(user) ? <a className="text-blue-700" href={`#/app/class/${e.classId}`}>{by(db, 'classes', e.classId).code}</a> : by(db, 'classes', e.classId).code}</td><td className="text-right">{vnd(e.fee)}</td><td className="text-right">{vnd(R.paid(db, e.id))}</td><td className="text-right">{coll ? vnd(R.due(db, e)) : '—'}</td><td><Badge t={e.status} /></td>
            <td><div className="flex flex-wrap gap-1.5">
              {canPay && coll && R.due(db, e) > 0 && <Btn sm onClick={() => openModal(<PayForm eid={e.id} />)}>Thu phí</Btn>}
              {canReq && e.status === 'Đã xác nhận' && <Btn v="ghost" sm onClick={() => openModal(<ReserveForm eid={e.id} />)}>Bảo lưu</Btn>}
              {canReq && live && <Btn v="ghost" sm onClick={() => openModal(<TransferForm eid={e.id} />)}>Chuyển lớp</Btn>}
              {canReq && e.status === 'Đã xác nhận' && <Btn v="ghost" sm onClick={() => openModal(<MakeupForm eid={e.id} />)}>Học bù</Btn>}
            </div></td></tr>
        );
      })} />
    </>
  );
}

export function Payments() {
  const { db, user, openModal } = useStore();
  const debts = db.enrollments.filter((e) => R.COLLECTIBLE.includes(e.status) && R.due(db, e) > 0), pays = db.payments.slice().reverse().slice(0, 60), can = R.can(user, 'pay');
  return (
    <>
      <Head title="Học phí" />
      <H3>Công nợ cần thu ({debts.length})</H3>
      <Table head={['Học viên', 'Lớp', 'Học phí', 'Đã đóng', 'Còn nợ', 'Trạng thái', '']} right={[2, 3, 4]} rows={debts.map((e) => <tr key={e.id}><td><Stu id={e.studentId} /></td><td>{by(db, 'classes', e.classId).code}</td><td className="text-right">{vnd(e.fee)}</td><td className="text-right">{vnd(R.paid(db, e.id))}</td><td className="text-right font-bold">{vnd(R.due(db, e))}</td><td><Badge t={e.status} /></td><td>{can && <Btn sm onClick={() => openModal(<PayForm eid={e.id} />)}>Thu phí</Btn>}</td></tr>)} />
      <H3>Phiếu thu gần đây</H3>
      <Table head={['Số phiếu', 'Ngày', 'Học viên', 'Lớp', 'Hình thức', 'Số tiền', 'Người thu']} right={[5]} rows={pays.map((p) => <tr key={p.id}><td>{p.no}</td><td>{dmy(p.date)}</td><td><Stu id={p.studentId} /></td><td>{by(db, 'classes', by(db, 'enrollments', p.enrollmentId).classId).code}</td><td>{p.method}{p.note && <><br /><Muted>{p.note}</Muted></>}</td><td className="text-right">{vnd(p.amount)}</td><td>{p.by}</td></tr>)} />
    </>
  );
}

/* ---------------- Yêu cầu đặc biệt ---------------- */
export function Requests() {
  const { db, user, act, openModal } = useStore(), ask = useAsk();
  const [rt, setRt] = useState(''), [rs, setRs] = useState('');
  const can = R.can(user, 'approve'), rows = db.requests.filter((r) => (!rt || r.type === rt) && (!rs || r.status === rs)).slice().reverse();
  return (
    <>
      <Head title="Bảo lưu · Chuyển lớp · Học bù" />
      <Note>Tạo yêu cầu từ trang <b>Đăng ký học</b>. Chỉ <b>Quản lý đào tạo</b> được duyệt; khi duyệt, hệ thống kiểm tra lại toàn bộ điều kiện và hoàn tác nếu có lỗi.</Note>
      <div className="mb-3.5 flex flex-wrap gap-2.5"><Filter value={rt} onChange={(e) => setRt(e.target.value)} ph="Mọi loại" options={Object.entries(TYPE)} /><Filter value={rs} onChange={(e) => setRs(e.target.value)} ph="Mọi trạng thái" options={statuses(['Chờ duyệt', 'Đã duyệt', 'Từ chối'])} /></div>
      <Table head={['Loại', 'Học viên', 'Nội dung', 'Lý do', 'Người tạo', 'Trạng thái / kết quả', '']} rows={rows.map((r) => (
        <tr key={r.id}><td><b>{TYPE[r.type]}</b><br /><Muted>{dmy(r.createdAt)}</Muted></td><td><Stu id={r.studentId} /></td><td>{reqDesc(db, r)}</td><td>{r.reason}</td><td>{r.createdBy}</td>
          <td><Badge t={r.status} />{r.result && <><br /><small>{r.result}</small></>}{r.status === 'Từ chối' && <><br /><small>{r.note}</small></>}</td>
          <td>{can && r.status === 'Chờ duyệt' && <div className="flex gap-1.5"><Btn v="ok" sm onClick={() => ask({ title: 'Duyệt yêu cầu này?', message: `${TYPE[r.type]}: ${reqDesc(db, r)}. Hệ thống sẽ áp dụng thay đổi ngay sau khi duyệt.`, ok: 'Duyệt', onConfirm: () => act(() => R.approve(db, user, r.id).result, 'Đã duyệt', true) })}>Duyệt</Btn><Btn v="bad" sm onClick={() => openModal(<RejectForm id={r.id} />)}>Từ chối</Btn></div>}</td></tr>
      ))} />
      <H3>Phiếu bảo lưu</H3>
      <Table head={['Học viên', 'Lớp đã bảo lưu', 'Học phí giữ lại', 'Hạn bảo lưu', 'Trạng thái']} rows={db.reservations.map((v) => <tr key={v.id}><td><Stu id={v.studentId} /></td><td>{by(db, 'classes', by(db, 'enrollments', v.enrollmentId).classId).code}</td><td>{vnd(v.credit)}</td><td>{dmy(v.expires)}</td><td><Badge t={R.rvStatus(v)} /></td></tr>)} />
    </>
  );
}

/* ---------------- Điểm danh ---------------- */
export function Attendance() {
  const { db, user, act } = useStore();
  const [pick, setPick] = useState(null), [draft, setDraft] = useState({});
  const today = U.today(), from = U.addDays(today, -45);
  const attendable = (s) => { const st = by(db, 'classes', s.classId).status; return st === 'Đang học' || (st === 'Kết thúc' && user.role === 'manager'); };
  const list = db.sessions.filter((s) => s.date <= today && s.date >= from && attendable(s) && (user.role !== 'teacher' || s.teacherId === user.teacherId)).sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
  if (!list.length) return <><Head title="Điểm danh" /><Note>Chưa có buổi học nào cần điểm danh.</Note></>;
  const sid = list.some((s) => s.id === pick) ? pick : list[0].id, s = by(db, 'sessions', sid), rows = R.attendees(db, sid);
  const val = (e) => draft[`${sid}:${e.id}`] ?? (db.attendance.find((x) => x.sessionId === sid && x.enrollmentId === e.id) || {}).status ?? 'Có mặt';
  const save = () => act(() => { R.markAttendance(db, user, sid, rows.map(({ e }) => ({ enrollmentId: e.id, status: val(e) }))); setDraft({}); }, 'Đã lưu điểm danh');
  return (
    <>
      <Head title="Điểm danh" />
      <div className="mb-3.5"><Sel className="max-w-md" value={sid} onChange={(e) => { setPick(e.target.value); setDraft({}); }} options={list.map((x) => [x.id, `${dmy(x.date)} ${x.start} · ${by(db, 'classes', x.classId).code} · buổi ${x.no}${x.held ? ' ✔' : ''}`])} /></div>
      <Table head={['Học viên', 'Ghi chú', 'Có mặt', 'Vắng']} rows={rows.map(({ e, makeup }) => (
        <tr key={e.id}><td><Stu id={e.studentId} /></td><td>{makeup && <Badge t="Học bù" />}</td>
          {['Có mặt', 'Vắng'].map((v) => <td key={v}><input type="radio" name={`st_${e.id}`} checked={val(e) === v} onChange={() => setDraft({ ...draft, [`${sid}:${e.id}`]: v })} /></td>)}</tr>
      ))} />
      <Btn onClick={save}>{s.held ? 'Cập nhật điểm danh' : 'Lưu điểm danh'}</Btn>
    </>
  );
}

/* ---------------- Thời khóa biểu ---------------- */
export function Timetable() {
  const { db, user } = useStore();
  const [mon, setMon] = useState(U.monday(U.today())), [tb, setTb] = useState('');
  const today = U.today(), days = [...Array(7)].map((_, i) => U.addDays(mon, i));
  const mine = (s) => (user.role !== 'teacher' || s.teacherId === user.teacherId) && (!tb || by(db, 'classes', s.classId).branchId === tb);
  return (
    <>
      <Head title="Thời khóa biểu"><Btn v="ghost" onClick={() => setMon(U.addDays(mon, -7))}>‹ Tuần trước</Btn><Btn v="ghost" onClick={() => setMon(U.monday(today))}>Tuần này</Btn><Btn v="ghost" onClick={() => setMon(U.addDays(mon, 7))}>Tuần sau ›</Btn></Head>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5"><b>{dmy(days[0])} – {dmy(days[6])}</b>{user.role !== 'teacher' && <Filter value={tb} onChange={(e) => setTb(e.target.value)} ph="Tất cả chi nhánh" options={db.branches.map((b) => [b.id, b.name])} />}</div>
      <div className="grid grid-cols-[repeat(7,minmax(130px,1fr))] gap-2.5 overflow-auto">
        {days.map((d) => (
          <div key={d} className={`min-h-32 rounded-xl border bg-white p-2 ${d === today ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'}`}>
            <h4 className="mb-2 text-[13px] font-bold text-slate-500">{U.DOW[U.dow(d)]} · {dmy(d).slice(0, 5)}</h4>
            {db.sessions.filter((s) => s.date === d && mine(s)).sort((a, b) => a.start.localeCompare(b.start)).map((s) => (
              <div key={s.id} className={`mb-1.5 rounded-md border-l-[3px] px-2 py-1 text-xs ${s.held ? 'border-green-600 bg-green-50' : 'border-blue-600 bg-blue-50'}`}><b>{s.start}-{s.end}</b><br />{by(db, 'classes', s.classId).code} · B{s.no}<br />{by(db, 'rooms', s.roomId).name} · {by(db, 'teachers', s.teacherId).name.split(' ').slice(-1)[0]}</div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Tư vấn, báo cáo, kiểm thử ---------------- */
export function Leads() {
  const { db, commit } = useStore();
  return (
    <>
      <Head title="Yêu cầu tư vấn" />
      <Table head={['Ngày', 'Họ tên', 'Điện thoại', 'Khóa quan tâm', 'Ghi chú', 'Trạng thái']} rows={db.leads.slice().reverse().map((l) => <tr key={l.id}><td>{dmy(l.createdAt)}</td><td>{l.name}</td><td>{l.phone}</td><td>{l.course}</td><td>{l.note}</td><td><Sel className="w-auto" value={l.status} onChange={(e) => { l.status = e.target.value; commit(); }} options={statuses(['Mới', 'Đã liên hệ', 'Đã ghi danh'])} /></td></tr>)} />
    </>
  );
}

export function Reports() {
  const { db } = useStore();
  const r = R.report(db), maxRev = Math.max(1, ...r.byBranch.map((x) => x.revenue)), cls = db.classes.filter((c) => ['Mở đăng ký', 'Đang học'].includes(c.status));
  return (
    <>
      <Head title="Báo cáo"><Btn v="ghost" className="no-print" onClick={() => window.print()}>In báo cáo</Btn></Head>
      <H3>Theo chi nhánh</H3>
      <Table head={['Chi nhánh', 'Số lớp', 'Đang học', 'Học viên', 'Doanh thu đã thu', '', 'Còn phải thu']} right={[4, 6]} rows={r.byBranch.map((x) => <tr key={x.b.id}><td><b>{x.b.name}</b></td><td>{x.classes}</td><td>{x.running}</td><td>{x.students}</td><td className="text-right">{vnd(x.revenue)}</td><td className="w-36"><Bar v={x.revenue} max={maxRev} /></td><td className="text-right">{vnd(x.receivable)}</td></tr>)} />
      <H3>Theo khóa học</H3>
      <Table head={['Khóa học', 'Số lớp', 'Học viên']} rows={r.byCourse.map((x) => <tr key={x.co.id}><td>{x.co.name}</td><td>{x.classes}</td><td>{x.students}</td></tr>)} />
      <H3>Mức độ lấp đầy lớp đang mở</H3>
      <Table head={['Lớp', 'Sĩ số', 'Tỷ lệ lấp đầy']} rows={cls.map((c) => { const n = R.live(db, c.id).length; return <tr key={c.id}><td>{c.code}</td><td>{n}/{CFG.maxStudents}</td><td className="w-64"><Bar v={n} max={CFG.maxStudents} /></td></tr>; })} />
      <Card>Tỷ lệ chuyên cần toàn hệ thống: <b>{r.attRate == null ? '—' : Math.round(r.attRate * 100) + '%'}</b></Card>
    </>
  );
}
