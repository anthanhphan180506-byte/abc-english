import { Btn, Badge, Table, Form, Fld, In, Area, Sel, Row2, H3 } from './ui.jsx';
import { useStore } from './store.jsx';
import { R, U, CFG } from './lib/rules.js';
import { by, vnd, dmy, enLabel } from './lib/util.js';

const Hint = ({ children }) => <p className="mt-1 text-slate-500">{children}</p>;
const seats = (db, c) => CFG.maxStudents - R.live(db, c.id).length;

export function NewClassForm() {
  const { db, user } = useStore();
  let createdId = null; // chỉ chuyển sang trang lớp sau khi đã lưu thành công
  return (
    <Form title="Tạo lớp mới" ok="Tạo lớp" onDone={() => { location.hash = '#/app/class/' + createdId; }} onSubmit={(fd) => { const c = R.createClass(db, user, Object.fromEntries(fd)); createdId = c.id; return 'Đã tạo lớp ' + c.code; }}>
      <Fld label="Khóa học"><Sel required name="courseId" options={db.courses.map((c) => [c.id, `${c.name} – ${vnd(c.fee)}`])} /></Fld>
      <Fld label="Chi nhánh"><Sel required name="branchId" options={db.branches.map((b) => [b.id, b.name])} /></Fld>
      <Fld label="Đợt đào tạo"><Sel required name="termId" options={db.terms.map((t) => [t.id, t.name])} /></Fld>
      <Hint>Sau khi tạo, vào chi tiết lớp để xếp lịch rồi mở đăng ký.</Hint>
    </Form>
  );
}

export function ScheduleForm({ id }) {
  const { db, user } = useStore();
  const c = by(db, 'classes', id), t = by(db, 'terms', c.termId), wd = c.weekdays || [];
  return (
    <Form title={`Xếp lịch – ${c.code}`} ok="Lưu lịch" confirm={R.sessions(db, id).length ? 'Lịch cũ sẽ bị thay bằng lịch mới. Bạn có chắc chắn?' : null} onSubmit={(fd) => { R.setSchedule(db, user, id, { weekdays: fd.getAll('wd'), start: fd.get('start'), end: fd.get('end'), roomId: fd.get('roomId'), teacherId: fd.get('teacherId'), startDate: fd.get('startDate') }); return 'Đã lưu lịch học'; }}>
      <p className="mb-1.5 text-[13.5px] font-semibold text-slate-500">Ngày học trong tuần</p>
      <div className="mb-3.5 flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 0].map((d) => <label key={d} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"><input type="checkbox" name="wd" value={d} defaultChecked={wd.includes(d)} />{U.DOW[d]}</label>)}</div>
      <Row2>
        <Fld label="Giờ bắt đầu"><In required type="time" name="start" defaultValue={c.start || '18:00'} /></Fld>
        <Fld label="Giờ kết thúc"><In required type="time" name="end" defaultValue={c.end || '19:30'} /></Fld>
        <Fld label="Phòng học"><Sel required name="roomId" defaultValue={c.roomId} options={db.rooms.filter((r) => r.branchId === c.branchId).map((r) => [r.id, r.name])} /></Fld>
        <Fld label="Giáo viên"><Sel required name="teacherId" defaultValue={c.teacherId} options={db.teachers.filter((x) => x.status === 'Đang dạy').map((x) => [x.id, `${x.name} (${x.specialty})`])} /></Fld>
      </Row2>
      <Fld label={`Ngày khai giảng (trong ${t.name}: ${dmy(t.start)} – ${dmy(t.end)})`}><In required type="date" name="startDate" defaultValue={c.startDate || t.start} min={t.start} max={t.end} /></Fld>
      <Hint>Hệ thống tự sinh {by(db, 'courses', c.courseId).sessions} buổi và từ chối nếu trùng phòng hoặc giáo viên.</Hint>
    </Form>
  );
}

export function EnrollForm({ cid }) {
  const { db, user } = useStore();
  const c = by(db, 'classes', cid), taken = R.live(db, cid).map((e) => e.studentId);
  return (
    <Form title={`Đăng ký học viên vào lớp ${c.code}`} ok="Đăng ký" celebrate onSubmit={(fd) => { R.enroll(db, user, fd.get('studentId'), cid); return 'Đã đăng ký – chờ đóng học phí'; }}>
      <Fld label="Học viên"><Sel required name="studentId" ph="— Chọn học viên —" options={db.students.filter((s) => s.status === 'Hoạt động' && !taken.includes(s.id)).map((s) => [s.id, `${s.name} (${s.code})`])} /></Fld>
      <Hint>Học phí {vnd(by(db, 'courses', c.courseId).fee)}. Đóng tối thiểu {CFG.minPaidPct * 100}% để được xác nhận chỗ. Hệ thống kiểm tra sĩ số, trùng lịch học viên và đăng ký trùng khóa.</Hint>
    </Form>
  );
}

