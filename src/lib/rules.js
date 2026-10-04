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
  holdDays: 7,         // giữ chỗ tối đa 7 ngày cho đăng ký chưa đủ mức xác nhận ở lớp chưa khai giảng; quá hạn tự hủy và hoàn tiền vào số dư
  attendanceEditDays: 7, // giáo viên sửa điểm danh trong 7 ngày kể từ buổi học; sau đó chỉ Quản lý đào tạo và phải ghi lý do
  termMonths: 3,       // đợt đào tạo kéo dài đúng 3 tháng (lớp mở trong đợt được phép kết thúc ở đợt sau)
};
/* Chính sách tiền khi bảo lưu / chuyển lớp / hủy đăng ký giữa chừng (giả định):
 *   tiền được giữ lại = tiền đã đóng − giá trị các buổi đã học (học phí × số buổi đã học / tổng số buổi), tối thiểu 0.
 * Học bù: giữ chỗ ngay khi gửi yêu cầu. Học viên bảo lưu/chuyển/hủy thì các buổi học bù đã xin tự hủy. */
const LIVE = ['Chờ đóng phí', 'Đã xác nhận', 'Hoàn thành']; // trạng thái chiếm chỗ trong lớp
const PERMS = {
  master: ['manager'], klass: ['manager'], approve: ['manager'],
  student: ['manager', 'enroll'], enroll: ['manager', 'enroll'], request: ['manager', 'enroll'], lead: ['manager', 'enroll'],
  pay: ['manager', 'accountant'], report: ['manager', 'accountant'], attend: ['manager', 'teacher'],
};

const R = { CFG, LIVE, PERMS };
R.COLLECTIBLE = ['Chờ đóng phí', 'Đã xác nhận', 'Hoàn thành']; // đăng ký còn được thu học phí (kể cả đã hoàn thành mà còn nợ)
R.METHODS = ['Tiền mặt', 'Chuyển khoản', 'Số dư'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const validIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && U.iso(U.parse(s)) === s;

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
R.paid = (db, eid) => db.payments.filter((p) => p.enrollmentId === eid && !p.voided).reduce((s, p) => s + p.amount, 0);
R.migrate = (db) => { ['ledger', 'audit'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; }); return db; }; // bảng thêm về sau
/* Mọi thay đổi số dư học viên đều ghi vào sổ số dư (ledger) để có lịch sử */
R._balance = (db, studentId, delta, type, note, by, ref) => {
  const st = R.must(db, 'students', studentId, 'học viên'); R.migrate(db);
  st.balance = (st.balance || 0) + delta;
  db.ledger.push({ id: U.id('lg'), studentId, date: U.today(), amount: delta, type, note: note || '', by: by || '', ref: ref || '', balanceAfter: st.balance });
};
/* Giá trị các buổi đã học của một đăng ký, và số tiền còn được giữ lại khi rời lớp giữa chừng */
R.studied = (db, e) => { const total = R.sessions(db, e.classId).length; return total ? Math.round(e.fee * R.held(db, e.classId) / total) : 0; };
R.refundable = (db, e) => Math.max(0, R.paid(db, e.id) - R.studied(db, e));
/* Hủy các yêu cầu học bù còn hiệu lực của một đăng ký (khi đăng ký bảo lưu/chuyển/hủy) */
R._dropMakeups = (db, eid, why) => { for (const r of db.requests) if (r.type === 'makeup' && ['Chờ duyệt', 'Đã duyệt'].includes(r.status) && r.data.enrollmentId === eid) { r.status = 'Đã hủy'; r.note = why; } };
R.due = (db, e) => Math.max(0, e.fee - R.paid(db, e.id));
R.live = (db, cid) => db.enrollments.filter((e) => e.classId === cid && LIVE.includes(e.status));
R.confirmed = (db, cid) => db.enrollments.filter((e) => e.classId === cid && (e.status === 'Đã xác nhận' || e.status === 'Hoàn thành'));
R.sessions = (db, cid) => db.sessions.filter((s) => s.classId === cid).sort((a, b) => a.no - b.no);
R.held = (db, cid) => R.sessions(db, cid).filter((s) => s.held).length;
R.classLabel = (db, c) => c ? c.code : '';
R.scheduleText = (c) => c && c.weekdays && c.weekdays.length ? `${c.weekdays.map((d) => U.DOW[d]).join(', ')} · ${c.start}-${c.end}` : 'Chưa xếp lịch';

/* ---------- kiểm tra trùng lịch ---------- */
const overlap = (a, b) => a.date === b.date && a.start < b.end && b.start < a.end;

R.resourceConflicts = (db, sessions, roomId, teacherId, excludeClassId, excludeSessionId) => {
  const out = [], room = R.by(db, 'rooms', roomId), tch = R.by(db, 'teachers', teacherId);
  for (const t of sessions) for (const s of db.sessions) {
    if (s.classId === excludeClassId || s.id === excludeSessionId || !overlap(s, t)) continue;
    const c = R.by(db, 'classes', s.classId);
    if (s.roomId === roomId) out.push(`phòng ${room.name} đã có lớp ${c ? c.code : '?'} ngày ${U.dmy(t.date)} (${s.start}-${s.end})`);
    if (s.teacherId === teacherId) out.push(`giáo viên ${tch.name} đã dạy lớp ${c ? c.code : '?'} ngày ${U.dmy(t.date)} (${s.start}-${s.end})`);
  }
  return [...new Set(out)];
};

