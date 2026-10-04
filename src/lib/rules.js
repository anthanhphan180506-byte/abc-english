/* =====================================================================
 * rules.js – Lớp nghiệp vụ (service layer) của Trung tâm Anh ngữ ABC.
 * Mọi luật quan trọng được kiểm tra ở đây; giao diện chỉ gọi hàm.
 * Không phụ thuộc DOM nên có thể chạy kiểm thử độc lập (xem tests.js).
 *
 * CÁC CON SỐ TRONG CFG LÀ GIẢ ĐỊNH, cần giảng viên (chủ đầu tư) xác nhận.
 * ===================================================================== */
class RuleError extends Error {}
const fail = (m) => { throw new RuleError(m); };

const U = {
  id: (p) => p + '_' + Math.random().toString(36).slice(2, 9),
  iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  today() { return U.iso(new Date()); },
  addDays(s, n) { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); },
  addMonths(s, n) { const d = U.parse(s); d.setMonth(d.getMonth() + n); return U.iso(d); },
  dow(s) { return U.parse(s).getDay(); },
  monday(s) { const d = U.dow(s); return U.addDays(s, d === 0 ? -6 : 1 - d); },
  dmy(s) { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; },
  vnd(n) { return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫'; },
  DOW: ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
};

const CFG = {
  minStudents: 10,     // sĩ số tối thiểu để mở lớp (đã xác nhận)
  maxStudents: 20,     // sĩ số tối đa
  minPaidPct: 0.5,     // đóng tối thiểu 50% học phí để được xác nhận chỗ
  maxReservePct: 0.5,  // chỉ được bảo lưu khi đã học không quá 50% số buổi
  reserveMonths: 3,    // thời hạn bảo lưu (1 chu kỳ)
  maxMakeup: 2,        // số buổi học bù tối đa / đăng ký học
  lateJoin: 2,         // lớp đã học quá số buổi này thì không nhận thêm
};
const LIVE = ['Chờ đóng phí', 'Đã xác nhận', 'Hoàn thành']; // trạng thái chiếm chỗ trong lớp
const PERMS = {
  master: ['manager'], klass: ['manager'], approve: ['manager'],
  student: ['manager', 'enroll'], enroll: ['manager', 'enroll'], request: ['manager', 'enroll'], lead: ['manager', 'enroll'],
  pay: ['manager', 'accountant'], report: ['manager', 'accountant'], attend: ['manager', 'teacher'],
};

const R = { CFG, LIVE, PERMS };

/* ---------- tiện ích truy cập dữ liệu ---------- */
R.can = (u, a) => !!u && (PERMS[a] || []).includes(u.role);
R.need = (u, a) => { if (!R.can(u, a)) fail('Bạn không có quyền thực hiện thao tác này.'); };
R.by = (db, col, id) => db[col].find((x) => x.id === id);
R.must = (db, col, id, label) => R.by(db, col, id) || fail(`Không tìm thấy ${label || col}.`);
R.atomic = (db, fn) => { // lỗi giữa chừng => khôi phục nguyên trạng
  const snap = JSON.stringify(db);
  try { return fn(); } catch (e) {
    const o = JSON.parse(snap); Object.keys(db).forEach((k) => delete db[k]); Object.assign(db, o); throw e;
  }
};
R.paid = (db, eid) => db.payments.filter((p) => p.enrollmentId === eid).reduce((s, p) => s + p.amount, 0);
R.due = (db, e) => Math.max(0, e.fee - R.paid(db, e.id));
R.live = (db, cid) => db.enrollments.filter((e) => e.classId === cid && LIVE.includes(e.status));
R.confirmed = (db, cid) => db.enrollments.filter((e) => e.classId === cid && (e.status === 'Đã xác nhận' || e.status === 'Hoàn thành'));
R.sessions = (db, cid) => db.sessions.filter((s) => s.classId === cid).sort((a, b) => a.no - b.no);
R.held = (db, cid) => R.sessions(db, cid).filter((s) => s.held).length;
R.classLabel = (db, c) => c ? c.code : '';
R.scheduleText = (c) => c && c.weekdays && c.weekdays.length ? `${c.weekdays.map((d) => U.DOW[d]).join(', ')} · ${c.start}-${c.end}` : 'Chưa xếp lịch';

