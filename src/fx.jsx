import { useEffect, useRef, useState } from 'react';

/* Hiện dần khi cuộn tới; delay (ms) để các thẻ xuất hiện lần lượt */
export function Reveal({ delay = 0, className = '', children }) {
  const ref = useRef(null), [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (document.hidden || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${seen ? 'in' : ''} ${className}`}>{children}</div>;
}

/* Số đếm tăng dần từ 0 */
export function CountUp({ to, format = (n) => Math.round(n).toLocaleString('vi-VN'), duration = 900 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof to !== 'number') return;
    if (document.hidden) { setV(to); return; }
    const t0 = Date.now();
    const id = setInterval(() => { const p = Math.min(1, (Date.now() - t0) / duration); setV(to * (1 - Math.pow(1 - p, 3))); if (p >= 1) clearInterval(id); }, 30);
    return () => clearInterval(id);
  }, [to, duration]);
  return typeof to === 'number' ? format(v) : to;
}

export function useScrolled(px = 8) {
  const [s, setS] = useState(false);
  useEffect(() => { const f = () => setS(scrollY > px); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, [px]);
  return s;
}

/* Chữ tự gõ và đổi lần lượt giữa các cụm từ */
export function Typewriter({ words, speed = 70, hold = 1600 }) {
  const [i, setI] = useState(0), [n, setN] = useState(0), [del, setDel] = useState(false);
  useEffect(() => {
    if (document.hidden) { setN(words[0].length); return; }
    const w = words[i];
    const id = setTimeout(() => {
      if (!del && n < w.length) setN(n + 1);
      else if (!del) setDel(true);
      else if (n > 0) setN(n - 1);
      else { setDel(false); setI((i + 1) % words.length); }
    }, !del && n === w.length ? hold : del ? speed / 2 : speed);
    return () => clearTimeout(id);
  }, [n, del, i, words, speed, hold]);
  return <span>{words[i].slice(0, n)}<i className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] animate-blink bg-current not-italic" /></span>;
}

/* Thẻ nghiêng 3D theo chuột + ánh sáng đi theo con trỏ */
export function Tilt({ className = '', max = 7, children }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current, r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.classList.add('moving');
    el.style.setProperty('--ry', `${(x - 0.5) * max * 2}deg`); el.style.setProperty('--rx', `${(0.5 - y) * max * 2}deg`);
    el.style.setProperty('--mx', `${x * 100}%`); el.style.setProperty('--my', `${y * 100}%`);
  };
  const leave = () => { const el = ref.current; el.classList.remove('moving'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
  return <div ref={ref} onMouseMove={move} onMouseLeave={leave} className={`tilt ${className}`}>{children}</div>;
}

/* Thanh tiến độ cuộn trang */
export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => { const f = () => setP(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  return <div className="progress-bar fixed top-0 left-0 z-30 h-1 w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500" style={{ transform: `scaleX(${p})` }} />;
}

/* Pháo giấy: gọi confetti() khi một việc quan trọng thành công */
export function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 70) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#6366f1', '#f59e0b', '#ec4899', '#10b981', '#38bdf8', '#a855f7'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    Object.assign(el.style, { position: 'fixed', left: x + 'px', top: y + 'px', width: 6 + Math.random() * 6 + 'px', height: 8 + Math.random() * 8 + 'px', background: colors[i % colors.length], borderRadius: Math.random() > 0.5 ? '50%' : '2px', zIndex: 9999, pointerEvents: 'none' });
    document.body.appendChild(el);
    const dx = (Math.random() - 0.5) * 700, dy = -150 - Math.random() * 350, rot = Math.random() * 720;
    el.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * 0.7}px,${dy}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx}px,${dy + 650}px) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 1500 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => el.remove();
  }
}