export function ResumeForm({ rvId }) {
  const { db, user } = useStore();
  const rv = by(db, 'reservations', rvId), co = by(db, 'classes', by(db, 'enrollments', rv.enrollmentId).classId).courseId;
  const cl = db.classes.filter((c) => c.courseId === co && ['Mở đăng ký', 'Đang học'].includes(c.status));
  return (
    <Form title="Học lại sau bảo lưu" ok="Xác nhận học lại" onSubmit={(fd) => { R.resume(db, user, rvId, fd.get('classId')); return 'Đã xếp học viên vào lớp mới'; }}>
      <p className="mb-3">Học phí bảo lưu <b>{vnd(rv.credit)}</b> sẽ được trừ vào lớp mới.</p>
      <Fld label="Lớp học lại (cùng khóa)"><Sel required name="classId" ph="— Chọn lớp —" options={cl.map((c) => [c.id, `${c.code} · ${R.scheduleText(c)} · còn ${seats(db, c)} chỗ`])} /></Fld>
    </Form>
  );
}

export function PayForm({ eid }) {
  const { db, user } = useStore();
  const e = by(db, 'enrollments', eid), st = by(db, 'students', e.studentId), due = R.due(db, e);
  return (
    <Form title={`Thu học phí – ${st.name}`} ok="Ghi nhận thu" celebrate confirm="Bạn có chắc chắn muốn ghi nhận khoản thu này?" onSubmit={(fd) => { const p = R.addPayment(db, user, eid, { amount: fd.get('amount'), method: fd.get('method'), note: fd.get('note') }); return `Đã lập phiếu thu ${p.no}`; }}>
      <p className="mb-3">Lớp <b>{by(db, 'classes', e.classId).code}</b> · học phí {vnd(e.fee)} · còn nợ <b>{vnd(due)}</b></p>
      <Fld label="Số tiền (₫)"><In required type="number" name="amount" defaultValue={due} min="1" max={due} /></Fld>
      <Fld label="Hình thức"><Sel required name="method" options={[['Tiền mặt', 'Tiền mặt'], ['Chuyển khoản', 'Chuyển khoản'], ...(st.balance > 0 ? [['Số dư', `Trừ số dư (${vnd(st.balance)})`]] : [])]} /></Fld>
      <Fld label="Ghi chú"><In name="note" /></Fld>
    </Form>
  );
}

export function ReserveForm({ eid }) {
  const { db, user } = useStore();
  const e = by(db, 'enrollments', eid), c = by(db, 'classes', e.classId), total = R.sessions(db, c.id).length, done = R.held(db, c.id);
  return (
    <Form title="Yêu cầu bảo lưu" ok="Gửi yêu cầu" onSubmit={(fd) => { R.createRequest(db, user, 'reserve', { enrollmentId: eid }, fd.get('reason')); return 'Đã gửi yêu cầu bảo lưu – chờ duyệt'; }}>
      <p className="mb-3"><b>{enLabel(db, e)}</b> – đã học {done}/{total} buổi.</p>
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-900">Chỉ bảo lưu khi đã học không quá {CFG.maxReservePct * 100}% số buổi. Học phí các buổi chưa học được giữ lại, hạn bảo lưu {CFG.reserveMonths} tháng kể từ ngày duyệt.</div>
      <Fld label="Lý do bảo lưu"><Area required name="reason" /></Fld>
    </Form>
  );
}