/* ---------- kiểm tra trùng lịch ---------- */
const overlap = (a, b) => a.date === b.date && a.start < b.end && b.start < a.end;

R.resourceConflicts = (db, sessions, roomId, teacherId, excludeClassId) => {
  const out = [], room = R.by(db, 'rooms', roomId), tch = R.by(db, 'teachers', teacherId);
  for (const t of sessions) for (const s of db.sessions) {
    if (s.classId === excludeClassId || !overlap(s, t)) continue;
    const c = R.by(db, 'classes', s.classId);
    if (s.roomId === roomId) out.push(`phòng ${room.name} đã có lớp ${c ? c.code : '?'} ngày ${U.dmy(t.date)} (${s.start}-${s.end})`);
    if (s.teacherId === teacherId) out.push(`giáo viên ${tch.name} đã dạy lớp ${c ? c.code : '?'} ngày ${U.dmy(t.date)} (${s.start}-${s.end})`);
  }
  return [...new Set(out)];
};

R.studentConflict = (db, studentId, classId, excludeEid) => {
  const mine = R.sessions(db, classId);
  for (const e of db.enrollments) {
    if (e.studentId !== studentId || !LIVE.includes(e.status) || e.id === excludeEid || e.classId === classId) continue;
    for (const s of R.sessions(db, e.classId)) for (const t of mine) {
      if (overlap(s, t)) return `Học viên trùng lịch với lớp ${R.by(db, 'classes', e.classId).code} ngày ${U.dmy(t.date)} (${s.start}-${s.end}).`;
    }
  }
  return null;
};

/* ---------- lớp học & lịch ---------- */
R.createClass = (db, u, p) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const course = R.must(db, 'courses', p.courseId, 'khóa học'), br = R.must(db, 'branches', p.branchId, 'chi nhánh'), term = R.must(db, 'terms', p.termId, 'đợt đào tạo');
  const n = db.classes.filter((c) => c.courseId === course.id && c.branchId === br.id && c.termId === term.id).length + 1;
  const c = { id: U.id('cl'), code: `${course.code}-${br.code}-${term.code}-${String(n).padStart(2, '0')}`, courseId: course.id, branchId: br.id, termId: term.id, status: 'Nháp', weekdays: [], start: '', end: '', roomId: '', teacherId: '', startDate: '' };
  db.classes.push(c); return c;
}); };

R.setSchedule = (db, u, classId, p) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', classId, 'lớp'), course = R.by(db, 'courses', c.courseId), term = R.by(db, 'terms', c.termId);
  if (!['Nháp', 'Mở đăng ký'].includes(c.status)) fail('Chỉ sửa được lịch khi lớp ở trạng thái Nháp hoặc Mở đăng ký.');
  const wd = [...new Set((p.weekdays || []).map(Number))];
  if (!wd.length) fail('Chọn ít nhất một ngày học trong tuần.');
  if (!p.start || !p.end || p.start >= p.end) fail('Giờ học không hợp lệ (giờ kết thúc phải sau giờ bắt đầu).');
  const room = R.must(db, 'rooms', p.roomId, 'phòng học'), tch = R.must(db, 'teachers', p.teacherId, 'giáo viên');
  if (room.branchId !== c.branchId) fail('Phòng học không thuộc chi nhánh của lớp.');
  if (tch.status !== 'Đang dạy') fail('Giáo viên này hiện không nhận lớp.');
  if (!p.startDate || p.startDate < term.start || p.startDate > term.end) fail(`Ngày khai giảng phải nằm trong ${term.name} (${U.dmy(term.start)} – ${U.dmy(term.end)}).`);
  const list = []; let d = p.startDate;
  while (list.length < course.sessions) { if (wd.includes(U.dow(d))) list.push(d); d = U.addDays(d, 1); }
  const ss = list.map((date, i) => ({ id: U.id('ss'), classId, no: i + 1, date, start: p.start, end: p.end, roomId: room.id, teacherId: tch.id, held: false }));
  const cf = R.resourceConflicts(db, ss, room.id, tch.id, classId);
  if (cf.length) fail('Không thể lưu lịch vì trùng: ' + cf.slice(0, 3).join('; ') + (cf.length > 3 ? ` … (và ${cf.length - 3} xung đột khác)` : '') + '.');
  db.sessions = db.sessions.filter((s) => s.classId !== classId).concat(ss);
  Object.assign(c, { weekdays: wd, start: p.start, end: p.end, roomId: room.id, teacherId: tch.id, startDate: p.startDate, endDate: list[list.length - 1] });
  return c;
}); };