/* Các khoảng thời gian học viên đã bận: buổi của các lớp đang học + buổi học bù đã/đang xin */
R.studentBusy = (db, studentId, { excludeEid, excludeClass, excludeReq } = {}) => {
  const out = [];
  for (const e of db.enrollments) {
    if (e.studentId !== studentId || !LIVE.includes(e.status) || e.id === excludeEid || e.classId === excludeClass) continue;
    const c = R.by(db, 'classes', e.classId);
    for (const s of R.sessions(db, e.classId)) out.push({ ...s, label: `lớp ${c.code}` });
  }
  for (const r of db.requests) {
    if (r.type !== 'makeup' || r.studentId !== studentId || r.id === excludeReq || !['Chờ duyệt', 'Đã duyệt'].includes(r.status)) continue;
    const s = R.by(db, 'sessions', r.data.targetSessionId); if (!s) continue;
    out.push({ ...s, label: `buổi học bù lớp ${R.by(db, 'classes', s.classId).code}` });
  }
  return out;
};
R.studentConflictWith = (db, studentId, sessions, opts) => {
  const busy = R.studentBusy(db, studentId, opts);
  for (const t of sessions) { const s = busy.find((x) => overlap(x, t)); if (s) return `Học viên trùng lịch với ${s.label} ngày ${U.dmy(t.date)} (${s.start}-${s.end}).`; }
  return null;
};
R.studentConflict = (db, studentId, classId, excludeEid) => R.studentConflictWith(db, studentId, R.sessions(db, classId), { excludeEid, excludeClass: classId });

/* ---------- lớp học & lịch ---------- */
/* Mã lớp = <khóa>-<chi nhánh>-<đợt>-<số thứ tự>; số thứ tự = lớn nhất đã dùng + 1 nên không bao giờ trùng dù có xóa/sửa */
const classCode = (db, course, br, term, selfId) => {
  const prefix = `${course.code}-${br.code}-${term.code}-`;
  const max = db.classes.filter((c) => c.id !== selfId && c.code.startsWith(prefix)).reduce((m, c) => Math.max(m, parseInt(c.code.slice(prefix.length), 10) || 0), 0);
  return prefix + String(max + 1).padStart(2, '0');
};
R.createClass = (db, u, p) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const course = R.must(db, 'courses', p.courseId, 'khóa học'), br = R.must(db, 'branches', p.branchId, 'chi nhánh'), term = R.must(db, 'terms', p.termId, 'đợt đào tạo');
  const c = { id: U.id('cl'), code: classCode(db, course, br, term, null), courseId: course.id, branchId: br.id, termId: term.id, status: 'Nháp', weekdays: [], start: '', end: '', roomId: '', teacherId: '', startDate: '' };
  db.classes.push(c); return c;
}); };

R.setSchedule = (db, u, classId, p) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', classId, 'lớp'), course = R.by(db, 'courses', c.courseId), term = R.by(db, 'terms', c.termId);
  if (!['Nháp', 'Mở đăng ký'].includes(c.status)) fail('Chỉ sửa được lịch khi lớp ở trạng thái Nháp hoặc Mở đăng ký.');
  const wd = [...new Set((p.weekdays || []).map(Number))];
  if (!wd.length) fail('Chọn ít nhất một ngày học trong tuần.');
  if (wd.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) fail('Ngày học trong tuần không hợp lệ.');
  if (!TIME_RE.test(p.start || '') || !TIME_RE.test(p.end || '')) fail('Giờ học phải theo định dạng HH:mm (00:00–23:59).');
  if (p.start >= p.end) fail('Giờ học không hợp lệ (giờ kết thúc phải sau giờ bắt đầu).');
  if (!Number.isInteger(course.sessions) || course.sessions < 1 || course.sessions > 200) fail('Số buổi của khóa học không hợp lệ.');
  if (!validIso(p.startDate)) fail('Ngày khai giảng không hợp lệ.');
  const room = R.must(db, 'rooms', p.roomId, 'phòng học'), tch = R.must(db, 'teachers', p.teacherId, 'giáo viên');
  if (room.branchId !== c.branchId) fail('Phòng học không thuộc chi nhánh của lớp.');
  if (tch.status !== 'Đang dạy') fail('Giáo viên này hiện không nhận lớp.');
  if (p.startDate < term.start || p.startDate > term.end) fail(`Ngày khai giảng phải nằm trong ${term.name} (${U.dmy(term.start)} – ${U.dmy(term.end)}).`);
  const list = []; let d = p.startDate;
  while (list.length < course.sessions) { if (wd.includes(U.dow(d))) list.push(d); d = U.addDays(d, 1); }
  const ss = list.map((date, i) => ({ id: U.id('ss'), classId, no: i + 1, date, start: p.start, end: p.end, roomId: room.id, teacherId: tch.id, held: false }));
  const cf = R.resourceConflicts(db, ss, room.id, tch.id, classId);
  if (cf.length) fail('Không thể lưu lịch vì trùng: ' + cf.slice(0, 3).join('; ') + (cf.length > 3 ? ` … (và ${cf.length - 3} xung đột khác)` : '') + '.');
  for (const e of R.live(db, classId)) { // đổi lịch không được làm học viên đã ghi danh bị trùng lịch
    const msg = R.studentConflictWith(db, e.studentId, ss, { excludeClass: classId });
    if (msg) fail(`Không thể đổi lịch vì học viên ${R.by(db, 'students', e.studentId).name} sẽ bị trùng lịch. ${msg}`);
  }
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

