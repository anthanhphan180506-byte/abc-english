import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Seed } from './lib/seed.js';
import { R } from './lib/rules.js';
import { recordAudit } from './lib/audit.js';
import { confetti } from './fx.jsx';

const KEY = 'abc_center_db_react_v1', SKEY = 'abc_center_user_react';
const COLS = ['users', 'branches', 'rooms', 'courses', 'terms', 'teachers', 'students', 'classes', 'sessions', 'enrollments', 'payments', 'attendance', 'requests', 'reservations', 'leads'];
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

/* Dữ liệu hợp lệ = có meta và đủ mọi bảng dạng mảng */
export const validateDb = (d) => !!d && typeof d === 'object' && !!d.meta && typeof d.meta === 'object' && COLS.every((k) => Array.isArray(d[k]));
const readRaw = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const storedRev = () => { try { const s = readRaw(); return s ? JSON.parse(s).meta?.rev ?? 0 : 0; } catch { return 0; } };
const write = (db) => { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch { return false; } };

/* Nạp dữ liệu: không bao giờ làm trắng trang và không tự xóa dữ liệu người dùng */
function loadDb() {
  let notice = null;
  const raw = readRaw();
  if (raw) {
    let d = null; try { d = JSON.parse(raw); } catch { /* dữ liệu hỏng */ }
    if (validateDb(d)) { R.syncAuto(d); return { db: d, notice }; } // thêm bảng mới nếu thiếu, cập nhật hạn bảo lưu/giữ chỗ
    try { localStorage.setItem(KEY + '_corrupt_' + Date.now(), raw); } catch { /* bỏ qua */ }
    notice = 'Dữ liệu đã lưu không hợp lệ nên đã được sao lưu riêng (khóa ' + KEY + '_corrupt_…) và hệ thống nạp lại dữ liệu demo.';
  }
  let d;
  try { d = Seed.build(); } catch (e) {
    console.error('Seed.build lỗi', e); d = Seed.minimal();
    notice = (notice ? notice + ' ' : '') + 'Không tạo được dữ liệu demo đầy đủ nên đã nạp dữ liệu nền (chưa có lớp).';
  }
  R.migrate(d); d.meta.rev = 0; write(d);
  return { db: d, notice };
}

