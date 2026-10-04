/* audit.js – nhật ký thao tác: so sánh dữ liệu trước/sau mỗi lần lưu để biết AI đã đổi GÌ, LÚC NÀO, giá trị trước/sau. */
const NAMES = { users: 'Tài khoản', branches: 'Chi nhánh', rooms: 'Phòng', courses: 'Khóa học', terms: 'Đợt', teachers: 'Giáo viên', students: 'Học viên', classes: 'Lớp', sessions: 'Buổi học', enrollments: 'Đăng ký', payments: 'Phiếu thu', attendance: 'Điểm danh', requests: 'Yêu cầu', reservations: 'Bảo lưu', leads: 'Tư vấn', ledger: 'Sổ số dư' };
const SKIP = new Set(['audit']);
const MAX_DETAILS = 14, MAX_LOG = 500;
const label = (x) => x.code || x.name || x.no || x.username || x.id;
const short = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s == null ? '' : s.length > 60 ? s.slice(0, 57) + '…' : s; };

export function diffDb(before, after) {
  const summary = [], details = [];
  for (const col of Object.keys(after)) {
    if (SKIP.has(col) || !Array.isArray(after[col])) continue;
    const bm = new Map((before[col] || []).map((x) => [x.id, x])), am = new Map(after[col].map((x) => [x.id, x]));
    let add = 0, del = 0, mod = 0;
    for (const [id, x] of am) {
      const o = bm.get(id);
      if (!o) { add++; if (details.length < MAX_DETAILS && add <= 3) details.push({ col, op: 'thêm', label: label(x) }); continue; }
      const fields = {};
      for (const k of new Set([...Object.keys(o), ...Object.keys(x)])) if (JSON.stringify(o[k]) !== JSON.stringify(x[k])) fields[k] = [short(o[k]), short(x[k])];
      if (Object.keys(fields).length) { mod++; if (details.length < MAX_DETAILS) details.push({ col, op: 'sửa', label: label(x), fields }); }
    }
    for (const [id, x] of bm) if (!am.has(id)) { del++; if (details.length < MAX_DETAILS && del <= 3) details.push({ col, op: 'xóa', label: label(x) }); }
    if (add || del || mod) summary.push(`${NAMES[col] || col}: ${[add && `+${add}`, del && `−${del}`, mod && `~${mod}`].filter(Boolean).join(' ')}`);
  }
  return { summary, details };
}

/* Ghi một mục nhật ký vào db.audit (nếu có thay đổi). Trả về mục đã ghi hoặc null. */
export function recordAudit(db, before, user, action) {
  const { summary, details } = diffDb(before, db);
  if (!summary.length) return null;
  if (!Array.isArray(db.audit)) db.audit = [];
  const entry = { id: 'au_' + Math.random().toString(36).slice(2, 9), at: new Date().toISOString(), by: user ? user.name : 'Khách', role: user ? user.role : 'guest', action: action || 'Cập nhật dữ liệu', summary, details };
  db.audit.push(entry); if (db.audit.length > MAX_LOG) db.audit.splice(0, db.audit.length - MAX_LOG);
  return entry;
}