R.finishClass = (db, u, classId, reason) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', classId, 'lớp');
  if (c.status !== 'Đang học') fail('Chỉ kết thúc lớp đang học.');
  const total = R.sessions(db, classId).length, done = R.held(db, classId);
  if (!done) fail('Lớp chưa tổ chức buổi học nào nên chưa thể kết thúc.');
  if (done < total) {
    if (!String(reason || '').trim()) fail(`Lớp mới học ${done}/${total} buổi. Hãy nhập lý do nếu muốn kết thúc sớm.`);
    c.finishNote = String(reason).trim();
  }
  c.status = 'Kết thúc';
  db.enrollments.filter((e) => e.classId === classId && e.status === 'Đã xác nhận').forEach((e) => { e.status = 'Hoàn thành'; });
  return c;
}); };

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
  Object.assign(c, { courseId: course.id, branchId: br.id, termId: term.id });
  if (changed) c.code = classCode(db, course, br, term, id); // không đổi nhóm thì giữ nguyên mã
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

/* Hoàn tiền mặt/chuyển khoản từ số dư của học viên */
R.refundBalance = (db, u, studentId, { amount, method, note }) => { R.need(u, 'pay'); return R.atomic(db, () => {
  const st = R.must(db, 'students', studentId, 'học viên'); amount = Math.round(Number(amount));
  if (!['Tiền mặt', 'Chuyển khoản'].includes(method)) fail('Hình thức hoàn tiền không hợp lệ.');
  if (!Number.isFinite(amount) || amount <= 0) fail('Số tiền hoàn phải lớn hơn 0.');
  if (amount > (st.balance || 0)) fail(`Số tiền hoàn vượt quá số dư của học viên (${U.vnd(st.balance || 0)}).`);
  R._balance(db, studentId, -amount, 'Hoàn tiền', `${method}${note ? ' – ' + note : ''}`, u.name);
  return `Đã hoàn ${U.vnd(amount)} cho ${st.name}`;
}); };

/* Hủy phiếu thu (không xóa, giữ lịch sử và lý do) */
R.voidPayment = (db, u, pid, reason) => { R.need(u, 'pay'); return R.atomic(db, () => {
  const p = R.must(db, 'payments', pid, 'phiếu thu');
  if (p.voided) fail('Phiếu thu này đã bị hủy trước đó.');
  if (!['Thu', 'Trừ số dư'].includes(p.type)) fail('Chỉ hủy được phiếu thu tiền mới hoặc phiếu trừ số dư.');
  if (!String(reason || '').trim()) fail('Nhập lý do hủy phiếu thu.');
  const e = R.must(db, 'enrollments', p.enrollmentId, 'đăng ký học');
  if (!R.COLLECTIBLE.includes(e.status)) fail('Đăng ký đã bảo lưu/chuyển lớp/hủy nên không thể hủy phiếu thu.');
  Object.assign(p, { voided: true, voidReason: String(reason).trim(), voidBy: u.name, voidAt: U.today() });
  if (p.type === 'Trừ số dư') R._balance(db, p.studentId, p.amount, 'Hoàn lại do hủy phiếu thu', p.no, u.name, e.id);
  const c = R.by(db, 'classes', e.classId);
  if (e.status === 'Đã xác nhận' && c.status === 'Mở đăng ký' && R.paid(db, e.id) < e.fee * CFG.minPaidPct) e.status = 'Chờ đóng phí';
  return `Đã hủy phiếu thu ${p.no}`;
}); };

/* Đổi ngày/giờ/phòng/giáo viên của MỘT buổi học (kiểm tra lại giáo viên, phòng, học viên và học bù liên quan; lưu lịch sử) */
R.rescheduleSession = (db, u, sid, p) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const s = R.must(db, 'sessions', sid, 'buổi học'), c = R.by(db, 'classes', s.classId);
  if (!['Mở đăng ký', 'Đang học'].includes(c.status)) fail('Chỉ đổi buổi học của lớp đang mở đăng ký hoặc đang học.');
  if (s.held) fail('Buổi học đã diễn ra, không thể đổi.');
  if (!String(p.reason || '').trim()) fail('Nhập lý do đổi buổi học.');
  if (!validIso(p.date)) fail('Ngày học không hợp lệ.');
  if (p.date < U.today()) fail('Không thể đổi sang ngày đã qua.');
  if (!TIME_RE.test(p.start || '') || !TIME_RE.test(p.end || '') || p.start >= p.end) fail('Giờ học phải theo định dạng HH:mm và giờ kết thúc sau giờ bắt đầu.');
  const room = R.must(db, 'rooms', p.roomId, 'phòng học'), tch = R.must(db, 'teachers', p.teacherId, 'giáo viên');
  if (room.branchId !== c.branchId) fail('Phòng học không thuộc chi nhánh của lớp.');
  if (tch.status !== 'Đang dạy') fail('Giáo viên này hiện không nhận lớp.');
  const t = { date: p.date, start: p.start, end: p.end };
  if (R.sessions(db, c.id).some((x) => x.id !== s.id && overlap(x, t))) fail('Trùng với một buổi khác của chính lớp này.');
  const cf = R.resourceConflicts(db, [t], room.id, tch.id, null, s.id);
  if (cf.length) fail('Không thể đổi buổi học vì trùng: ' + cf.slice(0, 3).join('; ') + '.');
  for (const e of R.live(db, c.id)) { // học viên của lớp
    const m = R.studentConflictWith(db, e.studentId, [t], { excludeClass: c.id });
    if (m) fail(`Học viên ${R.by(db, 'students', e.studentId).name} sẽ bị trùng lịch. ${m}`);
  }
  for (const r of db.requests) { // học viên học bù vào buổi này
    if (r.type !== 'makeup' || r.data.targetSessionId !== s.id || !['Chờ duyệt', 'Đã duyệt'].includes(r.status)) continue;
    const m = R.studentConflictWith(db, r.studentId, [t], { excludeReq: r.id });
    if (m) fail(`Học viên học bù ${R.by(db, 'students', r.studentId).name} sẽ bị trùng lịch. ${m}`);
  }
  s.history = (s.history || []).concat({ at: U.today(), by: u.name, reason: String(p.reason).trim(), from: { date: s.date, start: s.start, end: s.end, roomId: s.roomId, teacherId: s.teacherId } });
  Object.assign(s, { date: p.date, start: p.start, end: p.end, roomId: room.id, teacherId: tch.id });
  const all = R.sessions(db, c.id); c.endDate = all.map((x) => x.date).sort().pop();
  return `Đã đổi buổi ${s.no} của lớp ${c.code} sang ${U.dmy(p.date)} ${p.start}-${p.end}`;
}); };