R.openRegistration = (db, u, classId) => { R.need(u, 'klass');
  const c = R.must(db, 'classes', classId, 'lớp');
  if (c.status !== 'Nháp') fail('Lớp không ở trạng thái Nháp.');
  if (!R.sessions(db, classId).length) fail('Phải xếp lịch học trước khi mở đăng ký.');
  c.status = 'Mở đăng ký'; return c; };

R.confirmOpen = (db, u, classId) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', classId, 'lớp');
  if (c.status !== 'Mở đăng ký') fail('Chỉ xác nhận mở lớp khi lớp đang Mở đăng ký.');
  const n = R.confirmed(db, classId).length;
  if (n < CFG.minStudents) fail(`Chưa đủ sĩ số tối thiểu: ${n}/${CFG.minStudents} học viên đã xác nhận (đóng ≥ ${CFG.minPaidPct * 100}% học phí).`);
  const cf = R.resourceConflicts(db, R.sessions(db, classId), c.roomId, c.teacherId, classId);
  if (cf.length) fail('Lịch lớp bị trùng: ' + cf[0] + '.');
  c.status = 'Đang học'; return c;
}); };

R.finishClass = (db, u, classId) => { R.need(u, 'klass');
  const c = R.must(db, 'classes', classId, 'lớp');
  if (c.status !== 'Đang học') fail('Chỉ kết thúc lớp đang học.');
  c.status = 'Kết thúc';
  db.enrollments.filter((e) => e.classId === classId && e.status === 'Đã xác nhận').forEach((e) => { e.status = 'Hoàn thành'; });
  return c; };

const classCode = (db, course, br, term, selfId) => {
  const n = db.classes.filter((c) => c.id !== selfId && c.courseId === course.id && c.branchId === br.id && c.termId === term.id).length + 1;
  return `${course.code}-${br.code}-${term.code}-${String(n).padStart(2, '0')}`;
};
/* Sửa thông tin lớp (chỉ khi còn Nháp). Đổi khóa/chi nhánh/đợt thì lịch cũ không còn đúng nên bị xóa. */
R.updateClass = (db, u, id, p) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', id, 'lớp');
  if (c.status !== 'Nháp') fail('Chỉ sửa thông tin lớp khi lớp ở trạng thái Nháp.');
  if (db.enrollments.some((e) => e.classId === id)) fail('Lớp đã có dữ liệu đăng ký nên không thể sửa.');
  const course = R.must(db, 'courses', p.courseId, 'khóa học'), br = R.must(db, 'branches', p.branchId, 'chi nhánh'), term = R.must(db, 'terms', p.termId, 'đợt đào tạo');
  const changed = c.courseId !== course.id || c.branchId !== br.id || c.termId !== term.id;
  if (changed) {
    db.sessions = db.sessions.filter((s) => s.classId !== id);
    Object.assign(c, { weekdays: [], start: '', end: '', roomId: '', teacherId: '', startDate: '', endDate: '' });
  }
  Object.assign(c, { courseId: course.id, branchId: br.id, termId: term.id, code: classCode(db, course, br, term, id) });
  return changed ? 'Đã lưu. Lịch học cũ bị xóa, hãy xếp lại lịch.' : 'Đã lưu';
}); };
/* Xóa lớp: chỉ lớp Nháp hoặc đã hủy và chưa có dữ liệu đăng ký */
R.deleteClass = (db, u, id) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', id, 'lớp');
  if (!['Nháp', 'Đã hủy'].includes(c.status)) fail('Chỉ xóa được lớp ở trạng thái Nháp hoặc Đã hủy. Lớp đang hoạt động hãy hủy hoặc kết thúc trước.');
  if (db.enrollments.some((e) => e.classId === id)) fail('Lớp đã có dữ liệu đăng ký học nên không thể xóa (cần giữ lịch sử).');
  db.sessions = db.sessions.filter((s) => s.classId !== id);
  db.classes = db.classes.filter((x) => x.id !== id);
  return 'Đã xóa lớp ' + c.code;
}); };