export function TransferForm({ eid }) {
  const { db, user } = useStore();
  const e = by(db, 'enrollments', eid), from = by(db, 'classes', e.classId), lvl = by(db, 'courses', from.courseId).level;
  const cand = db.classes.filter((c) => c.id !== from.id && ['Mở đăng ký', 'Đang học'].includes(c.status) && by(db, 'courses', c.courseId).level === lvl);
  const label = (c) => { const d = by(db, 'courses', c.courseId).fee - e.fee; return `${c.code} · ${by(db, 'branches', c.branchId).name} · ${R.scheduleText(c)} · còn ${seats(db, c)} chỗ · ${d === 0 ? 'cùng học phí' : (d > 0 ? 'đóng thêm ' : 'giảm ') + vnd(Math.abs(d))}`; };
  return (
    <Form title="Yêu cầu chuyển lớp" ok="Gửi yêu cầu" onSubmit={(fd) => { R.createRequest(db, user, 'transfer', { enrollmentId: eid, toClassId: fd.get('toClassId') }, fd.get('reason')); return 'Đã gửi yêu cầu chuyển lớp – chờ duyệt'; }}>
      <p className="mb-3"><b>{enLabel(db, e)}</b> – học phí hiện tại {vnd(e.fee)}, đã đóng {vnd(R.paid(db, e.id))}.</p>
      <Fld label="Lớp đích (cùng trình độ)"><Sel required name="toClassId" ph="— Chọn lớp đích —" options={cand.map((c) => [c.id, label(c)])} /></Fld>
      <Fld label="Lý do"><Area required name="reason" /></Fld>
      <Hint>Lớp đắt hơn → học viên đóng thêm; lớp rẻ hơn → phần dư cộng vào số dư học viên.</Hint>
    </Form>
  );
}

export function MakeupForm({ eid }) {
  const { db, user } = useStore();
  const e = by(db, 'enrollments', eid), c = by(db, 'classes', e.classId), today = U.today();
  const missed = R.makeupMissed(db, eid); // chỉ loại các buổi đã xin bù của chính đăng ký này
  const targets = db.sessions.filter((s) => s.date >= today && !s.held && s.classId !== c.id && by(db, 'classes', s.classId).courseId === c.courseId && by(db, 'classes', s.classId).status === 'Đang học').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 40);
  return (
    <Form title="Đăng ký học bù" ok="Gửi yêu cầu" onSubmit={(fd) => { R.createRequest(db, user, 'makeup', { enrollmentId: eid, missedSessionId: fd.get('missed'), targetSessionId: fd.get('target') }, fd.get('reason')); return 'Đã gửi yêu cầu học bù – chờ duyệt'; }}>
      <p className="mb-3"><b>{enLabel(db, e)}</b> · tối đa {CFG.maxMakeup} buổi học bù / đăng ký.</p>
      <Fld label="Buổi đã vắng"><Sel required name="missed" options={missed.map((s) => [s.id, `Buổi ${s.no} – ${dmy(s.date)}`])} /></Fld>
      <Fld label="Buổi học bù (lớp khác, cùng khóa)"><Sel required name="target" ph="— Chọn buổi —" options={targets.map((s) => [s.id, `${dmy(s.date)} ${s.start} · ${by(db, 'classes', s.classId).code} · buổi ${s.no} · ${by(db, 'rooms', s.roomId).name}`])} /></Fld>
      <Fld label="Lý do"><Area required name="reason" /></Fld>
    </Form>
  );
}

export function RejectForm({ id }) {
  const { db, user } = useStore();
  return (
    <Form title="Từ chối yêu cầu" ok="Từ chối" confirm="Bạn có chắc chắn muốn từ chối yêu cầu này?" onSubmit={(fd) => { R.reject(db, user, id, fd.get('note')); return 'Đã từ chối yêu cầu'; }}>
      <Fld label="Lý do từ chối"><Area required name="note" /></Fld>
    </Form>
  );
}