R.cancelClass = (db, u, classId) => { R.need(u, 'klass'); return R.atomic(db, () => {
  const c = R.must(db, 'classes', classId, 'lớp');
  if (!['Nháp', 'Mở đăng ký'].includes(c.status)) fail('Chỉ hủy được lớp chưa khai giảng.');
  for (const e of db.enrollments.filter((x) => x.classId === classId && LIVE.includes(x.status))) { // tiền đã đóng -> số dư học viên
    const back = R.paid(db, e.id); if (back > 0) R._balance(db, e.studentId, back, 'Hoàn từ hủy lớp', `Lớp ${c.code}`, u.name, e.id);
    e.status = 'Đã hủy'; e.cancelNote = 'Lớp bị hủy'; R._dropMakeups(db, e.id, 'Lớp bị hủy');
  }
  db.sessions = db.sessions.filter((s) => s.classId !== classId);
  c.status = 'Đã hủy'; return c;
}); };

/* ---------- đăng ký học & học phí ---------- */
/* Kiểm tra điều kiện đưa học viên vào lớp – dùng chung cho ghi danh, chuyển lớp, học lại (excludeEid = đăng ký cũ được bỏ qua) */
R.enrollCheck = (db, studentId, classId, excludeEid) => {
  const st = R.must(db, 'students', studentId, 'học viên'), c = R.must(db, 'classes', classId, 'lớp');
  if (st.status !== 'Hoạt động') fail('Hồ sơ học viên đang ngừng hoạt động.');
  if (!['Mở đăng ký', 'Đang học'].includes(c.status)) fail('Lớp chưa mở đăng ký hoặc đã đóng đăng ký.');
  if (c.status === 'Đang học' && R.held(db, classId) > CFG.lateJoin) fail(`Lớp đã học quá ${CFG.lateJoin} buổi, không nhận thêm học viên.`);
  const live = R.live(db, classId);
  if (live.some((e) => e.studentId === studentId && e.id !== excludeEid)) fail('Học viên đã đăng ký lớp này.');
  if (live.length >= CFG.maxStudents) fail(`Lớp đã hết chỗ (đủ sĩ số tối đa ${CFG.maxStudents}).`);
  const dup = db.enrollments.find((e) => e.id !== excludeEid && e.studentId === studentId && LIVE.includes(e.status) && (() => { const o = R.by(db, 'classes', e.classId); return o.courseId === c.courseId && o.termId === c.termId; })());
  if (dup) fail('Học viên đã đăng ký khóa học này trong đợt này ở lớp khác.');
  const cf = R.studentConflict(db, studentId, classId, excludeEid); if (cf) fail(cf);
  return { st, c };
};
R._enroll = (db, studentId, classId) => {
  const { c } = R.enrollCheck(db, studentId, classId, null);
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
  if (!R.COLLECTIBLE.includes(e.status)) fail('Đăng ký này không còn ở trạng thái thu phí.');
  if (!R.METHODS.includes(method)) fail('Hình thức thanh toán không hợp lệ.');
  if (!Number.isFinite(amount) || !(amount > 0)) fail('Số tiền phải là số lớn hơn 0.');
  if (amount > R.due(db, e)) fail(`Số tiền vượt quá khoản còn phải đóng (${U.vnd(R.due(db, e))}).`);
  if (method === 'Số dư') {
    const st = R.by(db, 'students', e.studentId);
    if (amount > st.balance) fail(`Số dư của học viên không đủ (${U.vnd(st.balance)}).`);
    R._balance(db, st.id, -amount, 'Trừ số dư học phí', `Lớp ${R.by(db, 'classes', e.classId).code}`, u.name, e.id); return R._pay(db, e, amount, method, 'Trừ số dư', note, u.name);
  }
  return R._pay(db, e, amount, method, 'Thu', note, u.name);
}); };
R._credit = (db, e, amount, note) => { // đưa khoản tiền đã có vào đăng ký mới; phần dư vào số dư học viên
  const use = Math.min(amount, e.fee);
  if (use > 0) R._pay(db, e, use, 'Chuyển nội bộ', 'Chuyển nội bộ', note, 'Hệ thống');
  if (amount > use) R._balance(db, e.studentId, amount - use, 'Phần dư cộng vào số dư', note, 'Hệ thống', e.id);
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
    R.enrollCheck(db, e.studentId, to.id, e.id); // cùng luật với ghi danh: học viên hoạt động, lớp mở, còn chỗ, không trùng khóa/đợt, không trùng lịch
    return { e, from, to, fc, tc, diff: tc.fee - e.fee };
  },
  cancel(db, d) {
    const e = R.must(db, 'enrollments', d.enrollmentId, 'đăng ký học');
    if (!['Chờ đóng phí', 'Đã xác nhận'].includes(e.status)) fail('Chỉ hủy được đăng ký đang chờ đóng phí hoặc đang học.');
    const c = R.by(db, 'classes', e.classId);
    if (!['Mở đăng ký', 'Đang học'].includes(c.status)) fail('Lớp không còn ở trạng thái cho phép hủy đăng ký.');
    return { e, c, paid: R.paid(db, e.id), studied: R.studied(db, e), refund: R.refundable(db, e) };
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
    const seats = room.capacity - R.live(db, tc.id).length - mine.filter((x) => x.data.targetSessionId === target.id).length; // giữ chỗ ngay khi gửi yêu cầu (chờ duyệt cũng tính)
    if (seats <= 0) fail('Buổi học bù đã hết chỗ.');
    const cf = R.studentConflictWith(db, e.studentId, [target], { excludeReq: r && r.id }); // gồm cả các buổi học bù khác đã/đang xin
    if (cf) fail(cf);
    return { e, missed, target, mc, tc };
  },
};