/* ---------- tài khoản nhân viên ---------- */
R.ROLES = ['manager', 'enroll', 'accountant', 'teacher'];
R.ROLE_TITLE = { manager: 'Quản lý đào tạo', enroll: 'Nhân viên ghi danh', accountant: 'Kế toán', teacher: 'Giáo viên' };
R.saveUser = (db, u, id, p) => { R.need(u, 'master'); return R.atomic(db, () => {
  const name = String(p.name || '').trim(), username = String(p.username || '').trim().toLowerCase(), pw = String(p.password || '');
  if (!name) fail('Nhập họ tên nhân viên.');
  if (!/^[a-z0-9._-]{3,}$/.test(username)) fail('Tên đăng nhập tối thiểu 3 ký tự, chỉ gồm chữ thường không dấu, số và . _ -');
  if (!R.ROLES.includes(p.role)) fail('Vai trò không hợp lệ.');
  if (db.users.some((x) => x.id !== id && x.username === username)) fail('Tên đăng nhập đã tồn tại.');
  if (p.role === 'teacher' && !R.by(db, 'teachers', p.teacherId)) fail('Tài khoản giáo viên phải gắn với một giáo viên trong danh mục.');
  const old = id ? R.must(db, 'users', id, 'tài khoản') : null;
  if (!old && pw.length < 6) fail('Mật khẩu tối thiểu 6 ký tự.');
  if (old && pw && pw.length < 6) fail('Mật khẩu mới tối thiểu 6 ký tự.');
  if (old && old.role === 'manager' && p.role !== 'manager') {
    if (old.id === u.id) fail('Không thể tự hạ quyền của chính mình.');
    if (db.users.filter((x) => x.role === 'manager').length <= 1) fail('Hệ thống phải còn ít nhất một Quản lý đào tạo.');
  }
  const data = { name, username, role: p.role, title: R.ROLE_TITLE[p.role], teacherId: p.role === 'teacher' ? p.teacherId : undefined };
  if (old) { Object.assign(old, data); if (pw) old.password = pw; return 'Đã cập nhật tài khoản'; }
  db.users.push({ id: U.id('u'), password: pw, ...data }); return 'Đã thêm tài khoản';
}); };
R.deleteUser = (db, u, id) => { R.need(u, 'master'); return R.atomic(db, () => {
  const t = R.must(db, 'users', id, 'tài khoản');
  if (t.id === u.id) fail('Không thể xóa tài khoản đang đăng nhập.');
  if (t.role === 'manager' && db.users.filter((x) => x.role === 'manager').length <= 1) fail('Hệ thống phải còn ít nhất một Quản lý đào tạo.');
  db.users = db.users.filter((x) => x.id !== id); return 'Đã xóa tài khoản ' + t.username;
}); };

R.cancelClass = (db, u, classId) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', classId, 'lớp');
  if (!['Nháp', 'Mở đăng ký'].includes(c.status)) fail('Chỉ hủy được lớp chưa khai giảng.');
  for (const e of db.enrollments.filter((x) => x.classId === classId && LIVE.includes(x.status))) { // tiền đã đóng -> số dư học viên
    R.must(db, 'students', e.studentId).balance += R.paid(db, e.id); e.status = 'Đã hủy'; e.cancelNote = 'Lớp bị hủy';
  }
  db.sessions = db.sessions.filter((s) => s.classId !== classId);
  c.status = 'Đã hủy'; return c;
}); };

