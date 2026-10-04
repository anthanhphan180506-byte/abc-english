import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Seed } from './lib/seed.js';
import { confetti } from './fx.jsx';

const KEY = 'abc_center_db_react_v1', SKEY = 'abc_center_user_react';
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const persist = (db) => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* bỏ qua */ } };
function loadDb() {
  try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.meta) return d; } } catch { /* bỏ qua */ }
  const d = Seed.build(); persist(d); return d;
}

export function StoreProvider({ children }) {
  const [db] = useState(loadDb);              // CSDL được sửa trực tiếp bởi lớp rules, sau đó commit() để vẽ lại
  const [ver, setVer] = useState(0);
  const [user, setUserState] = useState(() => { try { return db.users.find((u) => u.id === sessionStorage.getItem(SKEY)) || null; } catch { return null; } });
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  const commit = useCallback(() => { persist(db); setVer((v) => v + 1); }, [db]);
  const toast = useCallback((msg, type) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'err' ? 6000 : 3000);
  }, []);
  const act = useCallback((fn, okMsg, celebrate) => { // chạy một thao tác nghiệp vụ, báo kết quả bằng toast
    try { const r = fn(); commit(); toast(typeof r === 'string' ? r : okMsg || 'Thành công', 'ok'); if (celebrate) confetti(); return true; }
    catch (e) { toast(e.message, 'err'); return false; }
  }, [commit, toast]);
  const setUser = useCallback((u) => { setUserState(u); try { u ? sessionStorage.setItem(SKEY, u.id) : sessionStorage.removeItem(SKEY); } catch { /* bỏ qua */ } }, []);
  const reset = useCallback(() => {
    const fresh = Seed.build(); Object.keys(db).forEach((k) => delete db[k]); Object.assign(db, fresh);
    setUserState((u) => (u ? db.users.find((x) => x.id === u.id) || null : u)); commit(); toast('Đã khôi phục dữ liệu demo', 'ok');
  }, [db, commit, toast]);

  const value = useMemo(() => ({ db, ver, user, setUser, commit, toast, act, reset, modal, openModal: setModal, closeModal: () => setModal(null) }), [db, ver, user, setUser, commit, toast, act, reset, modal]);
  return (
    <Ctx.Provider value={value}>
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