/* Các buổi vắng của một đăng ký mà chưa có yêu cầu học bù (đang chờ/đã duyệt) – chỉ tính yêu cầu của chính đăng ký này */
R.makeupMissed = (db, eid) => {
  const used = db.requests.filter((r) => r.type === 'makeup' && ['Chờ duyệt', 'Đã duyệt'].includes(r.status) && r.data.enrollmentId === eid).map((r) => r.data.missedSessionId);
  return db.attendance.filter((a) => a.enrollmentId === eid && a.status === 'Vắng' && !used.includes(a.sessionId)).map((a) => R.by(db, 'sessions', a.sessionId)).filter(Boolean);
};

R.X = { // thực thi sau khi duyệt
  reserve(db, ctx, r) {
    const { e, total, done } = ctx, credit = R.refundable(db, e); // tiền đã đóng trừ giá trị buổi đã học
    e.status = 'Bảo lưu'; R._dropMakeups(db, e.id, 'Học viên bảo lưu');
    const rv = { id: U.id('rv'), studentId: e.studentId, enrollmentId: e.id, credit, createdAt: U.today(), expires: U.addMonths(U.today(), CFG.reserveMonths), status: 'Đang bảo lưu' };
    db.reservations.push(rv); r.result = `Giữ lại ${U.vnd(credit)} (còn ${total - done}/${total} buổi), hạn đến ${U.dmy(rv.expires)}.`;
  },
  transfer(db, ctx, r) {
    const { e, from, to, tc, diff } = ctx, paidAll = R.paid(db, e.id), paid = R.refundable(db, e); // chỉ chuyển phần tiền chưa dùng cho các buổi đã học
    e.status = 'Đã chuyển lớp'; e.movedTo = to.id; R._dropMakeups(db, e.id, 'Học viên chuyển lớp');
    const n = { id: U.id('en'), studentId: e.studentId, classId: to.id, fee: tc.fee, status: 'Chờ đóng phí', createdAt: U.today(), transferredFrom: e.id };
    db.enrollments.push(n); R._credit(db, n, paid, 'Chuyển từ lớp ' + from.code);
    const after = R.due(db, n);
    r.result = `${from.code} → ${to.code}. Chênh lệch ${diff >= 0 ? '+' : '−'}${U.vnd(Math.abs(diff))}${paidAll > paid ? ` (đã trừ ${U.vnd(paidAll - paid)} giá trị buổi đã học)` : ''}; ` + (after > 0 ? `học viên còn phải đóng ${U.vnd(after)}.` : 'không phải đóng thêm' + (paid > tc.fee ? `, ${U.vnd(paid - tc.fee)} được cộng vào số dư.` : '.'));
  },
  cancel(db, ctx, r) {
    const { e, c, paid, studied, refund } = ctx;
    e.status = 'Đã hủy'; e.cancelNote = 'Hủy đăng ký theo yêu cầu'; R._dropMakeups(db, e.id, 'Đăng ký đã hủy');
    if (refund > 0) R._balance(db, e.studentId, refund, 'Hoàn từ hủy đăng ký', `Lớp ${c.code}`, 'Duyệt yêu cầu hủy', e.id);
    r.result = `Hủy đăng ký lớp ${c.code}. Đã đóng ${U.vnd(paid)}, trừ giá trị buổi đã học ${U.vnd(studied)}, hoàn ${U.vnd(refund)} vào số dư học viên.`;
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
  if (rv.expires < U.today()) fail('Phiếu bảo lưu đã hết hạn ' + U.dmy(rv.expires) + '.'); // trạng thái Hết hạn do R.syncExpiry ghi nhận, không sửa trong giao dịch bị hủy
  const old = R.by(db, 'enrollments', rv.enrollmentId), oc = R.by(db, 'classes', old.classId), nc = R.must(db, 'classes', classId, 'lớp');
  if (nc.courseId !== oc.courseId) fail('Học lại phải chọn lớp cùng khóa học đã bảo lưu.');
  const n = R._enroll(db, rv.studentId, classId); n.resumedFrom = rv.id;
  R._credit(db, n, rv.credit, 'Học phí bảo lưu');
  rv.status = 'Đã học lại'; rv.resumedTo = n.id; return n;
}); };