/* ---------- đăng ký học & học phí ---------- */
R._enroll = (db, studentId, classId) => {
  const st = R.must(db, 'students', studentId, 'học viên'), c = R.must(db, 'classes', classId, 'lớp');
  if (st.status !== 'Hoạt động') fail('Hồ sơ học viên đang ngừng hoạt động.');
  if (!['Mở đăng ký', 'Đang học'].includes(c.status)) fail('Lớp chưa mở đăng ký hoặc đã đóng đăng ký.');
  if (c.status === 'Đang học' && R.held(db, classId) > CFG.lateJoin) fail(`Lớp đã học quá ${CFG.lateJoin} buổi, không nhận thêm học viên.`);
  const live = R.live(db, classId);
  if (live.some((e) => e.studentId === studentId)) fail('Học viên đã đăng ký lớp này.');
  if (live.length >= CFG.maxStudents) fail(`Lớp đã đủ sĩ số tối đa (${CFG.maxStudents}).`);
  const dup = db.enrollments.find((e) => e.studentId === studentId && LIVE.includes(e.status) && (() => { const o = R.by(db, 'classes', e.classId); return o.courseId === c.courseId && o.termId === c.termId; })());
  if (dup) fail('Học viên đã đăng ký khóa học này trong đợt này ở lớp khác.');
  const cf = R.studentConflict(db, studentId, classId, null); if (cf) fail(cf);
  const e = { id: U.id('en'), studentId, classId, fee: R.by(db, 'courses', c.courseId).fee, status: 'Chờ đóng phí', createdAt: U.today() };
  db.enrollments.push(e); return e;
};
R.enroll = (db, u, studentId, classId) => { R.need(u, 'enroll'); return R.atomic(db, () => R._enroll(db, studentId, classId)); };

R.refresh = (db, e) => { if (e.status === 'Chờ đóng phí' && R.paid(db, e.id) >= e.fee * CFG.minPaidPct) e.status = 'Đã xác nhận'; };
R._pay = (db, e, amount, method, type, note, by) => {
  db.meta.receiptSeq++;
  const p = { id: U.id('pt'), no: 'PT' + String(db.meta.receiptSeq).padStart(5, '0'), enrollmentId: e.id, studentId: e.studentId, amount, method, type, note: note || '', date: U.today(), by: by || '' };
  db.payments.push(p); R.refresh(db, e); return p;
};
R.addPayment = (db, u, eid, { amount, method, note }) => { R.need(u, 'pay'); return R.atomic(db, () => {
  const e = R.must(db, 'enrollments', eid, 'đăng ký học'); amount = Math.round(Number(amount));
  if (!['Chờ đóng phí', 'Đã xác nhận'].includes(e.status)) fail('Đăng ký này không còn ở trạng thái thu phí.');
  if (!(amount > 0)) fail('Số tiền phải lớn hơn 0.');
  if (amount > R.due(db, e)) fail(`Số tiền vượt quá khoản còn phải đóng (${U.vnd(R.due(db, e))}).`);
  if (method === 'Số dư') {
    const st = R.by(db, 'students', e.studentId);
    if (amount > st.balance) fail(`Số dư của học viên không đủ (${U.vnd(st.balance)}).`);
    st.balance -= amount; return R._pay(db, e, amount, method, 'Trừ số dư', note, u.name);
  }
  return R._pay(db, e, amount, method, 'Thu', note, u.name);
}); };
R._credit = (db, e, amount, note) => { // đưa khoản tiền đã có vào đăng ký mới; phần dư vào số dư học viên
  const use = Math.min(amount, e.fee);
  if (use > 0) R._pay(db, e, use, 'Chuyển nội bộ', 'Chuyển nội bộ', note, 'Hệ thống');
  if (amount > use) R.must(db, 'students', e.studentId).balance += amount - use;
};

