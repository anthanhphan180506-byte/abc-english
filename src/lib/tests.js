import { R, U, CFG, RuleError } from './rules.js';
import { Seed } from './seed.js';
import { recordAudit } from './audit.js';
/* tests.js – ca kiểm thử bám theo luật nghiệp vụ (chạy trong trang "Kiểm thử" hoặc bằng node run-tests.js).
 * Mỗi ca chạy trên một CSDL mới, không ảnh hưởng dữ liệu thật. */
const Tests = (() => {
  const S = { id: 'sys', name: 'QL', role: 'manager' };
  const ENR = { id: 'e', name: 'GhiDanh', role: 'enroll' };
  const TCH = { id: 't', name: 'GV', role: 'teacher', teacherId: 'gv1' };
  const ACC = { id: 'a', name: 'KT', role: 'accountant' };

  const fresh = () => Seed.minimal();
  const sched = (db, o = {}) => ({ weekdays: [2, 4], start: '18:00', end: '19:30', roomId: 'br1r1', teacherId: 'gv1', startDate: db.terms[1].start, ...o });
  const mkClass = (db, { course = 'co2', branch = 'br1', open = true, s = {} } = {}) => {
    const c = R.createClass(db, S, { courseId: course, branchId: branch, termId: db.terms[1].id });
    R.setSchedule(db, S, c.id, sched(db, s)); if (open) R.openRegistration(db, S, c.id); return c;
  };
  const fill = (db, c, n, paid = true, from = 0) => {
    for (let i = from; i < from + n; i++) {
      const st = { id: 'x' + c.id + i, code: 'X', name: 'HV ' + i, dob: '2000-01-01', phone: '', email: '', level: 'A1', balance: 0, status: 'Hoạt động' };
      db.students.push(st);
      const e = R._enroll(db, st.id, c.id); if (paid) R.addPayment(db, ACC, e.id, { amount: e.fee, method: 'Tiền mặt' });
    }
  };
  const active = () => { const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id); return { db, c }; }; // lớp đang học có 10 học viên đã đóng đủ
  const throws = (fn, re) => { try { fn(); } catch (e) { if (!(e instanceof RuleError)) throw e; if (re && !re.test(e.message)) throw new Error('Sai thông báo lỗi: ' + e.message); return; } throw new Error('Đáng lẽ phải bị từ chối nhưng đã thành công.'); };
  const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'Giá trị'}: mong đợi ${b}, thực tế ${a}`); };

  // Chạy fn với "hôm nay" giả lập (để kiểm tra các lỗi phụ thuộc ngày)
  const RealDate = Date;
  const withDate = (iso, fn) => {
    const [y, m, d] = iso.split('-').map(Number), fixed = new RealDate(y, m - 1, d, 12).getTime();
    globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(fixed); } static now() { return fixed; } };
    try { return fn(); } finally { globalThis.Date = RealDate; }
  };

  const cases = [
    ['BR-01', 'Lớp thiếu 1 học viên so với mức tối thiểu: không được mở', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents - 1);
      throws(() => R.confirmOpen(db, S, c.id), /Chưa đủ sĩ số/); eq(c.status, 'Mở đăng ký');
    }],
    ['BR-01', 'Lớp vừa đủ mức tối thiểu: được mở', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents);
      R.confirmOpen(db, S, c.id); eq(c.status, 'Đang học');
    }],
    ['BR-01', 'Học viên chưa đóng tối thiểu 50% không được tính vào sĩ số mở lớp', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents - 1); fill(db, c, 1, false, 99);
      throws(() => R.confirmOpen(db, S, c.id), /Chưa đủ sĩ số/);
    }],
    ['BR-02', 'Đăng ký vượt sĩ số tối đa: bị từ chối', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.maxStudents, false);
      db.students.push({ id: 'z', code: 'Z', name: 'Z', level: 'A1', balance: 0, status: 'Hoạt động' });
      throws(() => R.enroll(db, ENR, 'z', c.id), /tối đa/);
    }],
    ['BR-03', 'Trùng phòng học: không được lưu lịch', () => {
      const db = fresh(); mkClass(db);
      const c2 = R.createClass(db, S, { courseId: 'co3', branchId: 'br1', termId: db.terms[1].id });
      throws(() => R.setSchedule(db, S, c2.id, sched(db, { teacherId: 'gv3', start: '19:00', end: '20:30' })), /phòng/);
      eq(R.sessions(db, c2.id).length, 0, 'Số buổi đã lưu');
    }],
    ['BR-03', 'Trùng giáo viên (khác phòng): không được lưu lịch', () => {
      const db = fresh(); mkClass(db);
      const c2 = R.createClass(db, S, { courseId: 'co3', branchId: 'br2', termId: db.terms[1].id });
      throws(() => R.setSchedule(db, S, c2.id, sched(db, { roomId: 'br2r1' })), /giáo viên/);
    }],
    ['BR-03', 'Cùng phòng nhưng khác giờ: lưu được', () => {
      const db = fresh(); mkClass(db);
      const c2 = R.createClass(db, S, { courseId: 'co3', branchId: 'br1', termId: db.terms[1].id });
      R.setSchedule(db, S, c2.id, sched(db, { teacherId: 'gv3', start: '19:30', end: '21:00' }));
      eq(R.sessions(db, c2.id).length, 24, 'Số buổi');
    }],
    ['BR-04', 'Học viên trùng lịch giữa hai lớp: không được đăng ký', () => {
      const db = fresh(), a = mkClass(db);
      const b = mkClass(db, { course: 'co3', branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3', start: '18:30', end: '20:00' } });
      db.students.push({ id: 'h', code: 'H', name: 'H', level: 'A1', balance: 0, status: 'Hoạt động' });
      R.enroll(db, ENR, 'h', a.id); throws(() => R.enroll(db, ENR, 'h', b.id), /trùng lịch/);
    }],
    ['BR-05', 'Bảo lưu khi đã học quá 50% số buổi: không hợp lệ, trạng thái giữ nguyên', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id);
      R.sessions(db, c.id).slice(0, 14).forEach((s) => { s.held = true; });
      const e = R.confirmed(db, c.id)[0];
      throws(() => R.createRequest(db, ENR, 'reserve', { enrollmentId: e.id }, 'bận'), /vượt/); eq(e.status, 'Đã xác nhận');
    }],
    ['BR-05', 'Bảo lưu hợp lệ: duyệt xong giữ lại học phí của các buổi chưa học', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id);
      R.sessions(db, c.id).slice(0, 6).forEach((s) => { s.held = true; });
      const e = R.confirmed(db, c.id)[0], r = R.createRequest(db, ENR, 'reserve', { enrollmentId: e.id }, 'ốm');
      R.approve(db, S, r.id); eq(e.status, 'Bảo lưu'); eq(db.reservations[0].credit, Math.round(e.fee * 18 / 24), 'Học phí bảo lưu');
    }],
    ['BR-06', 'Học lại sau bảo lưu: học phí bảo lưu được trừ vào lớp mới', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id);
      R.sessions(db, c.id).slice(0, 6).forEach((s) => { s.held = true; });
      const e = R.confirmed(db, c.id)[0]; R.approve(db, S, R.createRequest(db, ENR, 'reserve', { enrollmentId: e.id }, 'ốm').id);
      const c2 = mkClass(db, { s: { start: '08:00', end: '09:30' } });
      const n = R.resume(db, ENR, db.reservations[0].id, c2.id); eq(R.paid(db, n.id), db.reservations[0].credit, 'Đã chuyển vào'); eq(db.reservations[0].status, 'Đã học lại');
    }],
    ['BR-07', 'Chuyển lớp sang lớp khác trình độ: bị từ chối', () => {
      const db = fresh(), a = mkClass(db), b = mkClass(db, { course: 'co4', s: { roomId: 'br1r2', teacherId: 'gv3' } });
      fill(db, a, 1, false); const e = db.enrollments[0];
      throws(() => R.createRequest(db, ENR, 'transfer', { enrollmentId: e.id, toClassId: b.id }, 'x'), /khác trình độ/);
    }],
    ['BR-07', 'Lớp đích hết chỗ: không được chuyển, đăng ký và học phí cũ giữ nguyên', () => {
      const db = fresh(), a = mkClass(db), b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } });
      fill(db, a, 1, true); const e = db.enrollments[0], paidBefore = R.paid(db, e.id);
      const r = R.createRequest(db, ENR, 'transfer', { enrollmentId: e.id, toClassId: b.id }, 'đổi chi nhánh');
      fill(db, b, CFG.maxStudents, false, 50);
      const snap = JSON.stringify(db);
      throws(() => R.approve(db, S, r.id), /hết chỗ/);
      eq(JSON.stringify(db), snap, 'CSDL sau khi chuyển lớp thất bại'); eq(e.status, 'Đã xác nhận'); eq(R.paid(db, e.id), paidBefore, 'Học phí');
    }],
    ['BR-08', 'Chuyển sang lớp rẻ hơn: phần chênh lệch cộng vào số dư học viên', () => {
      const db = fresh(), a = mkClass(db, { course: 'co6' }), b = mkClass(db, { course: 'co5', s: { roomId: 'br1r2', teacherId: 'gv3' } });
      fill(db, a, 1, true); const e = db.enrollments[0];
      R.approve(db, S, R.createRequest(db, ENR, 'transfer', { enrollmentId: e.id, toClassId: b.id }, 'đổi khóa').id);
      const st = R.by(db, 'students', e.studentId); eq(e.status, 'Đã chuyển lớp'); eq(st.balance, 6200000 - 4900000, 'Số dư');
      const n = db.enrollments.find((x) => x.transferredFrom === e.id); eq(n.status, 'Đã xác nhận'); eq(R.due(db, n), 0, 'Còn nợ');
    }],
    ['BR-08', 'Chuyển sang lớp đắt hơn: học viên còn phải đóng thêm phần chênh lệch', () => {
      const db = fresh(), a = mkClass(db, { course: 'co5' }), b = mkClass(db, { course: 'co6', s: { roomId: 'br1r2', teacherId: 'gv3' } });
      fill(db, a, 1, true); const e = db.enrollments[0];
      R.approve(db, S, R.createRequest(db, ENR, 'transfer', { enrollmentId: e.id, toClassId: b.id }, 'nâng cấp').id);
      const n = db.enrollments.find((x) => x.transferredFrom === e.id); eq(R.due(db, n), 6200000 - 4900000, 'Còn phải đóng');
    }],
    ['BR-09', 'Học bù: chỉ khi vắng, cùng khóa, lớp khác; tối đa số buổi quy định', () => {
      const db = fresh(), a = mkClass(db); fill(db, a, CFG.minStudents); R.confirmOpen(db, S, a.id);
      const b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } }); fill(db, b, CFG.minStudents, true, 100); R.confirmOpen(db, S, b.id);
      const e = R.confirmed(db, a.id)[0], [s1, s2, s3] = R.sessions(db, a.id), tg = R.sessions(db, b.id);
      throws(() => R.createRequest(db, ENR, 'makeup', { enrollmentId: e.id, missedSessionId: s1.id, targetSessionId: tg[5].id }, 'x'), /không ở trạng thái vắng|tương lai/);
      const [m1, m2, m3] = R.sessions(db, a.id).slice(0, 3), tg2 = R.sessions(db, b.id); // lấy lại sau khi CSDL được khôi phục
      [m1, m2, m3].forEach((s) => { s.held = true; db.attendance.push({ id: 'a' + s.id, sessionId: s.id, enrollmentId: e.id, studentId: e.studentId, status: 'Vắng' }); });
      tg2.forEach((s) => { s.date = U.addDays(U.today(), s.no); }); // đưa buổi học bù về tương lai
      R.approve(db, S, R.createRequest(db, ENR, 'makeup', { enrollmentId: e.id, missedSessionId: m1.id, targetSessionId: tg2[0].id }, 'x').id);
      R.approve(db, S, R.createRequest(db, ENR, 'makeup', { enrollmentId: e.id, missedSessionId: m2.id, targetSessionId: tg2[1].id }, 'x').id);
      throws(() => R.createRequest(db, ENR, 'makeup', { enrollmentId: e.id, missedSessionId: m3.id, targetSessionId: tg2[2].id }, 'x'), /tối đa/);
    }],
    ['NFR-01', 'Giáo viên không có quyền duyệt yêu cầu', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, 1, true);
      const r = R.createRequest(db, ENR, 'transfer', { enrollmentId: db.enrollments[0].id, toClassId: mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } }).id }, 'x');
      throws(() => R.approve(db, TCH, r.id), /không có quyền/); throws(() => R.approve(db, ENR, r.id), /không có quyền/); eq(r.status, 'Chờ duyệt');
    }],
    ['NFR-01', 'Kế toán không được tạo lớp / giáo viên không được ghi danh', () => {
      const db = fresh();
      throws(() => R.createClass(db, ACC, { courseId: 'co2', branchId: 'br1', termId: db.terms[1].id }), /không có quyền/);
      throws(() => R.enroll(db, TCH, 'hv1', 'x'), /không có quyền/);
    }],
    ['FR-10', 'Thu học phí: không vượt quá số còn nợ; đủ 50% thì xác nhận chỗ', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, 1, false); const e = db.enrollments[0];
      throws(() => R.addPayment(db, ACC, e.id, { amount: e.fee + 1, method: 'Tiền mặt' }), /vượt quá/);
      const cur = () => R.by(db, 'enrollments', e.id);
      R.addPayment(db, ACC, e.id, { amount: e.fee * 0.4, method: 'Tiền mặt' }); eq(cur().status, 'Chờ đóng phí');
      R.addPayment(db, ACC, e.id, { amount: e.fee * 0.1, method: 'Tiền mặt' }); eq(cur().status, 'Đã xác nhận');
    }],
    ['FR-11', 'Điểm danh: giáo viên chỉ điểm danh buổi của mình, và không điểm danh buổi tương lai', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id);
      db.enrollments.forEach((e) => { e.createdAt = U.addDays(U.today(), -60); }); // ghi danh từ trước buổi học
      const s = R.sessions(db, c.id)[0], ent = R.attendees(db, s.id).map((a) => ({ enrollmentId: a.e.id, status: 'Có mặt' }));
      throws(() => R.markAttendance(db, TCH, s.id, ent), /chưa đến ngày/i);
      const cur = () => R.by(db, 'sessions', s.id);
      cur().date = U.addDays(U.today(), -1); cur().teacherId = 'gv2'; throws(() => R.markAttendance(db, TCH, s.id, ent), /phụ trách/);
      cur().teacherId = 'gv1'; R.markAttendance(db, TCH, s.id, ent); eq(cur().held, true);
    }],
    ['FR-12', 'Sửa thông tin lớp Nháp: đổi khóa học thì lịch cũ bị xóa; lớp đã mở thì không sửa được', () => {
      const db = fresh(), c = mkClass(db, { open: false });
      R.updateClass(db, S, c.id, { courseId: 'co3', branchId: 'br1', termId: db.terms[1].id });
      const cur = () => R.by(db, 'classes', c.id);
      eq(cur().courseId, 'co3'); eq(R.sessions(db, c.id).length, 0, 'Số buổi sau khi đổi khóa'); eq(cur().code.startsWith('A2-'), true, 'Mã lớp');
      R.setSchedule(db, S, c.id, sched(db)); R.openRegistration(db, S, c.id);
      throws(() => R.updateClass(db, S, c.id, { courseId: 'co2', branchId: 'br1', termId: db.terms[1].id }), /Nháp/);
    }],
    ['FR-12', 'Xóa lớp: lớp Nháp xóa được; lớp đã có đăng ký hoặc đang mở thì bị từ chối', () => {
      const db = fresh(), a = mkClass(db, { open: false });
      R.deleteClass(db, S, a.id); eq(db.classes.length, 0, 'Số lớp'); eq(db.sessions.length, 0, 'Số buổi');
      const b = mkClass(db); throws(() => R.deleteClass(db, S, b.id), /Nháp hoặc Đã hủy/);
      fill(db, b, 1, false); R.cancelClass(db, S, b.id); throws(() => R.deleteClass(db, S, b.id), /dữ liệu đăng ký/);
      throws(() => R.deleteClass(db, ENR, 'x'), /không có quyền/);
    }],
    ['FR-13', 'Tài khoản nhân viên: thêm, trùng tên đăng nhập, không xóa mình / quản lý cuối cùng', () => {
      const db = fresh(), me = db.users.find((x) => x.role === 'manager');
      R.saveUser(db, me, null, { name: 'Nhân viên mới', username: 'nv.moi', role: 'enroll', password: 'abcdef' });
      throws(() => R.saveUser(db, me, null, { name: 'Trùng', username: 'nv.moi', role: 'enroll', password: 'abcdef' }), /đã tồn tại/);
      throws(() => R.saveUser(db, me, null, { name: 'Yếu', username: 'matkhau', role: 'enroll', password: '123' }), /Mật khẩu/);
      throws(() => R.deleteUser(db, me, me.id), /đang đăng nhập/);
      const other = db.users.find((x) => x.username === 'nv.moi'); throws(() => R.deleteUser(db, other, me.id), /không có quyền/);
      throws(() => R.saveUser(db, me, me.id, { name: me.name, username: me.username, role: 'enroll' }), /tự hạ quyền/);
      R.deleteUser(db, me, other.id); eq(db.users.some((x) => x.username === 'nv.moi'), false, 'Còn tài khoản');
    }],
    ['B01', 'Seed khởi tạo được vào mọi ngày trong năm 2026 (không phụ thuộc ngày chạy)', () => {
      const bad = [];
      for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        try { withDate(iso, () => Seed.build()); } catch (e) { bad.push(iso + ': ' + e.message.slice(0, 80)); }
      }
      if (bad.length) throw new Error(`${bad.length} ngày lỗi, ví dụ ${bad[0]}`);
    }],
    ['B02', 'Đổi lịch lớp đã ghi danh làm học viên trùng lịch: bị từ chối, lịch cũ giữ nguyên', () => {
      const db = fresh(), a = mkClass(db), b = mkClass(db, { course: 'co3', branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3', start: '20:00', end: '21:30' } });
      db.students.push({ id: 'h', code: 'H', name: 'H', level: 'A1', balance: 0, status: 'Hoạt động' });
      R.enroll(db, ENR, 'h', a.id); R.enroll(db, ENR, 'h', b.id);
      throws(() => R.setSchedule(db, S, b.id, sched(db, { roomId: 'br2r1', teacherId: 'gv3', start: '18:30', end: '20:00' })), /trùng lịch/);
      eq(R.by(db, 'classes', b.id).start, '20:00', 'Giờ lớp B vẫn là lịch cũ');
    }],
    ['B03', 'Kết thúc lớp vẫn thu được học phí còn nợ của đăng ký đã hoàn thành', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents - 1); fill(db, c, 1, false, 99);
      const e = db.enrollments[db.enrollments.length - 1]; R.addPayment(db, ACC, e.id, { amount: e.fee / 2, method: 'Tiền mặt' });
      R.confirmOpen(db, S, c.id); db.sessions.filter((s) => s.classId === c.id).forEach((s) => { s.held = true; }); R.finishClass(db, S, c.id);
      const cur = R.by(db, 'enrollments', e.id); eq(cur.status, 'Hoàn thành'); R.addPayment(db, ACC, e.id, { amount: e.fee / 2, method: 'Tiền mặt' }); eq(R.due(db, cur), 0, 'Còn nợ');
    }],
    ['B04', 'Kết thúc lớp: không được khi chưa học buổi nào; kết thúc sớm cần lý do', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id);
      throws(() => R.finishClass(db, S, c.id), /chưa tổ chức buổi học nào/);
      R.sessions(db, c.id).slice(0, 3).forEach((s) => { s.held = true; });
      throws(() => R.finishClass(db, S, c.id), /lý do/); R.finishClass(db, S, c.id, 'Giáo viên nghỉ việc'); eq(R.by(db, 'classes', c.id).status, 'Kết thúc');
    }],
    ['B05', 'Lớp chưa xác nhận mở: không điểm danh được', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, 2);
      const s = R.sessions(db, c.id)[0]; s.date = U.addDays(U.today(), -1); db.enrollments.forEach((e) => { e.createdAt = U.addDays(U.today(), -30); });
      throws(() => R.markAttendance(db, S, s.id, R.attendees(db, s.id).map((a) => ({ enrollmentId: a.e.id, status: 'Có mặt' }))), /chưa được xác nhận mở/);
    }],
    ['B06', 'Chuyển lớp áp dụng đủ luật ghi danh: không để học viên có 2 đăng ký cùng khóa trong cùng đợt', () => {
      const db = fresh(), t0 = db.terms[0];
      const old = R.createClass(db, S, { courseId: 'co2', branchId: 'br1', termId: t0.id });
      R.setSchedule(db, S, old.id, sched(db, { startDate: t0.start, roomId: 'br1r2', teacherId: 'gv3' })); R.openRegistration(db, S, old.id);
      const b = mkClass(db), c = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv4', weekdays: [1, 3], start: '08:00', end: '09:30' } });
      db.students.push({ id: 'h', code: 'H', name: 'H', level: 'A1', balance: 0, status: 'Hoạt động' });
      const e = R.enroll(db, ENR, 'h', old.id); R.enroll(db, ENR, 'h', b.id); // đã có A1 ở đợt sau (lớp b)
      throws(() => R.createRequest(db, ENR, 'transfer', { enrollmentId: e.id, toClassId: c.id }, 'x'), /khóa học này trong đợt này/);
    }],
    ['B06', 'Chuyển lớp: học viên đã ngừng hoạt động bị từ chối', () => {
      const db = fresh(), a = mkClass(db), b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } });
      fill(db, a, 1, false); const e = db.enrollments[0]; R.by(db, 'students', e.studentId).status = 'Ngừng';
      throws(() => R.createRequest(db, ENR, 'transfer', { enrollmentId: e.id, toClassId: b.id }, 'x'), /ngừng hoạt động/);
    }],
    ['B07', 'Hai buổi học bù trùng giờ của cùng học viên: yêu cầu thứ hai bị từ chối', () => {
      const db = fresh(), a = mkClass(db); fill(db, a, CFG.minStudents); R.confirmOpen(db, S, a.id);
      const b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } }), c = mkClass(db, { branch: 'br3', s: { roomId: 'br3r1', teacherId: 'gv4' } });
      [b, c].forEach((x, i) => { fill(db, x, CFG.minStudents, true, 100 + i * 50); R.confirmOpen(db, S, x.id); });
      const e = R.confirmed(db, a.id)[0], [m1, m2] = R.sessions(db, a.id);
      [m1, m2].forEach((s) => { s.held = true; db.attendance.push({ id: 'a' + s.id, sessionId: s.id, enrollmentId: e.id, studentId: e.studentId, status: 'Vắng' }); });
      const day = U.addDays(U.today(), 3); [R.sessions(db, b.id)[0], R.sessions(db, c.id)[0]].forEach((s) => { s.date = day; });
      R.approve(db, S, R.createRequest(db, ENR, 'makeup', { enrollmentId: e.id, missedSessionId: m1.id, targetSessionId: R.sessions(db, b.id)[0].id }, 'x').id);
      throws(() => R.createRequest(db, ENR, 'makeup', { enrollmentId: e.id, missedSessionId: m2.id, targetSessionId: R.sessions(db, c.id)[0].id }, 'x'), /trùng lịch/);
    }],
    ['B08', 'Buổi vắng của học viên B vẫn chọn được dù học viên A đã xin bù cùng buổi', () => {
      const db = fresh(), a = mkClass(db); fill(db, a, CFG.minStudents); R.confirmOpen(db, S, a.id);
      const b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } }); fill(db, b, CFG.minStudents, true, 100); R.confirmOpen(db, S, b.id);
      const [ea, eb] = R.confirmed(db, a.id), s1 = R.sessions(db, a.id)[0]; s1.held = true;
      [ea, eb].forEach((e) => db.attendance.push({ id: 'a' + e.id, sessionId: s1.id, enrollmentId: e.id, studentId: e.studentId, status: 'Vắng' }));
      const tg = R.sessions(db, b.id)[0]; tg.date = U.addDays(U.today(), 2);
      R.createRequest(db, ENR, 'makeup', { enrollmentId: ea.id, missedSessionId: s1.id, targetSessionId: tg.id }, 'x');
      eq(R.makeupMissed(db, eb.id).length, 1, 'Số buổi vắng của B'); eq(R.makeupMissed(db, ea.id).length, 0, 'Số buổi vắng của A');
    }],
    ['B09', 'Điểm danh: giữ lịch sử khi chuyển lớp; học viên vào sau không xuất hiện ở buổi trước ngày ghi danh', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id);
      db.enrollments.forEach((e) => { e.createdAt = U.addDays(U.today(), -60); });
      const [s1] = R.sessions(db, c.id); s1.date = U.addDays(U.today(), -5);
      const e = R.confirmed(db, c.id)[0]; R.markAttendance(db, S, s1.id, R.attendees(db, s1.id).map((a) => ({ enrollmentId: a.e.id, status: 'Có mặt' })));
      R.by(db, 'enrollments', e.id).status = 'Đã chuyển lớp';
      eq(R.attendees(db, s1.id).some((a) => a.e.id === e.id), true, 'Học viên đã chuyển lớp vẫn có trong buổi cũ');
      fill(db, c, 1, true, 500); // học viên mới ghi danh hôm nay
      eq(R.attendees(db, s1.id).length, CFG.minStudents, 'Học viên mới không có mặt ở buổi trước ngày ghi danh');
    }],
    ['B10', 'Mã lớp luôn duy nhất sau khi xóa hoặc sửa lớp', () => {
      const db = fresh(), mk = () => R.createClass(db, S, { courseId: 'co2', branchId: 'br1', termId: db.terms[1].id });
      const a = mk(), b = mk(); R.deleteClass(db, S, a.id); const c = mk();
      const codes = db.classes.map((x) => x.code); eq(new Set(codes).size, codes.length, 'Mã lớp trùng: ' + codes.join(', '));
      const before = R.by(db, 'classes', b.id).code; R.updateClass(db, S, b.id, { courseId: 'co2', branchId: 'br1', termId: db.terms[1].id });
      eq(R.by(db, 'classes', b.id).code, before, 'Sửa không đổi nhóm phải giữ mã');
    }],
    ['B11', 'Phiếu bảo lưu hết hạn: học lại bị chặn và trạng thái Hết hạn được ghi nhận bởi syncExpiry', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents); R.confirmOpen(db, S, c.id);
      R.sessions(db, c.id).slice(0, 2).forEach((s) => { s.held = true; });
      const e = R.confirmed(db, c.id)[0]; R.approve(db, S, R.createRequest(db, ENR, 'reserve', { enrollmentId: e.id }, 'ốm').id);
      db.reservations[0].expires = U.addDays(U.today(), -1); const c2 = mkClass(db, { s: { start: '08:00', end: '09:30' } });
      throws(() => R.resume(db, ENR, db.reservations[0].id, c2.id), /hết hạn/);
      eq(R.syncExpiry(db), 1, 'Số phiếu được cập nhật'); eq(db.reservations[0].status, 'Hết hạn');
    }],
    ['B12', 'Kiểm tra dữ liệu đầu vào: hình thức thu, giờ học, số tiền, ngày', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, 1, false); const e = db.enrollments[0];
      throws(() => R.addPayment(db, ACC, e.id, { amount: 1000, method: 'abc-invalid' }), /Hình thức/);
      throws(() => R.addPayment(db, ACC, e.id, { amount: NaN, method: 'Tiền mặt' }), /số lớn hơn 0/);
      throws(() => R.setSchedule(db, S, c.id, sched(db, { start: '25:00', end: '26:00' })), /HH:mm/);
      throws(() => R.setSchedule(db, S, c.id, sched(db, { startDate: '2027-02-31' })), /không hợp lệ/);
      throws(() => R.setSchedule(db, S, c.id, sched(db, { weekdays: [9] })), /không hợp lệ/);
    }],
    ['B18', 'Sửa danh mục đang dùng: không đổi chi nhánh của phòng có lịch, không đổi số buổi khóa đã có lớp', () => {
      const db = fresh(); mkClass(db);
      throws(() => R.saveMaster(db, S, 'rooms', 'br1r1', { branchId: 'br2', name: 'P101', capacity: 24 }), /có lịch học/);
      throws(() => R.saveMaster(db, S, 'courses', 'co2', { code: 'A1', name: 'A1', level: 1, fee: 3600000, sessions: 12 }), /đã có lớp/);
      R.saveMaster(db, S, 'courses', 'co2', { code: 'A1', name: 'Giao tiếp A1 mới', level: 1, fee: 3700000, sessions: 24 });
      eq(R.by(db, 'courses', 'co2').fee, 3700000, 'Học phí');
    }],
    ['B19', 'Danh mục: tên toàn dấu cách, ngày/điện thoại/số sai bị từ chối; hợp lệ thì lưu', () => {
      const db = fresh(), ok = { name: 'Nguyễn A', dob: '2000-01-01', phone: '0912345678', email: '', level: 'A1', status: 'Hoạt động' };
      throws(() => R.saveMaster(db, ENR, 'students', null, { ...ok, name: '   ' }), /họ và tên/i);
      throws(() => R.saveMaster(db, ENR, 'students', null, { ...ok, phone: 'abc' }), /Điện thoại/);
      throws(() => R.saveMaster(db, ENR, 'students', null, { ...ok, dob: '2000-13-40' }), /Ngày sinh/);
      throws(() => R.saveMaster(db, S, 'courses', null, { code: 'X', name: 'X', level: 1, fee: -5, sessions: 24 }), /Học phí/);
      const n = db.students.length; R.saveMaster(db, ENR, 'students', null, ok); eq(db.students.length, n + 1, 'Số học viên');
      throws(() => R.saveMaster(db, ENR, 'courses', null, { code: 'X', name: 'X', level: 1, fee: 1000, sessions: 24 }), /không có quyền/);
    }],
    ['POL-01', 'Hủy đăng ký giữa chừng: hoàn tiền = đã đóng − giá trị buổi đã học, ghi sổ số dư', () => {
      const { db, c } = active(); R.sessions(db, c.id).slice(0, 6).forEach((s) => { s.held = true; });
      const e = R.confirmed(db, c.id)[0];
      R.approve(db, S, R.createRequest(db, ENR, 'cancel', { enrollmentId: e.id }, 'chuyển nhà').id);
      eq(R.by(db, 'enrollments', e.id).status, 'Đã hủy'); eq(R.by(db, 'students', e.studentId).balance, Math.round(e.fee * 18 / 24), 'Số dư');
      eq(db.ledger.length, 1, 'Số dòng sổ số dư'); eq(db.ledger[0].amount, Math.round(e.fee * 18 / 24), 'Số tiền ghi sổ');
    }],
    ['POL-02', 'Hủy đăng ký ở lớp chưa khai giảng: hoàn đủ học phí đã đóng', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, 1, true); const e = db.enrollments[0];
      R.approve(db, S, R.createRequest(db, ENR, 'cancel', { enrollmentId: e.id }, 'đổi ý').id);
      eq(R.by(db, 'students', e.studentId).balance, e.fee, 'Số dư');
    }],
    ['POL-03', 'Chuyển lớp sau khi đã học dở: chỉ chuyển phần tiền chưa dùng cho buổi đã học', () => {
      const { db, c } = active(), b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } });
      R.sessions(db, c.id).slice(0, 12).forEach((s) => { s.held = true; });
      const e = R.confirmed(db, c.id)[0];
      R.approve(db, S, R.createRequest(db, ENR, 'transfer', { enrollmentId: e.id, toClassId: b.id }, 'đổi chi nhánh').id);
      const n = db.enrollments.find((x) => x.transferredFrom === e.id);
      eq(R.paid(db, n.id), e.fee / 2, 'Tiền chuyển sang'); eq(R.due(db, n), e.fee / 2, 'Còn phải đóng ở lớp mới');
    }],
    ['POL-04', 'Bảo lưu khi mới đóng một phần: tiền giữ lại = đã đóng − giá trị buổi đã học (không âm)', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, CFG.minStudents - 1); fill(db, c, 1, false, 200);
      const e = db.enrollments[db.enrollments.length - 1]; R.addPayment(db, ACC, e.id, { amount: e.fee / 2, method: 'Tiền mặt' });
      R.confirmOpen(db, S, c.id); R.sessions(db, c.id).slice(0, 12).forEach((s) => { s.held = true; });
      R.approve(db, S, R.createRequest(db, ENR, 'reserve', { enrollmentId: e.id }, 'bận').id); eq(db.reservations[0].credit, 0, 'Tiền giữ lại');
    }],
    ['POL-05', 'Hủy đăng ký / bảo lưu / chuyển lớp: các buổi học bù đã xin tự hủy', () => {
      const { db, c: a } = active(), b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } }); fill(db, b, CFG.minStudents, true, 100); R.confirmOpen(db, S, b.id);
      const e = R.confirmed(db, a.id)[0], s1 = R.sessions(db, a.id)[0]; s1.held = true;
      db.attendance.push({ id: 'a1', sessionId: s1.id, enrollmentId: e.id, studentId: e.studentId, status: 'Vắng' });
      const tg = R.sessions(db, b.id)[0]; tg.date = U.addDays(U.today(), 2);
      const mk = R.createRequest(db, ENR, 'makeup', { enrollmentId: e.id, missedSessionId: s1.id, targetSessionId: tg.id }, 'x'); R.approve(db, S, mk.id);
      R.approve(db, S, R.createRequest(db, ENR, 'cancel', { enrollmentId: e.id }, 'x').id);
      eq(R.by(db, 'requests', mk.id).status, 'Đã hủy', 'Yêu cầu học bù');
    }],
    ['POL-06', 'Học bù giữ chỗ ngay khi gửi yêu cầu (yêu cầu đang chờ cũng chiếm chỗ)', () => {
      const { db, c: a } = active(), b = mkClass(db, { branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3' } });
      fill(db, b, CFG.minStudents, true, 100); R.confirmOpen(db, S, b.id);
      const tg = R.sessions(db, b.id)[0]; tg.date = U.addDays(U.today(), 2); R.by(db, 'rooms', 'br2r1').capacity = CFG.minStudents + 1; // còn đúng 1 chỗ
      const [e1, e2] = R.confirmed(db, a.id), s1 = R.sessions(db, a.id)[0]; s1.held = true;
      [e1, e2].forEach((e) => db.attendance.push({ id: 'a' + e.id, sessionId: s1.id, enrollmentId: e.id, studentId: e.studentId, status: 'Vắng' }));
      R.createRequest(db, ENR, 'makeup', { enrollmentId: e1.id, missedSessionId: s1.id, targetSessionId: tg.id }, 'x'); // đang chờ duyệt
      throws(() => R.createRequest(db, ENR, 'makeup', { enrollmentId: e2.id, missedSessionId: s1.id, targetSessionId: tg.id }, 'x'), /hết chỗ/);
    }],
    ['LEDGER', 'Hoàn tiền từ số dư: không vượt số dư, ghi sổ, chỉ kế toán/quản lý', () => {
      const db = fresh(); R._balance(db, 'hv1', 2000000, 'Thử', '', 'x');
      throws(() => R.refundBalance(db, ACC, 'hv1', { amount: 3000000, method: 'Tiền mặt' }), /vượt quá/);
      throws(() => R.refundBalance(db, ACC, 'hv1', { amount: 1000, method: 'Bitcoin' }), /Hình thức/);
      throws(() => R.refundBalance(db, ENR, 'hv1', { amount: 1000, method: 'Tiền mặt' }), /không có quyền/);
      R.refundBalance(db, ACC, 'hv1', { amount: 500000, method: 'Chuyển khoản', note: 'hoàn' });
      eq(R.by(db, 'students', 'hv1').balance, 1500000, 'Số dư'); eq(db.ledger.length, 2, 'Số dòng sổ'); eq(db.ledger[1].balanceAfter, 1500000, 'Số dư sau');
    }],
    ['VOID', 'Hủy phiếu thu: giữ lịch sử, trả lại số dư, đăng ký quay về Chờ đóng phí nếu dưới 50%', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, 1, false); const e = db.enrollments[0], cur = () => R.by(db, 'enrollments', e.id);
      const p = R.addPayment(db, ACC, e.id, { amount: e.fee / 2, method: 'Tiền mặt' }); eq(cur().status, 'Đã xác nhận');
      throws(() => R.voidPayment(db, ACC, p.id, ''), /lý do/); R.voidPayment(db, ACC, p.id, 'Nhập nhầm');
      eq(cur().status, 'Chờ đóng phí'); eq(R.paid(db, e.id), 0, 'Đã đóng'); eq(db.payments.length, 1, 'Phiếu vẫn được giữ');
      throws(() => R.voidPayment(db, ACC, p.id, 'x'), /đã bị hủy/);
      R._balance(db, e.studentId, 1000000, 'Thử', '', 'x'); const q = R.addPayment(db, ACC, e.id, { amount: 1000000, method: 'Số dư' }); eq(R.by(db, 'students', e.studentId).balance, 0);
      R.voidPayment(db, ACC, q.id, 'Nhầm'); eq(R.by(db, 'students', e.studentId).balance, 1000000, 'Số dư được trả lại');
    }],
    ['RESCHED', 'Đổi một buổi học: lưu lịch sử; từ chối khi trùng giáo viên/học viên, buổi đã học, ngày quá khứ', () => {
      const db = fresh(), a = mkClass(db), b = mkClass(db, { course: 'co3', branch: 'br2', s: { roomId: 'br2r1', teacherId: 'gv3', start: '20:00', end: '21:30' } });
      db.students.push({ id: 'h', code: 'H', name: 'H', level: 'A1', balance: 0, status: 'Hoạt động' }); R.enroll(db, ENR, 'h', a.id); R.enroll(db, ENR, 'h', b.id);
      const s = R.sessions(db, a.id)[3], d = U.addDays(s.date, 1), ok = { date: d, start: '18:00', end: '19:30', roomId: 'br1r1', teacherId: 'gv1', reason: 'GV bận' };
      throws(() => R.rescheduleSession(db, S, s.id, { ...ok, reason: '' }), /lý do/);
      throws(() => R.rescheduleSession(db, S, s.id, { ...ok, date: '2020-01-01' }), /đã qua/);
      const day = R.sessions(db, b.id)[0].date;
      throws(() => R.rescheduleSession(db, S, s.id, { ...ok, date: day, start: '20:00', end: '21:30', roomId: 'br1r2', teacherId: 'gv3' }), /giáo viên/);
      throws(() => R.rescheduleSession(db, S, s.id, { ...ok, date: day, start: '20:30', end: '21:30', roomId: 'br1r2', teacherId: 'gv2' }), /trùng lịch/);
      R.rescheduleSession(db, S, s.id, ok); const cur = R.by(db, 'sessions', s.id); eq(cur.date, d, 'Ngày mới'); eq(cur.history.length, 1, 'Lịch sử đổi');
      cur.held = true; throws(() => R.rescheduleSession(db, S, s.id, ok), /đã diễn ra/);
    }],
    ['HOLD', 'Giữ chỗ hết hạn: đăng ký chưa đóng đủ ở lớp chưa khai giảng quá 7 ngày tự hủy; lớp đang học thì không', () => {
      const db = fresh(), c = mkClass(db); fill(db, c, 2, false);
      db.enrollments[0].createdAt = U.addDays(U.today(), -(CFG.holdDays + 1)); eq(R.expireHolds(db), 1, 'Số đăng ký hết hạn');
      eq(db.enrollments[0].status, 'Đã hủy'); eq(db.enrollments[1].status, 'Chờ đóng phí');
      const { db: d2, c: c2 } = active(); fill(d2, c2, 1, false, 300); d2.enrollments[d2.enrollments.length - 1].createdAt = U.addDays(U.today(), -30);
      eq(R.expireHolds(d2), 0, 'Lớp đang học không bị hủy giữ chỗ');
    }],
    ['ATT-EDIT', 'Sửa điểm danh cũ: giáo viên chỉ trong 7 ngày; quản lý sau đó phải ghi lý do; lưu lịch sử thay đổi', () => {
      const { db, c } = active(); db.enrollments.forEach((e) => { e.createdAt = U.addDays(U.today(), -90); });
      const sid = R.sessions(db, c.id)[0].id; R.by(db, 'sessions', sid).date = U.addDays(U.today(), -1);
      const all = (st) => R.attendees(db, sid).map((a) => ({ enrollmentId: a.e.id, status: st }));
      R.markAttendance(db, TCH, sid, all('Có mặt')); R.by(db, 'sessions', sid).date = U.addDays(U.today(), -(CFG.attendanceEditDays + 3));
      throws(() => R.markAttendance(db, TCH, sid, all('Vắng')), /quá \d+ ngày/);
      throws(() => R.markAttendance(db, S, sid, all('Vắng')), /lý do/);
      R.markAttendance(db, S, sid, all('Vắng'), 'Nhập nhầm ban đầu');
      const rec = db.attendance.find((x) => x.sessionId === sid); eq(rec.status, 'Vắng'); eq(rec.history.length, 1, 'Lịch sử sửa'); eq(rec.history[0].reason, 'Nhập nhầm ban đầu');
    }],
    ['TERM', 'Đợt đào tạo phải kéo dài đúng 3 tháng', () => {
      const db = fresh(), base = { code: 'Q9-30', name: 'Đợt thử', start: '2030-01-01' };
      throws(() => R.saveMaster(db, S, 'terms', null, { ...base, end: '2030-04-01' }), /đúng 3 tháng/);
      R.saveMaster(db, S, 'terms', null, { ...base, end: '2030-03-31' }); eq(db.terms.length, 3, 'Số đợt');
    }],
    ['AUDIT', 'Nhật ký thao tác ghi ai đã đổi gì (giá trị trước/sau)', () => {
      const db = fresh(), snap = () => JSON.parse(JSON.stringify(db));
      let b = snap(); R.createClass(db, S, { courseId: 'co2', branchId: 'br1', termId: db.terms[1].id });
      const e1 = recordAudit(db, b, S, 'Tạo lớp'); eq(e1.summary.some((x) => x.includes('Lớp: +1')), true, 'Tóm tắt thêm lớp'); eq(e1.by, S.name);
      b = snap(); R.by(db, 'students', 'hv1').name = 'Tên mới';
      const e2 = recordAudit(db, b, S, 'Sửa học viên'); eq(e2.details[0].fields.name[1], 'Tên mới', 'Giá trị sau'); eq(e2.details[0].fields.name[0] !== 'Tên mới', true, 'Giá trị trước');
      eq(recordAudit(db, snap(), S, 'Không đổi gì'), null, 'Không ghi khi không có thay đổi'); eq(db.audit.length, 2, 'Số mục nhật ký');
    }],
  ];

  function run() {
    return cases.map(([ref, name, fn]) => {
      try { fn(); return { ref, name, ok: true }; } catch (e) { return { ref, name, ok: false, err: e.message }; }
    });
  }
  return { run, cases };
})();
export { Tests };
