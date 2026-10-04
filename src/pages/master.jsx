import { useState } from 'react';
import { Btn, Badge, Table, Form, Fld, In, Sel, Row2, useAsk } from '../ui.jsx';
import { useStore } from '../store.jsx';
import { R, U, CFG, fail } from '../lib/rules.js';
import { by, vnd, dmy, ROLE } from '../lib/util.js';
import { ProfileView } from '../forms.jsx';
import { Head } from './pages.jsx';

const lv = ['A1', 'A2', 'B1', 'B2', 'C1'].map((x) => [x, x]);
const stOpt = (a, b) => () => [[a, a], [b, b]];

/* Cấu hình CRUD chung: cols = cột hiển thị, fields = ô nhập */
export const MASTER = {
  students: { title: 'Học viên', perm: 'student', pre: 'hv', init: { balance: 0, status: 'Hoạt động', level: 'A1' },
    cols: [['code', 'Mã'], ['name', 'Họ tên'], ['dob', 'Ngày sinh', (r) => dmy(r.dob)], ['phone', 'Điện thoại'], ['level', 'Trình độ'], ['balance', 'Số dư', (r) => vnd(r.balance)], ['status', 'Trạng thái', (r) => <Badge t={r.status} />]],
    fields: [{ k: 'code', l: 'Mã học viên (để trống = tự sinh)', req: false }, { k: 'name', l: 'Họ và tên' }, { k: 'dob', l: 'Ngày sinh', t: 'date' }, { k: 'phone', l: 'Điện thoại', t: 'tel' }, { k: 'email', l: 'Email', t: 'email', req: false }, { k: 'level', l: 'Trình độ hiện tại', o: () => lv }, { k: 'status', l: 'Trạng thái', o: stOpt('Hoạt động', 'Ngừng') }] },
  teachers: { title: 'Giáo viên', perm: 'master', pre: 'gv', init: { status: 'Đang dạy' },
    cols: [['code', 'Mã'], ['name', 'Họ tên'], ['phone', 'Điện thoại'], ['email', 'Email'], ['specialty', 'Chuyên môn'], ['status', 'Trạng thái', (r) => <Badge t={r.status} />]],
    fields: [{ k: 'code', l: 'Mã (để trống = tự sinh)', req: false }, { k: 'name', l: 'Họ và tên' }, { k: 'phone', l: 'Điện thoại' }, { k: 'email', l: 'Email', t: 'email' }, { k: 'specialty', l: 'Chuyên môn' }, { k: 'status', l: 'Trạng thái', o: stOpt('Đang dạy', 'Nghỉ') }] },
  branches: { title: 'Chi nhánh', perm: 'master', pre: 'br',
    cols: [['code', 'Mã'], ['name', 'Tên'], ['address', 'Địa chỉ'], ['phone', 'Điện thoại']],
    fields: [{ k: 'code', l: 'Mã viết tắt (2 chữ cái)' }, { k: 'name', l: 'Tên chi nhánh' }, { k: 'address', l: 'Địa chỉ' }, { k: 'phone', l: 'Điện thoại' }] },
  rooms: { title: 'Phòng học', perm: 'master', pre: 'rm',
    cols: [['name', 'Phòng'], ['branchId', 'Chi nhánh', (r, db) => by(db, 'branches', r.branchId).name], ['capacity', 'Sức chứa']],
    fields: [{ k: 'branchId', l: 'Chi nhánh', o: (db) => db.branches.map((b) => [b.id, b.name]) }, { k: 'name', l: 'Tên phòng' }, { k: 'capacity', l: 'Sức chứa', t: 'number', min: CFG.maxStudents }] },
  courses: { title: 'Khóa học', perm: 'master', pre: 'co',
    cols: [['code', 'Mã'], ['name', 'Tên khóa'], ['level', 'Cấp độ'], ['fee', 'Học phí', (r) => vnd(r.fee)], ['sessions', 'Số buổi']],
    fields: [{ k: 'code', l: 'Mã khóa' }, { k: 'name', l: 'Tên khóa học' }, { k: 'level', l: 'Cấp độ (chỉ chuyển lớp giữa các khóa cùng cấp độ)', t: 'number' }, { k: 'fee', l: 'Học phí (₫)', t: 'number' }, { k: 'sessions', l: 'Số buổi', t: 'number' }, { k: 'desc', l: 'Mô tả', req: false }] },
  terms: { title: 'Đợt đào tạo (3 tháng)', perm: 'master', pre: 'tm',
    cols: [['code', 'Mã'], ['name', 'Tên đợt'], ['start', 'Bắt đầu', (r) => dmy(r.start)], ['end', 'Kết thúc', (r) => dmy(r.end)]],
    fields: [{ k: 'code', l: 'Mã đợt (vd Q1-27)' }, { k: 'name', l: 'Tên đợt' }, { k: 'start', l: 'Bắt đầu', t: 'date' }, { k: 'end', l: 'Kết thúc', t: 'date' }] },
};