export function ProfileView({ id }) {
  const { db, user, openModal } = useStore();
  const s = by(db, 'students', id), ens = db.enrollments.filter((e) => e.studentId === id), rvs = db.reservations.filter((v) => v.studentId === id);
  return (
    <Form title={`Hồ sơ – ${s.name}`} lg>
      <dl className="mb-4 grid grid-cols-[130px_1fr] gap-1.5 [&_dd]:font-semibold [&_dt]:text-slate-500">
        <dt>Mã / Trình độ</dt><dd>{s.code} · {s.level}</dd><dt>Liên hệ</dt><dd>{s.phone} · {s.email}</dd><dt>Số dư học phí</dt><dd>{vnd(s.balance)}</dd>
      </dl>
      <H3>Các lần đăng ký</H3>
      <Table head={['Lớp', 'Trạng thái', 'Học phí', 'Đã đóng']} right={[2, 3]} rows={ens.map((e) => <tr key={e.id}><td>{by(db, 'classes', e.classId).code}</td><td><Badge t={e.status} /></td><td className="text-right">{vnd(e.fee)}</td><td className="text-right">{vnd(R.paid(db, e.id))}</td></tr>)} />
      <H3>Sổ số dư {R.can(user, 'pay') && s.balance > 0 && <Btn sm className="ml-2" onClick={() => openModal(<RefundForm studentId={id} />)}>Hoàn tiền</Btn>}</H3>
      <Table head={['Ngày', 'Nội dung', 'Ghi chú', 'Biến động', 'Số dư sau']} right={[3, 4]} rows={(db.ledger || []).filter((l) => l.studentId === id).slice().reverse().map((l) => <tr key={l.id}><td>{dmy(l.date)}</td><td>{l.type}</td><td>{l.note}</td><td className={`text-right font-semibold ${l.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>{l.amount > 0 ? '+' : ''}{vnd(l.amount)}</td><td className="text-right">{vnd(l.balanceAfter)}</td></tr>)} />
      <H3>Bảo lưu</H3>
      <Table head={['Lớp', 'Học phí giữ lại', 'Hạn', 'Trạng thái', '']} rows={rvs.map((v) => {
        const st = R.rvStatus(v);
        return <tr key={v.id}><td>{by(db, 'classes', by(db, 'enrollments', v.enrollmentId).classId).code}</td><td>{vnd(v.credit)}</td><td>{dmy(v.expires)}</td><td><Badge t={st} /></td><td>{st === 'Đang bảo lưu' && R.can(user, 'enroll') && <Btn sm onClick={() => openModal(<ResumeForm rvId={v.id} />)}>Học lại</Btn>}</td></tr>;
      })} />
    </Form>
  );
}

export function ClassEditForm({ id }) {
  const { db, user } = useStore();
  const c = by(db, 'classes', id), hasSched = R.sessions(db, id).length > 0;
  return (
    <Form title={`Sửa thông tin lớp – ${c.code}`} confirm="Bạn có chắc chắn muốn lưu thay đổi này?" onSubmit={(fd) => R.updateClass(db, user, id, Object.fromEntries(fd))}>
      <Fld label="Khóa học"><Sel required name="courseId" defaultValue={c.courseId} options={db.courses.map((x) => [x.id, `${x.name} – ${vnd(x.fee)}`])} /></Fld>
      <Fld label="Chi nhánh"><Sel required name="branchId" defaultValue={c.branchId} options={db.branches.map((b) => [b.id, b.name])} /></Fld>
      <Fld label="Đợt đào tạo"><Sel required name="termId" defaultValue={c.termId} options={db.terms.map((t) => [t.id, t.name])} /></Fld>
      <Hint>Chỉ sửa được khi lớp còn Nháp. {hasSched ? 'Nếu đổi khóa học, chi nhánh hoặc đợt, lịch học hiện tại sẽ bị xóa và cần xếp lại.' : ''} Muốn đổi giờ/phòng/giáo viên, dùng nút “Sửa lịch”.</Hint>
    </Form>
  );
}

export function FinishForm({ id }) {
  const { db, user } = useStore();
  const c = by(db, 'classes', id), total = R.sessions(db, id).length, done = R.held(db, id);
  return (
    <Form title={`Kết thúc lớp ${c.code}`} ok="Kết thúc lớp" confirm="Bạn có chắc chắn muốn kết thúc lớp này?" onSubmit={(fd) => { R.finishClass(db, user, id, fd.get('reason')); return 'Đã kết thúc lớp'; }}>
      <p className="mb-3">Đã học <b>{done}/{total}</b> buổi. Học viên đã xác nhận được ghi nhận <b>Hoàn thành</b>; khoản học phí còn nợ (nếu có) vẫn thu được ở trang Học phí.</p>
      {done === 0 && <p className="mb-3 font-semibold text-red-600">Lớp chưa học buổi nào nên chưa thể kết thúc.</p>}
      {done > 0 && done < total && <Fld label="Lý do kết thúc sớm (bắt buộc)"><Area required name="reason" /></Fld>}
    </Form>
  );
}

export function CancelForm({ eid }) {
  const { db, user } = useStore();
  const e = by(db, 'enrollments', eid); let ctx = null, err = '';
  try { ctx = R.V.cancel(db, { enrollmentId: eid }); } catch (x) { err = x.message; }
  return (
    <Form title="Yêu cầu hủy đăng ký" ok="Gửi yêu cầu" onSubmit={(fd) => { R.createRequest(db, user, 'cancel', { enrollmentId: eid }, fd.get('reason')); return 'Đã gửi yêu cầu hủy đăng ký – chờ duyệt'; }}>
      <p className="mb-3"><b>{enLabel(db, e)}</b></p>
      {err ? <p className="mb-3 font-semibold text-red-600">{err}</p> : (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-900">
          Đã đóng <b>{vnd(ctx.paid)}</b> − giá trị buổi đã học <b>{vnd(ctx.studied)}</b> = hoàn <b>{vnd(ctx.refund)}</b> vào số dư học viên (sau đó kế toán hoàn tiền mặt/chuyển khoản). Các buổi học bù đã xin sẽ bị hủy.
        </div>
      )}
      <Fld label="Lý do hủy"><Area required name="reason" /></Fld>
    </Form>
  );
}

export function RescheduleForm({ sid }) {
  const { db, user } = useStore();
  const s = by(db, 'sessions', sid), c = by(db, 'classes', s.classId);
  return (
    <Form title={`Đổi buổi ${s.no} – lớp ${c.code}`} ok="Lưu thay đổi" confirm="Bạn có chắc chắn muốn đổi buổi học này?" onSubmit={(fd) => R.rescheduleSession(db, user, sid, Object.fromEntries(fd))}>
      <p className="mb-3 text-slate-600">Hiện tại: {dmy(s.date)} {s.start}-{s.end}, phòng {by(db, 'rooms', s.roomId).name}, {by(db, 'teachers', s.teacherId).name}.</p>
      <Row2>
        <Fld label="Ngày học mới"><In required type="date" name="date" defaultValue={s.date} min={U.today()} /></Fld>
        <Fld label="Giáo viên (đổi nếu cần thay thế)"><Sel required name="teacherId" defaultValue={s.teacherId} options={db.teachers.filter((x) => x.status === 'Đang dạy').map((x) => [x.id, x.name])} /></Fld>
        <Fld label="Giờ bắt đầu"><In required type="time" name="start" defaultValue={s.start} /></Fld>
        <Fld label="Giờ kết thúc"><In required type="time" name="end" defaultValue={s.end} /></Fld>
      </Row2>
      <Fld label="Phòng học"><Sel required name="roomId" defaultValue={s.roomId} options={db.rooms.filter((r) => r.branchId === c.branchId).map((r) => [r.id, r.name])} /></Fld>
      <Fld label="Lý do đổi (bắt buộc)"><Area required name="reason" /></Fld>
      <Hint>Hệ thống kiểm tra lại trùng giáo viên, phòng, lịch của từng học viên và học viên học bù vào buổi này.</Hint>
    </Form>
  );
}

export function VoidForm({ pid }) {
  const { db, user } = useStore();
  const p = by(db, 'payments', pid);
  return (
    <Form title={`Hủy phiếu thu ${p.no}`} ok="Hủy phiếu" confirm="Phiếu thu sẽ bị đánh dấu hủy (vẫn lưu lịch sử). Bạn có chắc chắn?" onSubmit={(fd) => R.voidPayment(db, user, pid, fd.get('reason'))}>
      <p className="mb-3">{vnd(p.amount)} · {p.method} · {dmy(p.date)} · {by(db, 'students', p.studentId).name}</p>
      <Fld label="Lý do hủy (bắt buộc)"><Area required name="reason" /></Fld>
    </Form>
  );
}

export function RefundForm({ studentId }) {
  const { db, user } = useStore();
  const st = by(db, 'students', studentId);
  return (
    <Form title={`Hoàn tiền – ${st.name}`} ok="Ghi nhận hoàn tiền" confirm="Bạn có chắc chắn đã hoàn số tiền này cho học viên?" onSubmit={(fd) => R.refundBalance(db, user, studentId, { amount: fd.get('amount'), method: fd.get('method'), note: fd.get('note') })}>
      <p className="mb-3">Số dư hiện có: <b>{vnd(st.balance)}</b></p>
      <Fld label="Số tiền hoàn (₫)"><In required type="number" name="amount" defaultValue={st.balance} min="1" max={st.balance} /></Fld>
      <Fld label="Hình thức"><Sel required name="method" options={[['Tiền mặt', 'Tiền mặt'], ['Chuyển khoản', 'Chuyển khoản']]} /></Fld>
      <Fld label="Ghi chú"><In name="note" /></Fld>
    </Form>
  );
}
