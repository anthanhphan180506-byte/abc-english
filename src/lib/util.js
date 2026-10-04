import { U } from './rules.js';

export const by = (db, col, id) => db[col].find((x) => x.id === id) || {};
export const vnd = U.vnd;
export const dmy = U.dmy;
export const ROLE = { manager: 'Quản lý đào tạo', enroll: 'Nhân viên ghi danh', accountant: 'Kế toán', teacher: 'Giáo viên' };
export const TYPE = { reserve: 'Bảo lưu', transfer: 'Chuyển lớp', makeup: 'Học bù', cancel: 'Hủy đăng ký' };
export const canViewClass = (user) => !!user && ['manager', 'enroll'].includes(user.role); // vai trò có trang Lớp học
export const cx = (...a) => a.filter(Boolean).join(' ');

export const reqDesc = (db, r) => {
  const d = r.data, e = by(db, 'enrollments', d.enrollmentId), c = by(db, 'classes', e.classId);
  if (r.type === 'reserve') return `Bảo lưu lớp ${c.code}`;
  if (r.type === 'transfer') return `${c.code} → ${by(db, 'classes', d.toClassId).code}`;
  if (r.type === 'cancel') return `Hủy đăng ký lớp ${c.code}`;
  const m = by(db, 'sessions', d.missedSessionId), t = by(db, 'sessions', d.targetSessionId);
  return `Vắng buổi ${m.no} (${dmy(m.date)}) → học bù lớp ${by(db, 'classes', t.classId).code} ngày ${dmy(t.date)}`;
};
export const enLabel = (db, e) => `${by(db, 'students', e.studentId).name} – ${by(db, 'classes', e.classId).code}`;