export function EditForm({ col, id }) {
  const { db, user } = useStore();
  const M = MASTER[col], r = id ? by(db, col, id) : { ...(M.init || {}) };
  return (
    <Form title={`${id ? 'Sửa' : 'Thêm'} – ${M.title}`} confirm={id ? 'Bạn có chắc chắn muốn lưu thay đổi này?' : null} onSubmit={(fd) => {
      R.need(user, M.perm);
      const o = {}; M.fields.forEach((f) => { let v = fd.get(f.k); v = typeof v === 'string' ? v.trim() : v; o[f.k] = f.t === 'number' ? Number(v) : v; });
      if (col === 'terms' && o.start >= o.end) fail('Ngày kết thúc phải sau ngày bắt đầu.');
      if (col === 'courses' && (o.fee <= 0 || o.sessions <= 0)) fail('Học phí và số buổi phải lớn hơn 0.');
      if (col === 'rooms' && o.capacity < CFG.maxStudents) fail(`Sức chứa phòng tối thiểu bằng sĩ số tối đa (${CFG.maxStudents}).`);
      if (!o.code && M.fields[0].k === 'code') o.code = M.pre.toUpperCase() + String(db[col].length + 1).padStart(4, '0');
      if (o.code && db[col].some((x) => x.id !== id && x.code && x.code.toLowerCase() === o.code.toLowerCase())) fail('Mã này đã tồn tại.');
      if (id) Object.assign(r, o); else db[col].push({ id: U.id(M.pre), ...M.init, ...o });
      return 'Đã lưu';
    }}>
      <Row2>{M.fields.map((f) => (
        <Fld key={f.k} label={f.l}>
          {f.o ? <Sel name={f.k} required={f.req !== false} defaultValue={r[f.k]} options={f.o(db)} /> : <In name={f.k} type={f.t || 'text'} required={f.req !== false} defaultValue={r[f.k] ?? ''} min={f.min} />}
        </Fld>
      ))}</Row2>
    </Form>
  );
}

export function Crud({ col, rows }) {
  const { db, user, openModal, act } = useStore();
  const M = MASTER[col], can = R.can(user, M.perm), ask = useAsk();
  const del = (id) => {
    const used = Object.keys(db).some((k) => k !== col && Array.isArray(db[k]) && db[k].some((x) => Object.entries(x).some(([key, v]) => key.endsWith('Id') && v === id)));
    if (used) return act(() => fail(col === 'students' ? 'Học viên đã có dữ liệu đăng ký – hãy đặt trạng thái "Ngừng" thay vì xóa.' : 'Mục này đang được sử dụng nên không thể xóa.'));
    const r = by(db, col, id);
    ask({ title: 'Bạn có chắc chắn muốn xóa?', message: `“${r.name || r.code}” sẽ bị xóa vĩnh viễn và không thể khôi phục.`, ok: 'Xóa', danger: true, onConfirm: () => act(() => { R.need(user, M.perm); db[col] = db[col].filter((x) => x.id !== id); }, 'Đã xóa') });
  };
  return (
    <Table head={[...M.cols.map((c) => c[1]), '']} rows={(rows || db[col]).map((r) => (
      <tr key={r.id}>
        {M.cols.map(([k, , f]) => <td key={k}>{f ? f(r, db) : r[k]}</td>)}
        <td><div className="flex gap-1.5">
          {col === 'students' && <Btn v="ghost" sm onClick={() => openModal(<ProfileView id={r.id} />)}>Hồ sơ</Btn>}
          {can && <><Btn v="ghost" sm onClick={() => openModal(<EditForm col={col} id={r.id} />)}>Sửa</Btn><Btn v="ghost" sm onClick={() => del(r.id)}>Xóa</Btn></>}
        </div></td>
      </tr>
    ))} />
  );
}

