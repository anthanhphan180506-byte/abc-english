import { useState } from 'react';
import { useStore } from './store.jsx';
import { cx } from './lib/util.js';
import { confetti } from './fx.jsx';

const V = {
  pri: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:brightness-110', ghost: 'bg-white border border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50',
  ok: 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-md shadow-green-600/25 hover:brightness-110', bad: 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-600/25 hover:brightness-110', warn: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 shadow-md shadow-amber-500/30 hover:brightness-105',
  line: 'bg-transparent border border-white/50 text-white hover:bg-white/10',
};
const btnCls = (v, sm, extra) => cx('inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition duration-200 hover:-translate-y-px active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50', sm ? 'px-2.5 py-1 text-[13px]' : 'px-4 py-2 text-sm', V[v || 'pri'], extra);
export const Btn = ({ v, sm, className, type = 'button', ...p }) => <button type={type} {...p} className={btnCls(v, sm, className)} />;
export const LinkBtn = ({ v, sm, className, ...p }) => <a {...p} className={btnCls(v, sm, className)} />;

const BC = {
  'Mở đăng ký': 'blue', 'Đã hủy': 'red', 'Đang học': 'green', 'Chờ đóng phí': 'amber', 'Đã xác nhận': 'green', 'Bảo lưu': 'purple', 'Hoàn thành': 'teal',
  'Chờ duyệt': 'amber', 'Đã duyệt': 'green', 'Từ chối': 'red', 'Hoạt động': 'green', 'Ngừng': 'red', 'Đang dạy': 'green', 'Nghỉ': 'red', 'Đang bảo lưu': 'purple',
  'Đã học lại': 'teal', 'Hết hạn': 'red', 'Mới': 'amber', 'Đã liên hệ': 'blue', 'Đã ghi danh': 'green', 'Có mặt': 'green', 'Vắng': 'red', 'Học bù': 'purple', 'Đã học': 'green', 'Đủ điều kiện mở': 'green', 'Hôm nay': 'blue',
};
const BCL = { gray: 'bg-slate-100 text-slate-600', blue: 'bg-blue-100 text-blue-800', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', purple: 'bg-violet-100 text-violet-800', teal: 'bg-teal-100 text-teal-800' };
const PENDING = ['Chờ duyệt', 'Mới', 'Chờ đóng phí'];
export const Badge = ({ t, c }) => <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', BCL[c || BC[t] || 'gray'])}>{PENDING.includes(t) && <i className="size-1.5 animate-pulse rounded-full bg-current" />}{t}</span>;

export const Card = ({ className, ...p }) => <div {...p} className={cx('rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/10', className)} />;
export const Note = ({ children }) => <div className="mb-4 animate-fade-up rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-2.5 text-[13.5px] text-amber-900">{children}</div>;
export const Empty = ({ children }) => <div className="p-6 text-center text-slate-500">{children}</div>;
export const H3 = ({ children }) => <h3 className="mb-2.5 text-base font-bold">{children}</h3>;
export const Bar = ({ v, max, c = 'bg-blue-600' }) => <div className="h-2 min-w-[90px] overflow-hidden rounded-full bg-slate-200"><i className={cx('block h-full animate-grow rounded-full', c)} style={{ width: `${Math.min(100, max ? (v / max) * 100 : 0)}%` }} /></div>;
export const Meter = ({ v, min }) => <Bar v={v} max={min} c={v >= min ? 'bg-green-600' : 'bg-amber-500'} />;

export function Table({ head, rows, right = [] }) {
  return (
    <div className="mb-5 animate-fade-in overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
      <table className="w-full border-collapse text-sm">
        <thead><tr>{head.map((h, i) => <th key={i} className={cx('bg-slate-50/80 px-3.5 py-3 text-xs font-bold tracking-wide whitespace-nowrap text-slate-500 uppercase', right.includes(i) ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
        <tbody className="rows [&_td]:border-b [&_td]:border-slate-200 [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-middle [&_tr:last-child_td]:border-0 [&_tr:hover]:bg-indigo-50/40 [&_tr]:transition-colors">
          {rows.length ? rows : <tr><td colSpan={head.length}><Empty>Chưa có dữ liệu.</Empty></td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export const INP = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(59,130,246,.15)] focus:outline-none';
export const Fld = ({ label, children }) => <label className="mb-3 flex flex-col gap-1 text-[13.5px] font-semibold text-slate-500"><span>{label}</span>{children}</label>;
export const In = ({ className, ...p }) => <input {...p} className={cx(INP, className)} />;
export const Area = ({ className, ...p }) => <textarea rows={3} {...p} className={cx(INP, className)} />;
export const Sel = ({ options, ph, className, ...p }) => (
  <select {...p} className={cx(INP, className)}>
    {ph !== undefined && <option value="">{ph}</option>}
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);
export const Filter = ({ className, ...p }) => <Sel {...p} className={cx('w-auto min-w-[150px]', className)} />;

/* Hộp thoại có biểu mẫu: onSubmit(FormData) trả về thông báo hoặc ném lỗi (hiện ngay trong hộp thoại) */
/* Hộp thoại xác nhận (thay cho confirm() mặc định của trình duyệt) */
export function Confirm({ title, message, ok = 'Xác nhận', danger, onConfirm }) {
  const { closeModal } = useStore();
  return (
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-slate-900/55 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
      <div role="alertdialog" className="w-full max-w-md animate-pop rounded-2xl bg-white p-6 shadow-2xl">
        <div className={cx('mb-3 grid size-12 place-items-center rounded-full text-2xl', danger ? 'bg-red-100' : 'bg-blue-100')}>{danger ? '⚠️' : '❓'}</div>
        <h3 className="text-lg font-bold">{title}</h3>
        {message && <p className="mt-1.5 text-slate-600">{message}</p>}
        <div className="mt-5 flex justify-end gap-2.5">
          <Btn v="ghost" onClick={closeModal}>Hủy</Btn>
          <Btn autoFocus v={danger ? 'bad' : 'pri'} onClick={() => { closeModal(); onConfirm(); }}>{ok}</Btn>
        </div>
      </div>
    </div>
  );
}
/* ask({title, message, ok, danger, onConfirm}) – mở hộp xác nhận */
export const useAsk = () => { const { openModal } = useStore(); return (o) => openModal(<Confirm {...o} />); };

/* Hộp thoại có biểu mẫu. Nếu có prop `confirm`, bấm nút lưu sẽ hỏi lại "Bạn có chắc chắn?" trước khi thực hiện */
export function Form({ title, children, onSubmit, ok = 'Lưu', lg, confirm, celebrate, onDone }) {
  const { closeModal, commit, toast } = useStore();
  const [err, setErr] = useState(''), [asking, setAsking] = useState(false);
  const submit = (e) => {
    e.preventDefault(); if (!onSubmit) return;
    if (confirm && !asking) { setErr(''); setAsking(true); return; }
    try { const msg = onSubmit(new FormData(e.target)); closeModal(); if (commit()) { toast(msg || 'Đã lưu', 'ok'); if (celebrate) confetti(); if (onDone) onDone(); } }
    catch (x) { setErr(x.message); setAsking(false); }
  };
  return (
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-slate-900/55 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={cx('flex max-h-[92vh] w-full animate-pop flex-col rounded-2xl bg-white shadow-2xl', lg ? 'max-w-4xl' : 'max-w-xl')}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="text-lg font-bold">{title}</h3><button type="button" aria-label="Đóng" onClick={closeModal} className="cursor-pointer text-2xl leading-none text-slate-500">×</button></div>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="overflow-auto px-5 py-4">{children}</div>
          {err && <div className="px-5 pb-2.5 font-semibold whitespace-pre-wrap text-red-600">{err}</div>}
          {asking ? (
            <div className="flex animate-fade-in flex-wrap items-center justify-end gap-2.5 border-t border-amber-200 bg-amber-50 px-5 py-3.5">
              <span className="mr-auto font-semibold text-amber-900">⚠️ {confirm}</span>
              <Btn v="ghost" onClick={() => setAsking(false)}>Quay lại</Btn><Btn type="submit" autoFocus>Xác nhận</Btn>
            </div>
          ) : (
            <div className="flex justify-end gap-2.5 border-t border-slate-200 px-5 py-3.5"><Btn v="ghost" onClick={closeModal}>{onSubmit ? 'Hủy' : 'Đóng'}</Btn>{onSubmit && <Btn type="submit">{ok}</Btn>}</div>
          )}
        </form>
      </div>
    </div>
  );
}
export const Row2 = ({ children }) => <div className="grid gap-x-3.5 sm:grid-cols-2">{children}</div>;