/* Trạng thái bảo lưu hiển thị: tính từ hạn; syncExpiry ghi nhận vào dữ liệu (gọi ngoài giao dịch nghiệp vụ, vd khi mở ứng dụng) */
R.rvStatus = (rv) => (rv.status === 'Đang bảo lưu' && rv.expires < U.today() ? 'Hết hạn' : rv.status);
R.syncExpiry = (db) => { let n = 0; for (const rv of db.reservations) { const s = R.rvStatus(rv); if (s !== rv.status) { rv.status = s; n++; } } return n; };

/* Giữ chỗ hết hạn: đăng ký chưa đủ mức xác nhận ở lớp chưa khai giảng quá CFG.holdDays ngày thì tự hủy, tiền đã đóng (nếu có) vào số dư */
R.expireHolds = (db) => {
  let n = 0; const today = U.today();
  for (const e of db.enrollments) {
    if (e.status !== 'Chờ đóng phí') continue;
    const c = R.by(db, 'classes', e.classId); if (!c || c.status !== 'Mở đăng ký') continue;
    if (U.addDays(e.createdAt || today, CFG.holdDays) >= today) continue;
    const paid = R.paid(db, e.id); if (paid > 0) R._balance(db, e.studentId, paid, 'Hoàn từ đăng ký quá hạn giữ chỗ', `Lớp ${c.code}`, 'Hệ thống', e.id);
    e.status = 'Đã hủy'; e.cancelNote = `Quá ${CFG.holdDays} ngày giữ chỗ nhưng chưa đóng đủ ${CFG.minPaidPct * 100}% học phí`; R._dropMakeups(db, e.id, 'Đăng ký đã hủy'); n++;
  }
  return n;
};
R.syncAuto = (db) => { R.migrate(db); return { reservations: R.syncExpiry(db), holds: R.expireHolds(db) }; };

/* ---------- điểm danh ---------- */
/* Danh sách điểm danh của một buổi: (1) người đã có bản ghi điểm danh buổi này – dù sau đó chuyển lớp/bảo lưu;
 * (2) học viên đang học trong lớp và đã ghi danh từ ngày buổi học trở về trước; (3) học viên được duyệt học bù vào buổi này. */
R.attendees = (db, sessionId) => {
  const s = R.must(db, 'sessions', sessionId, 'buổi học'), rows = [], seen = new Set();
  const add = (e, makeup) => { if (e && !seen.has(e.id)) { seen.add(e.id); rows.push({ e, makeup }); } };
  db.attendance.filter((a) => a.sessionId === sessionId && !a.makeupReq).forEach((a) => add(R.by(db, 'enrollments', a.enrollmentId), null));
  R.confirmed(db, s.classId).filter((e) => (e.createdAt || '') <= s.date).forEach((e) => add(e, null));
  db.requests.filter((r) => r.type === 'makeup' && r.status === 'Đã duyệt' && r.data.targetSessionId === sessionId)
    .forEach((r) => add(R.by(db, 'enrollments', r.data.enrollmentId), r));
  return rows;
};
R.markAttendance = (db, u, sessionId, entries, reason) => { R.need(u, 'attend'); return R.atomic(db, () => {
  const s = R.must(db, 'sessions', sessionId, 'buổi học');
  const cls = R.by(db, 'classes', s.classId);
  if (u.role === 'teacher' && s.teacherId !== u.teacherId) fail('Bạn chỉ điểm danh được buổi học do mình phụ trách.');
  if (cls.status === 'Kết thúc') { if (u.role !== 'manager') fail('Lớp đã kết thúc: chỉ Quản lý đào tạo được sửa điểm danh.'); }
  else if (cls.status !== 'Đang học') fail('Lớp chưa được xác nhận mở (hoặc đã hủy) nên chưa thể điểm danh.');
  if (s.date > U.today()) fail('Chưa đến ngày học, chưa thể điểm danh.');
  if (s.held && s.date < U.addDays(U.today(), -CFG.attendanceEditDays)) { // sửa điểm danh quá hạn
    if (u.role === 'teacher') fail(`Đã quá ${CFG.attendanceEditDays} ngày kể từ buổi học, chỉ Quản lý đào tạo được sửa điểm danh.`);
    if (!String(reason || '').trim()) fail('Sửa điểm danh quá hạn cần nhập lý do.');
  }
  const allowed = R.attendees(db, sessionId);
  for (const en of entries) {
    const row = allowed.find((a) => a.e.id === en.enrollmentId); if (!row) fail('Học viên không thuộc buổi học này.');
    if (!['Có mặt', 'Vắng'].includes(en.status)) fail('Trạng thái điểm danh không hợp lệ.');
    let a = db.attendance.find((x) => x.sessionId === sessionId && x.enrollmentId === en.enrollmentId);
    if (!a) { a = { id: U.id('at'), sessionId, enrollmentId: en.enrollmentId, studentId: row.e.studentId }; db.attendance.push(a); }
    if (a.status && a.status !== en.status) a.history = (a.history || []).concat({ at: U.today(), by: u.name, from: a.status, to: en.status, reason: String(reason || '') });
    a.status = en.status; if (row.makeup) { a.makeupReq = row.makeup.id; row.makeup.data.done = en.status === 'Có mặt'; }
  }
  s.held = true; return s;
}); };