/* ---------- yêu cầu đặc biệt: bảo lưu / chuyển lớp / học bù ---------- */
R.V = {
  reserve(db, d) {
    const e = R.must(db, 'enrollments', d.enrollmentId, 'đăng ký học');
    if (e.status !== 'Đã xác nhận') fail('Chỉ bảo lưu được khi học viên đang học (đã đóng tối thiểu ' + CFG.minPaidPct * 100 + '% học phí).');
    const c = R.by(db, 'classes', e.classId);
    if (c.status !== 'Đang học') fail('Chỉ bảo lưu cho lớp đang học. Lớp chưa khai giảng thì hủy đăng ký/chuyển lớp.');
    const total = R.sessions(db, c.id).length, done = R.held(db, c.id);
    if (total && done / total > CFG.maxReservePct) fail(`Đã học ${done}/${total} buổi, vượt ${CFG.maxReservePct * 100}% nên không được bảo lưu.`);
    return { e, c, total, done };
  },
  transfer(db, d) {
    const e = R.must(db, 'enrollments', d.enrollmentId, 'đăng ký học');
    if (!['Chờ đóng phí', 'Đã xác nhận'].includes(e.status)) fail('Đăng ký này không thể chuyển lớp (phải đang học hoặc chờ đóng phí).');
    const from = R.by(db, 'classes', e.classId), to = R.must(db, 'classes', d.toClassId, 'lớp đích');
    if (to.id === from.id) fail('Lớp đích trùng lớp hiện tại.');
    const fc = R.by(db, 'courses', from.courseId), tc = R.by(db, 'courses', to.courseId);
    if (fc.level !== tc.level) fail(`Lớp đích khác trình độ (${fc.name} → ${tc.name}). Chỉ chuyển giữa các khóa cùng trình độ.`);
    if (!['Mở đăng ký', 'Đang học'].includes(to.status)) fail('Lớp đích chưa mở hoặc đã đóng đăng ký.');
    if (to.status === 'Đang học' && R.held(db, to.id) > CFG.lateJoin) fail(`Lớp đích đã học quá ${CFG.lateJoin} buổi.`);
    if (R.live(db, to.id).length >= CFG.maxStudents) fail(`Lớp đích đã hết chỗ (${CFG.maxStudents}/${CFG.maxStudents}).`);
    if (R.live(db, to.id).some((x) => x.studentId === e.studentId)) fail('Học viên đã có trong lớp đích.');
    const cf = R.studentConflict(db, e.studentId, to.id, e.id); if (cf) fail(cf);
    return { e, from, to, fc, tc, diff: tc.fee - e.fee };
  },
  makeup(db, d, r) {
    const e = R.must(db, 'enrollments', d.enrollmentId, 'đăng ký học');
    if (e.status !== 'Đã xác nhận') fail('Chỉ học viên đang học mới được đăng ký học bù.');
    const missed = R.by(db, 'sessions', d.missedSessionId), target = R.by(db, 'sessions', d.targetSessionId);
    if (!missed || !target) fail('Chưa chọn buổi vắng và buổi học bù.');
    if (!db.attendance.find((a) => a.sessionId === missed.id && a.enrollmentId === e.id && a.status === 'Vắng')) fail('Buổi này học viên không ở trạng thái vắng.');
    const mc = R.by(db, 'classes', missed.classId), tc = R.by(db, 'classes', target.classId);
    if (mc.courseId !== tc.courseId) fail('Buổi học bù phải thuộc cùng khóa học.');
    if (mc.id === tc.id) fail('Học bù phải sắp xếp ở lớp khác cùng khóa học.');
    if (tc.status !== 'Đang học') fail('Lớp học bù phải đang học.');
    if (target.held || target.date < U.today()) fail('Buổi học bù phải ở tương lai.');
    const mine = db.requests.filter((x) => x.type === 'makeup' && x.id !== (r && r.id) && ['Chờ duyệt', 'Đã duyệt'].includes(x.status));
    if (mine.some((x) => x.data.missedSessionId === missed.id && x.data.enrollmentId === e.id)) fail('Buổi vắng này đã có yêu cầu học bù.');
    if (mine.filter((x) => x.data.enrollmentId === e.id).length >= CFG.maxMakeup) fail(`Mỗi đăng ký chỉ học bù tối đa ${CFG.maxMakeup} buổi.`);
    const room = R.by(db, 'rooms', target.roomId);
    const seats = room.capacity - R.live(db, tc.id).length - mine.filter((x) => x.status === 'Đã duyệt' && x.data.targetSessionId === target.id).length;
    if (seats <= 0) fail('Buổi học bù đã hết chỗ.');
    for (const x of db.enrollments.filter((z) => z.studentId === e.studentId && LIVE.includes(z.status))) {
      if (R.sessions(db, x.classId).some((s) => overlap(s, target))) fail('Học viên trùng lịch học vào thời điểm học bù.');
    }
    return { e, missed, target, mc, tc };
  },
};