export function StoreProvider({ children }) {
  const [boot] = useState(loadDb), db = boot.db;      // db được sửa trực tiếp bởi lớp rules, sau đó commit() để lưu và vẽ lại
  const [ver, setVer] = useState(0);
  const [unsaved, setUnsaved] = useState(false);
  const [user, setUserState] = useState(() => { try { return db.users.find((u) => u.id === sessionStorage.getItem(SKEY)) || null; } catch { return null; } });
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const snap = useRef(JSON.stringify(db)), userRef = useRef(null); // snap = trạng thái đã lưu gần nhất, dùng để lập nhật ký thay đổi
  userRef.current = user;

  const toast = useCallback((msg, type) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'err' ? 7000 : 3000);
  }, []);
  useEffect(() => { if (boot.notice) toast(boot.notice, 'err'); }, [boot, toast]);

  const replaceDb = useCallback((d) => {
    Object.keys(db).forEach((k) => delete db[k]); Object.assign(db, d); snap.current = JSON.stringify(db);
    setUserState((u) => (u ? db.users.find((x) => x.id === u.id) || null : u)); setVer((v) => v + 1);
  }, [db]);
  const reload = useCallback(() => { // nạp lại bản đã lưu (bỏ thay đổi chưa lưu)
    try { const d = JSON.parse(readRaw()); if (validateDb(d)) { replaceDb(d); return true; } } catch { /* bỏ qua */ }
    return false;
  }, [replaceDb]);

  /* Lưu dữ liệu. Trả về true khi đã lưu. Thất bại (hết dung lượng, bị chặn, tab khác đã ghi trước) thì hoàn tác và báo lỗi rõ ràng. */
  const commit = useCallback((label) => {
    if (storedRev() !== (db.meta.rev || 0)) {
      reload(); toast('Dữ liệu đã được thay đổi ở tab/cửa sổ khác. Đã tải bản mới nhất – hãy thực hiện lại thao tác vừa rồi.', 'err'); return false;
    }
    db.meta.rev = (db.meta.rev || 0) + 1;
    let entry = null; try { entry = recordAudit(db, JSON.parse(snap.current), userRef.current, label); } catch { /* nhật ký lỗi không được chặn việc lưu */ }
    if (!write(db)) {
      if (entry) db.audit.pop();
      db.meta.rev -= 1;
      const rolledBack = reload();
      if (!rolledBack) setUnsaved(true);
      toast('Không lưu được dữ liệu (bộ nhớ trình duyệt đầy hoặc bị chặn). ' + (rolledBack ? 'Thao tác vừa rồi đã được hoàn tác.' : 'Thay đổi chỉ tồn tại tạm thời – hãy bấm “Sao lưu dữ liệu”.'), 'err'); return false;
    }
    snap.current = JSON.stringify(db); setUnsaved(false); setVer((v) => v + 1); return true;
  }, [db, reload, toast]);

  // Tab khác ghi dữ liệu → đồng bộ ngay để không ghi đè mất thay đổi
  useEffect(() => {
    const f = (e) => { if (e.key === KEY && e.newValue && reload()) toast('Dữ liệu vừa được cập nhật từ tab/cửa sổ khác.', 'info'); };
    addEventListener('storage', f); return () => removeEventListener('storage', f);
  }, [reload, toast]);

  const act = useCallback((fn, okMsg, celebrate) => { // chạy một thao tác nghiệp vụ, báo kết quả bằng toast
    try { const r = fn(); if (!commit((typeof r === 'string' ? r : okMsg) || 'Thao tác')) return false; toast(typeof r === 'string' ? r : okMsg || 'Thành công', 'ok'); if (celebrate) confetti(); return true; }
    catch (e) { toast(e.message, 'err'); return false; }
  }, [commit, toast]);
  const setUser = useCallback((u) => {
    if (u) { const n = R.syncAuto(db); if (n.holds || n.reservations) commit('Tự động cập nhật giữ chỗ quá hạn / hạn bảo lưu'); }
    setUserState(u); try { u ? sessionStorage.setItem(SKEY, u.id) : sessionStorage.removeItem(SKEY); } catch { /* bỏ qua */ } }, [db, commit]);
  const reset = useCallback(() => {
    const fresh = Seed.build(); fresh.meta.rev = storedRev(); replaceDb(fresh);
    if (commit('Khôi phục dữ liệu demo')) toast('Đã khôi phục dữ liệu demo', 'ok');
  }, [replaceDb, commit, toast]);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `abc-english-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  }, [db]);
  const importData = useCallback(async (file) => {
    try {
      const d = JSON.parse(await file.text());
      if (!validateDb(d)) throw new Error('Tệp không phải bản sao lưu hợp lệ của hệ thống (thiếu bảng dữ liệu).');
      R.migrate(d); d.meta.rev = storedRev(); replaceDb(d); if (commit('Nạp bản sao lưu')) toast('Đã nạp bản sao lưu', 'ok');
    } catch (e) { toast(e.message || 'Không đọc được tệp sao lưu.', 'err'); }
  }, [replaceDb, commit, toast]);

  const value = useMemo(() => ({ db, ver, user, setUser, commit, toast, act, reset, exportData, importData, modal, openModal: setModal, closeModal: () => setModal(null) }),
    [db, ver, user, setUser, commit, toast, act, reset, exportData, importData, modal]);
  return (
    <Ctx.Provider value={value}>
      {unsaved && <div className="fixed inset-x-0 top-0 z-[98] flex flex-wrap items-center justify-center gap-3 bg-red-600 px-4 py-2 text-sm font-semibold text-white">⚠️ Dữ liệu CHƯA được lưu vào trình duyệt – có thể mất khi tải lại trang. <button onClick={exportData} className="rounded-lg bg-white px-3 py-1 text-red-700">Sao lưu dữ liệu</button></div>}
      {children}
      {modal}
      <div className="fixed right-4 bottom-4 z-[99] flex flex-col gap-2">
        {toasts.map((t) => <div key={t.id} className={`max-w-sm animate-toast rounded-xl px-4 py-2.5 text-sm text-white shadow-xl ${t.type === 'err' ? 'bg-red-600' : t.type === 'ok' ? 'bg-green-600' : 'bg-slate-900'}`}>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}

export function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => { const f = () => setH(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h.replace(/^#\/?/, '').split('/');
}