/* ---------- danh mục: học viên, giáo viên, chi nhánh, phòng, khóa học, đợt ---------- */
/* f = [khóa, nhãn, kiểu]; kiểu: 's' bắt buộc, 'o' tùy chọn, 'c' mã tự sinh nếu trống, 'p' điện thoại, 'x' email bắt buộc, 'm' email tùy chọn,
 * 'd' ngày, mảng = liệt kê, {ref} = tham chiếu bảng khác, {n} = số */
R.MASTER = {
  students: { perm: 'student', pre: 'hv', init: { balance: 0, status: 'Hoạt động', level: 'A1' }, f: [['code', 'Mã học viên', 'c'], ['name', 'Họ và tên', 's'], ['dob', 'Ngày sinh', 'd'], ['phone', 'Điện thoại', 'p'], ['email', 'Email', 'm'], ['level', 'Trình độ', ['A1', 'A2', 'B1', 'B2', 'C1']], ['status', 'Trạng thái', ['Hoạt động', 'Ngừng']]] },
  teachers: { perm: 'master', pre: 'gv', init: { status: 'Đang dạy' }, f: [['code', 'Mã giáo viên', 'c'], ['name', 'Họ và tên', 's'], ['phone', 'Điện thoại', 'p'], ['email', 'Email', 'x'], ['specialty', 'Chuyên môn', 's'], ['status', 'Trạng thái', ['Đang dạy', 'Nghỉ']]] },
  branches: { perm: 'master', pre: 'br', f: [['code', 'Mã chi nhánh', 's'], ['name', 'Tên chi nhánh', 's'], ['address', 'Địa chỉ', 's'], ['phone', 'Điện thoại', 'p']] },
  rooms: { perm: 'master', pre: 'rm', f: [['branchId', 'Chi nhánh', { ref: 'branches' }], ['name', 'Tên phòng', 's'], ['capacity', 'Sức chứa', { n: { int: 1, min: CFG.maxStudents } }]] },
  courses: { perm: 'master', pre: 'co', f: [['code', 'Mã khóa', 's'], ['name', 'Tên khóa học', 's'], ['level', 'Cấp độ', { n: { int: 1, min: 0 } }], ['fee', 'Học phí', { n: { int: 1, min: 1 } }], ['sessions', 'Số buổi', { n: { int: 1, min: 1, max: 200 } }], ['desc', 'Mô tả', 'o']] },
  terms: { perm: 'master', pre: 'tm', f: [['code', 'Mã đợt', 's'], ['name', 'Tên đợt', 's'], ['start', 'Ngày bắt đầu', 'd'], ['end', 'Ngày kết thúc', 'd']] },
};
R.saveMaster = (db, u, col, id, raw) => {
  const M = R.MASTER[col]; if (!M) fail('Danh mục không hợp lệ.');
  R.need(u, M.perm);
  return R.atomic(db, () => {
    const old = id ? R.must(db, col, id, 'mục cần sửa') : null, o = {};
    for (const [k, label, type] of M.f) {
      let v = raw[k]; v = v == null ? '' : typeof v === 'string' ? v.trim() : v;
      if (type === 'o' || type === 'c' || type === 'm') { if (v && type === 'm' && !/^\S+@\S+\.\S+$/.test(v)) fail(`${label} không hợp lệ.`); o[k] = v; continue; }
      if (v === '') fail(`Vui lòng nhập ${label.toLowerCase()}.`);
      if (Array.isArray(type)) { if (!type.includes(v)) fail(`${label} không hợp lệ.`); }
      else if (type && type.ref) { if (!R.by(db, type.ref, v)) fail(`${label} không tồn tại.`); }
      else if (type && type.n) {
        v = Number(v); const { int, min, max } = type.n;
        if (!Number.isFinite(v) || (int && !Number.isInteger(v))) fail(`${label} phải là số${int ? ' nguyên' : ''}.`);
        if (min != null && v < min) fail(`${label} phải từ ${min} trở lên.`);
        if (max != null && v > max) fail(`${label} tối đa ${max}.`);
      }
      else if (type === 'd') { if (!validIso(v)) fail(`${label} không hợp lệ.`); }
      else if (type === 'p') { if (!/^[0-9+()\-. ]{8,16}$/.test(v) || v.replace(/\D/g, '').length < 8) fail(`${label} không hợp lệ.`); }
      else if (type === 'x') { if (!/^\S+@\S+\.\S+$/.test(v)) fail(`${label} không hợp lệ.`); }
      o[k] = v;
    }
    if (col === 'terms') {
      if (o.start >= o.end) fail('Ngày kết thúc phải sau ngày bắt đầu.');
      const expect = U.addDays(U.addMonths(o.start, CFG.termMonths), -1);
      if (o.end !== expect) fail(`Đợt đào tạo phải kéo dài đúng ${CFG.termMonths} tháng: bắt đầu ${U.dmy(o.start)} thì kết thúc ${U.dmy(expect)}.`);
    }
    if (M.f[0][0] === 'code') {
      if (!o.code) o.code = M.pre.toUpperCase() + String(db[col].length + 1).padStart(4, '0');
      if (db[col].some((x) => x.id !== id && x.code && x.code.toLowerCase() === o.code.toLowerCase())) fail('Mã này đã tồn tại.');
    }
    if (old) { // sửa mục đang được dùng: chặn thay đổi làm dữ liệu lớp/lịch không còn nhất quán
      const inClass = (key) => db.classes.some((c) => c[key] === id);
      if (col === 'rooms' && o.branchId !== old.branchId && (inClass('roomId') || db.sessions.some((s) => s.roomId === id))) fail('Phòng đang có lịch học nên không thể chuyển sang chi nhánh khác.');
      if (col === 'courses' && inClass('courseId') && (o.sessions !== old.sessions || o.level !== old.level || o.code !== old.code)) fail('Khóa học đã có lớp nên không thể đổi mã, cấp độ hoặc số buổi (chỉ đổi được tên, học phí, mô tả).');
      if (col === 'terms' && inClass('termId') && (o.start !== old.start || o.end !== old.end || o.code !== old.code)) fail('Đợt đào tạo đã có lớp nên không thể đổi mã hoặc thời gian.');
      if (col === 'branches' && inClass('branchId') && o.code !== old.code) fail('Chi nhánh đã có lớp nên không thể đổi mã.');
      if (col === 'teachers' && o.status === 'Nghỉ' && old.status !== 'Nghỉ' && db.sessions.some((s) => s.teacherId === id && !s.held && s.date >= U.today())) fail('Giáo viên còn buổi dạy sắp tới, hãy đổi lịch/giáo viên trước khi chuyển sang trạng thái Nghỉ.');
    }
    if (old) Object.assign(old, o); else db[col].push({ id: U.id(M.pre), ...(M.init || {}), ...o });
    return 'Đã lưu';
  });
};
R.isUsed = (db, col, id) => Object.keys(db).some((k) => k !== col && Array.isArray(db[k]) && db[k].some((x) => Object.entries(x).some(([key, v]) => key.endsWith('Id') && v === id)));
R.deleteMaster = (db, u, col, id) => {
  const M = R.MASTER[col]; if (!M) fail('Danh mục không hợp lệ.');
  R.need(u, M.perm);
  return R.atomic(db, () => {
    R.must(db, col, id, 'mục cần xóa');
    if (R.isUsed(db, col, id)) fail(col === 'students' ? 'Học viên đã có dữ liệu đăng ký – hãy đặt trạng thái "Ngừng" thay vì xóa.' : 'Mục này đang được sử dụng nên không thể xóa.');
    db[col] = db[col].filter((x) => x.id !== id); return 'Đã xóa';
  });
};