R.X = { // thực thi sau khi duyệt
  reserve(db, ctx, r) {
    const { e, total, done } = ctx, paid = R.paid(db, e.id);
    const credit = total ? Math.round(paid * (total - done) / total) : paid;
    e.status = 'Bảo lưu';
    const rv = { id: U.id('rv'), studentId: e.studentId, enrollmentId: e.id, credit, createdAt: U.today(), expires: U.addMonths(U.today(), CFG.reserveMonths), status: 'Đang bảo lưu' };
    db.reservations.push(rv); r.result = `Giữ lại ${U.vnd(credit)} (còn ${total - done}/${total} buổi), hạn đến ${U.dmy(rv.expires)}.`;
  },
  transfer(db, ctx, r) {
    const { e, from, to, tc, diff } = ctx, paid = R.paid(db, e.id);
    e.status = 'Đã chuyển lớp'; e.movedTo = to.id;
    const n = { id: U.id('en'), studentId: e.studentId, classId: to.id, fee: tc.fee, status: 'Chờ đóng phí', createdAt: U.today(), transferredFrom: e.id };
    db.enrollments.push(n); R._credit(db, n, paid, 'Chuyển từ lớp ' + from.code);
    const after = R.due(db, n);
    r.result = `${from.code} → ${to.code}. Chênh lệch ${diff >= 0 ? '+' : '−'}${U.vnd(Math.abs(diff))}; ` + (after > 0 ? `học viên còn phải đóng ${U.vnd(after)}.` : 'không phải đóng thêm' + (paid > tc.fee ? `, ${U.vnd(paid - tc.fee)} được cộng vào số dư.` : '.'));
  },
  makeup(db, ctx, r) { r.result = `Học bù buổi ${ctx.target.no} lớp ${ctx.tc.code} ngày ${U.dmy(ctx.target.date)}.`; },
};

R.createRequest = (db, u, type, data, reason) => { R.need(u, 'request'); return R.atomic(db, () => {
  if (!R.V[type]) fail('Loại yêu cầu không hợp lệ.');
  R.V[type](db, data, null);
  if (db.requests.some((x) => x.type === type && x.status === 'Chờ duyệt' && x.data.enrollmentId === data.enrollmentId && (type !== 'makeup' || x.data.missedSessionId === data.missedSessionId))) fail('Đã có yêu cầu cùng loại đang chờ duyệt.');
  if (!String(reason || '').trim()) fail('Vui lòng nhập lý do.');
  const e = R.by(db, 'enrollments', data.enrollmentId);
  const r = { id: U.id('rq'), type, status: 'Chờ duyệt', studentId: e.studentId, data, reason: reason.trim(), createdBy: u.name, createdAt: U.today() };
  db.requests.push(r); return r;
}); };
R.approve = (db, u, rid, note) => { R.need(u, 'approve'); return R.atomic(db, () => {
  const r = R.must(db, 'requests', rid, 'yêu cầu');
  if (r.status !== 'Chờ duyệt') fail('Yêu cầu đã được xử lý.');
  const ctx = R.V[r.type](db, r.data, r); R.X[r.type](db, ctx, r);
  Object.assign(r, { status: 'Đã duyệt', decidedBy: u.name, decidedAt: U.today(), note: note || '' }); return r;
}); };
R.reject = (db, u, rid, note) => { R.need(u, 'approve');
  const r = R.must(db, 'requests', rid, 'yêu cầu');
  if (r.status !== 'Chờ duyệt') fail('Yêu cầu đã được xử lý.');
  if (!String(note || '').trim()) fail('Nhập lý do từ chối.');
  Object.assign(r, { status: 'Từ chối', decidedBy: u.name, decidedAt: U.today(), note }); return r; };