export function Students() {
  const { db, openModal } = useStore();
  const [q, setQ] = useState('');
  const rows = db.students.filter((s) => !q || (s.name + s.code + s.phone).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Head title="Học viên"><Btn onClick={() => openModal(<EditForm col="students" />)}>+ Thêm học viên</Btn></Head>
      <div className="mb-3.5"><In className="max-w-sm" placeholder="Tìm theo tên, mã, điện thoại…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Crud col="students" rows={rows} />
    </>
  );
}

export function Master() {
  const { user, openModal } = useStore();
  const keys = ['teachers', 'branches', 'rooms', 'courses', 'terms'], [t, setT] = useState('teachers');
  return (
    <>
      <Head title="Danh mục" />
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-slate-200">
        {keys.map((k) => <button key={k} onClick={() => setT(k)} className={`-mb-px cursor-pointer border-b-[3px] px-4 py-2.5 font-semibold ${k === t ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'}`}>{MASTER[k].title}</button>)}
        {R.can(user, 'master') && <Btn className="mb-1.5 ml-auto" onClick={() => openModal(<EditForm col={t} />)}>+ Thêm</Btn>}
      </div>
      <Crud col={t} />
    </>
  );
}

/* ---------- Nhân viên (tài khoản đăng nhập) ---------- */
function StaffForm({ id }) {
  const { db, user } = useStore();
  const r = id ? by(db, 'users', id) : { role: 'enroll' };
  const [role, setRole] = useState(r.role);
  return (
    <Form title={id ? 'Sửa tài khoản nhân viên' : 'Thêm nhân viên'} confirm={id ? 'Bạn có chắc chắn muốn lưu thay đổi này?' : null} onSubmit={(fd) => R.saveUser(db, user, id, Object.fromEntries(fd))}>
      <Row2>
        <Fld label="Họ và tên"><In required name="name" defaultValue={r.name || ''} /></Fld>
        <Fld label="Tên đăng nhập"><In required name="username" defaultValue={r.username || ''} placeholder="vd: nguyenvana" /></Fld>
        <Fld label="Vai trò"><Sel required name="role" value={role} onChange={(e) => setRole(e.target.value)} options={Object.entries(ROLE)} /></Fld>
        <Fld label={id ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu (tối thiểu 6 ký tự)'}><In required={!id} name="password" type="text" autoComplete="off" /></Fld>
      </Row2>
      {role === 'teacher' && <Fld label="Gắn với giáo viên (để giáo viên chỉ thấy lịch dạy của mình)"><Sel required name="teacherId" defaultValue={r.teacherId} ph="— Chọn giáo viên —" options={db.teachers.map((t) => [t.id, `${t.name} (${t.code})`])} /></Fld>}
      <p className="text-slate-500">Quản lý: toàn quyền · Ghi danh: học viên, đăng ký, tạo yêu cầu · Kế toán: thu học phí, báo cáo · Giáo viên: thời khóa biểu, điểm danh.</p>
    </Form>
  );
}

export function Staff() {
  const { db, user, act, openModal } = useStore(), ask = useAsk();
  return (
    <>
      <Head title="Nhân viên"><Btn onClick={() => openModal(<StaffForm />)}>+ Thêm nhân viên</Btn></Head>
      <Table head={['Họ tên', 'Tên đăng nhập', 'Vai trò', 'Giáo viên liên kết', '']} rows={db.users.map((u) => (
        <tr key={u.id}><td className="font-semibold">{u.name}{u.id === user.id && <span className="ml-2"><Badge t="Bạn" c="blue" /></span>}</td><td>{u.username}</td><td><Badge t={ROLE[u.role]} c={u.role === 'manager' ? 'purple' : u.role === 'teacher' ? 'teal' : 'blue'} /></td><td>{u.teacherId ? by(db, 'teachers', u.teacherId).name : '—'}</td>
          <td><div className="flex gap-1.5"><Btn v="ghost" sm onClick={() => openModal(<StaffForm id={u.id} />)}>Sửa</Btn>
            <Btn v="ghost" sm onClick={() => ask({ title: 'Bạn có chắc chắn muốn xóa tài khoản?', message: `Tài khoản “${u.username}” (${u.name}) sẽ bị xóa và không thể đăng nhập nữa.`, ok: 'Xóa', danger: true, onConfirm: () => act(() => R.deleteUser(db, user, u.id)) })}>Xóa</Btn></div></td></tr>
      ))} />
    </>
  );
}