/* ---------- báo cáo ---------- */
R.report = (db, { termId, from, to } = {}) => {
  const inRange = (d) => (!from || d >= from) && (!to || d <= to);
  const classOf = (eid) => { const e = R.by(db, 'enrollments', eid); return e && R.by(db, 'classes', e.classId); };
  const okClass = (c) => c.status !== 'Đã hủy' && (!termId || c.termId === termId);
  const uniq = (ens) => new Set(ens.map((e) => e.studentId)).size;
  const byBranch = db.branches.map((b) => {
    const cls = db.classes.filter((c) => c.branchId === b.id && okClass(c));
    const ens = db.enrollments.filter((e) => LIVE.includes(e.status) && cls.some((c) => c.id === e.classId));
    const revenue = db.payments.filter((p) => p.type === 'Thu' && !p.voided && inRange(p.date) && (() => { const c = classOf(p.enrollmentId); return c && c.branchId === b.id && (!termId || c.termId === termId); })()).reduce((s, p) => s + p.amount, 0);
    const receivable = ens.reduce((s, e) => s + R.due(db, e), 0);
    return { b, classes: cls.length, running: cls.filter((c) => c.status === 'Đang học').length, students: ens.length, uniqueStudents: uniq(ens), revenue, receivable };
  });
  const byCourse = db.courses.map((co) => {
    const cls = db.classes.filter((c) => c.courseId === co.id && okClass(c));
    const ens = db.enrollments.filter((e) => LIVE.includes(e.status) && cls.some((c) => c.id === e.classId));
    return { co, classes: cls.length, students: ens.length, uniqueStudents: uniq(ens) };
  });
  const cs = db.classes.filter((c) => !termId || c.termId === termId).map((c) => c.id);
  const sess = new Set(db.sessions.filter((s) => cs.includes(s.classId) && inRange(s.date)).map((s) => s.id));
  const marks = db.attendance.filter((a) => sess.has(a.sessionId));
  const att = marks.length ? marks.filter((a) => a.status === 'Có mặt').length / marks.length : null;
  R.migrate(db);
  const refunded = db.ledger.filter((l) => l.type === 'Hoàn tiền' && inRange(l.date)).reduce((s, l) => s - l.amount, 0);
  return { byBranch, byCourse, attRate: att, refunded, uniqueStudents: uniq(db.enrollments.filter((e) => LIVE.includes(e.status) && db.classes.some((c) => c.id === e.classId && okClass(c)))) };
};

export { R, U, CFG, RuleError, fail, LIVE };