R.resume = (db, u, rvId, classId) => { R.need(u, 'enroll'); return R.atomic(db, () => {
  const rv = R.must(db, 'reservations', rvId, 'phiếu bảo lưu');
  if (rv.status !== 'Đang bảo lưu') fail('Phiếu bảo lưu này không còn hiệu lực.');
  if (rv.expires < U.today()) { rv.status = 'Hết hạn'; throw new RuleError('Phiếu bảo lưu đã hết hạn ' + U.dmy(rv.expires) + '.'); }
  const old = R.by(db, 'enrollments', rv.enrollmentId), oc = R.by(db, 'classes', old.classId), nc = R.must(db, 'classes', classId, 'lớp');
  if (nc.courseId !== oc.courseId) fail('Học lại phải chọn lớp cùng khóa học đã bảo lưu.');
  const n = R._enroll(db, rv.studentId, classId); n.resumedFrom = rv.id;
  R._credit(db, n, rv.credit, 'Học phí bảo lưu');
  rv.status = 'Đã học lại'; rv.resumedTo = n.id; return n;
}); };

/* ---------- điểm danh ---------- */
R.attendees = (db, sessionId) => {
  const s = R.must(db, 'sessions', sessionId, 'buổi học');
  const rows = R.confirmed(db, s.classId).map((e) => ({ e, makeup: null }));
  db.requests.filter((r) => r.type === 'makeup' && r.status === 'Đã duyệt' && r.data.targetSessionId === sessionId)
    .forEach((r) => rows.push({ e: R.by(db, 'enrollments', r.data.enrollmentId), makeup: r }));
  return rows;
};
R.markAttendance = (db, u, sessionId, entries) => { R.need(u, 'attend'); return R.atomic(db, () => {
  const s = R.must(db, 'sessions', sessionId, 'buổi học');
  if (u.role === 'teacher' && s.teacherId !== u.teacherId) fail('Bạn chỉ điểm danh được buổi học do mình phụ trách.');
  if (s.date > U.today()) fail('Chưa đến ngày học, chưa thể điểm danh.');
  const allowed = R.attendees(db, sessionId);
  for (const en of entries) {
    const row = allowed.find((a) => a.e.id === en.enrollmentId); if (!row) fail('Học viên không thuộc buổi học này.');
    if (!['Có mặt', 'Vắng'].includes(en.status)) fail('Trạng thái điểm danh không hợp lệ.');
    let a = db.attendance.find((x) => x.sessionId === sessionId && x.enrollmentId === en.enrollmentId);
    if (!a) { a = { id: U.id('at'), sessionId, enrollmentId: en.enrollmentId, studentId: row.e.studentId }; db.attendance.push(a); }
    a.status = en.status; if (row.makeup) { a.makeupReq = row.makeup.id; row.makeup.data.done = en.status === 'Có mặt'; }
  }
  s.held = true; return s;
}); };

/* ---------- báo cáo ---------- */
R.report = (db) => {
  const classOf = (eid) => { const e = R.by(db, 'enrollments', eid); return e && R.by(db, 'classes', e.classId); };
  const byBranch = db.branches.map((b) => {
    const cls = db.classes.filter((c) => c.branchId === b.id && c.status !== 'Đã hủy');
    const ens = db.enrollments.filter((e) => LIVE.includes(e.status) && cls.some((c) => c.id === e.classId));
    const revenue = db.payments.filter((p) => p.type === 'Thu' && (classOf(p.enrollmentId) || {}).branchId === b.id).reduce((s, p) => s + p.amount, 0);
    const receivable = ens.reduce((s, e) => s + R.due(db, e), 0);
    return { b, classes: cls.length, running: cls.filter((c) => c.status === 'Đang học').length, students: ens.length, revenue, receivable };
  });
  const byCourse = db.courses.map((co) => {
    const cls = db.classes.filter((c) => c.courseId === co.id && c.status !== 'Đã hủy');
    const students = db.enrollments.filter((e) => LIVE.includes(e.status) && cls.some((c) => c.id === e.classId)).length;
    return { co, classes: cls.length, students };
  });
  const att = db.attendance.length ? db.attendance.filter((a) => a.status === 'Có mặt').length / db.attendance.length : null;
  return { byBranch, byCourse, attRate: att };
};

export { R, U, CFG, RuleError, fail, LIVE };
