import { R, U, CFG, RuleError } from './rules.js';
import { Seed } from './seed.js';
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
  const throws = (fn, re) => { try { fn(); } catch (e) { if (!(e instanceof RuleError)) throw e; if (re && !re.test(e.message)) throw new Error('Sai thông báo lỗi: ' + e.message); return; } throw new Error('Đáng lẽ phải bị từ chối nhưng đã thành công.'); };
  const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'Giá trị'}: mong đợi ${b}, thực tế ${a}`); };

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
  ];

  function run() {
    return cases.map(([ref, name, fn]) => {
      try { fn(); return { ref, name, ok: true }; } catch (e) { return { ref, name, ok: false, err: e.message }; }
    });
  }
  return { run, cases };
})();
export { Tests };
