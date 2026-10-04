import { R, U } from './rules.js';
/* seed.js – dữ liệu nền + dữ liệu demo (tạo qua đúng các hàm nghiệp vụ trong rules.js) */
const Seed = {
  SYS: { id: 'sys', name: 'Hệ thống', role: 'manager' },

  terms() {
    const t = new Date(), n = t.getFullYear() * 4 + Math.floor(t.getMonth() / 3);
    return [0, 1].map((k) => {
      const m = n + k, y = Math.floor(m / 4), q = m % 4;
      return { id: 'tm' + k, code: `Q${q + 1}-${String(y).slice(2)}`, name: `Đợt ${q + 1}/${y}`, start: U.iso(new Date(y, q * 3, 1)), end: U.iso(new Date(y, q * 3 + 3, 0)) };
    });
  },

  minimal() {
    const branches = [
      { id: 'br1', code: 'CG', name: 'ABC Cầu Giấy', address: '88 Xuân Thủy, Cầu Giấy, Hà Nội', phone: '024 3333 0001' },
      { id: 'br2', code: 'HD', name: 'ABC Hà Đông', address: '15 Quang Trung, Hà Đông, Hà Nội', phone: '024 3333 0002' },
      { id: 'br3', code: 'TX', name: 'ABC Thanh Xuân', address: '120 Nguyễn Trãi, Thanh Xuân, Hà Nội', phone: '024 3333 0003' },
      { id: 'br4', code: 'LB', name: 'ABC Long Biên', address: '36 Nguyễn Văn Cừ, Long Biên, Hà Nội', phone: '024 3333 0004' },
    ];
    const rooms = [];
    branches.forEach((b) => ['P101', 'P102', 'P201'].forEach((n, i) => rooms.push({ id: `${b.id}r${i + 1}`, branchId: b.id, name: n, capacity: 24 })));
    const courses = [
      { id: 'co1', code: 'KID', name: 'Tiếng Anh thiếu nhi', level: 0, fee: 3000000, sessions: 24, desc: 'Học qua trò chơi, bài hát và dự án nhỏ cho trẻ 6–11 tuổi.' },
      { id: 'co2', code: 'A1', name: 'Giao tiếp A1 – Mất gốc', level: 1, fee: 3600000, sessions: 24, desc: 'Xây nền phát âm, từ vựng và mẫu câu giao tiếp hằng ngày.' },
      { id: 'co3', code: 'A2', name: 'Giao tiếp A2 – Sơ cấp', level: 2, fee: 3900000, sessions: 24, desc: 'Nói tự tin về công việc, du lịch và đời sống.' },
      { id: 'co4', code: 'B1', name: 'Tiếng Anh B1 – Trung cấp', level: 3, fee: 4500000, sessions: 24, desc: 'Phát triển bốn kỹ năng, nền tảng cho chứng chỉ quốc tế.' },
      { id: 'co5', code: 'B2', name: 'Tiếng Anh B2 – Trung cao cấp', level: 4, fee: 4900000, sessions: 24, desc: 'Thảo luận, thuyết trình và viết học thuật.' },
      { id: 'co6', code: 'IELTS', name: 'IELTS Foundation 5.0', level: 4, fee: 6200000, sessions: 24, desc: 'Luyện thi IELTS bài bản với giáo viên chấm chữa kỹ.' },
    ];
    const teachers = [
      ['Nguyễn Thu Hà', 'Giao tiếp'], ['Trần Minh Quân', 'IELTS'], ['Lê Phương Anh', 'Thiếu nhi'],
      ['Phạm Đức Long', 'Giao tiếp'], ['Hoàng Mai Linh', 'IELTS'], ['Vũ Thanh Tùng', 'Giao tiếp'],
    ].map(([name, specialty], i) => ({ id: 'gv' + (i + 1), code: 'GV' + String(i + 1).padStart(3, '0'), name, phone: '09010000' + (i + 1) + '0', email: `gv${i + 1}@abc.edu.vn`, specialty, status: 'Đang dạy' }));
    const last = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
    const mid = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Quang', 'Thu', 'Gia', 'Hải'];
    const first = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hương', 'Khánh', 'Lan', 'Nam', 'Oanh', 'Phúc', 'Quỳnh', 'Sơn', 'Trang', 'Việt', 'Yến', 'Hùng', 'Mai', 'Tâm', 'Nhi'];
    const levels = ['A1', 'A2', 'B1', 'B2'];
    const students = first.map((f, i) => ({ id: 'hv' + (i + 1), code: 'HV' + String(i + 1).padStart(4, '0'), name: `${last[i % 10]} ${mid[i % 8]} ${f}`, dob: `${1995 + (i % 10)}-0${(i % 9) + 1}-1${i % 9}`, phone: '0912' + String(300100 + i * 37), email: `hocvien${i + 1}@mail.com`, level: levels[i % 4], balance: 0, status: 'Hoạt động' }));
    const users = [
      { id: 'u1', username: 'quanly', password: '123456', name: 'Đỗ Hoài Nam', role: 'manager', title: 'Quản lý đào tạo' },
      { id: 'u2', username: 'ghidanh', password: '123456', name: 'Lê Thảo Vy', role: 'enroll', title: 'Nhân viên ghi danh' },
      { id: 'u3', username: 'ketoan', password: '123456', name: 'Phan Kim Ngân', role: 'accountant', title: 'Kế toán' },
      { id: 'u4', username: 'gv1', password: '123456', name: teachers[0].name, role: 'teacher', title: 'Giáo viên', teacherId: 'gv1' },
      { id: 'u5', username: 'gv2', password: '123456', name: teachers[1].name, role: 'teacher', title: 'Giáo viên', teacherId: 'gv2' },
    ];
    return { meta: { receiptSeq: 0, version: 1 }, users, branches, rooms, courses, terms: Seed.terms(), teachers, students,
      classes: [], sessions: [], enrollments: [], payments: [], attendance: [], requests: [], reservations: [], leads: [] };
  },

  /* Tạo lớp hoàn chỉnh: tạo → xếp lịch → mở đăng ký */
  klass(db, o) {
    const c = R.createClass(db, Seed.SYS, { courseId: o.course, branchId: o.branch, termId: o.term });
    if (o.sched) { R.setSchedule(db, Seed.SYS, c.id, o.sched); R.openRegistration(db, Seed.SYS, c.id); }
    return c;
  },

  build() {
    const db = Seed.minimal(), S = Seed.SYS, [t0, t1] = [db.terms[0], db.terms[1]], today = U.today();
    let start0 = U.monday(U.addDays(today, -21)); if (start0 < t0.start) start0 = t0.start;
    const sched = (wd, st, en, room, teacher, startDate) => ({ weekdays: wd, start: st, end: en, roomId: room, teacherId: teacher, startDate });

    // 1) A1 – Cầu Giấy: đủ sĩ số, đang học
    const c1 = Seed.klass(db, { course: 'co2', branch: 'br1', term: t0.id, sched: sched([2, 4], '18:00', '19:30', 'br1r1', 'gv1', start0) });
    for (let i = 0; i < 11; i++) {
      const e = R.enroll(db, S, 'hv' + (i + 1), c1.id), pct = i < 9 ? 1 : i === 9 ? 0.5 : 0;
      if (pct) R.addPayment(db, { ...S, role: 'accountant' }, e.id, { amount: e.fee * pct, method: i % 2 ? 'Chuyển khoản' : 'Tiền mặt' });
    }
    R.confirmOpen(db, S, c1.id);
    R.sessions(db, c1.id).filter((s) => s.date < today).forEach((s, k) => {
      s.held = true;
      R.confirmed(db, c1.id).forEach((e, i) => db.attendance.push({ id: U.id('at'), sessionId: s.id, enrollmentId: e.id, studentId: e.studentId, status: (i + k) % 6 === 0 ? 'Vắng' : 'Có mặt' }));
    });

    // 2) A2 – Hà Đông: chưa đủ sĩ số tối thiểu (để minh họa luật mở lớp)
    const c2 = Seed.klass(db, { course: 'co3', branch: 'br2', term: t0.id, sched: sched([1, 3], '18:30', '20:00', 'br2r1', 'gv4', start0) });
    for (let i = 11; i < 17; i++) { const e = R.enroll(db, S, 'hv' + (i + 1), c2.id); R.addPayment(db, S, e.id, { amount: e.fee, method: 'Chuyển khoản' }); }

    // 3) IELTS – Cầu Giấy: đang học (cuối tuần, cùng giáo viên khác)
    const c3 = Seed.klass(db, { course: 'co6', branch: 'br1', term: t0.id, sched: sched([6], '08:00', '11:00', 'br1r2', 'gv2', start0) });
    for (let i = 0; i < 10; i++) { const e = R.enroll(db, S, 'hv' + (i + 11), c3.id); R.addPayment(db, S, e.id, { amount: e.fee, method: 'Chuyển khoản' }); }
    R.confirmOpen(db, S, c3.id);

    // 4) Lớp ở đợt kế tiếp (mở đăng ký) + 1 lớp nháp
    const c4 = Seed.klass(db, { course: 'co2', branch: 'br1', term: t1.id, sched: sched([2, 4], '18:00', '19:30', 'br1r1', 'gv1', U.monday(t1.start) < t1.start ? t1.start : U.monday(t1.start)) });
    ['hv18', 'hv19'].forEach((id) => R.enroll(db, S, id, c4.id));
    Seed.klass(db, { course: 'co4', branch: 'br3', term: t1.id, sched: sched([2, 4], '19:00', '20:30', 'br3r1', 'gv6', t1.start) });
    Seed.klass(db, { course: 'co1', branch: 'br4', term: t1.id });

    // 5) Yêu cầu chờ duyệt (bỏ qua nếu ngày hiện tại khiến yêu cầu không còn hợp lệ)
    const en = (sid, cid) => db.enrollments.find((e) => e.studentId === sid && e.classId === cid);
    try { R.createRequest(db, { ...S, role: 'enroll', name: 'Lê Thảo Vy' }, 'transfer', { enrollmentId: en('hv3', c1.id).id, toClassId: c4.id }, 'Học viên đi công tác trong đợt này, xin chuyển sang đợt sau.'); } catch (e) { /* bỏ qua */ }
    try { R.createRequest(db, { ...S, role: 'enroll', name: 'Lê Thảo Vy' }, 'reserve', { enrollmentId: en('hv4', c1.id).id }, 'Học viên ốm, bác sĩ yêu cầu nghỉ dài ngày.'); } catch (e) { /* bỏ qua */ }

    db.leads.push(
      { id: U.id('ld'), name: 'Trần Hoài Phương', phone: '0988111222', course: 'IELTS Foundation 5.0', note: 'Muốn học buổi tối', status: 'Mới', createdAt: today },
      { id: U.id('ld'), name: 'Nguyễn Đức Anh', phone: '0977333444', course: 'Giao tiếp A1 – Mất gốc', note: '', status: 'Đã liên hệ', createdAt: today });
    return db;
  },
};
export { Seed };
