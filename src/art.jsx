/* Hình minh họa động bằng CSS/SVG thuần (không cần ảnh ngoài) */

const Orbiter = ({ angle, children, size = 'size-12', rev }) => (
  <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div style={{ transform: `rotate(${-angle}deg)` }}>
        <div className={rev ? 'animate-orbit' : 'animate-orbit-rev'}>
          <div className={`${size} grid place-items-center rounded-2xl border border-white/40 bg-white/20 text-2xl shadow-lg shadow-black/10 backdrop-blur-md`}>{children}</div>
        </div>
      </div>
    </div>
  </div>
);

const Bubble = ({ className, delay = 0, children }) => (
  <div className={`absolute ${className}`} style={{ animationDelay: `${delay}s` }}>
    <div style={{ animationDelay: `${delay}s` }} className="animate-bubble rounded-2xl rounded-bl-sm border border-white/50 bg-white/90 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap text-slate-800 shadow-xl shadow-black/15">{children}</div>
  </div>
);

export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]" aria-hidden>
      <div className="absolute inset-[16%] animate-pulse rounded-full bg-gradient-to-br from-amber-300 via-pink-400 to-violet-500 opacity-70 blur-2xl" />
      {/* quỹ đạo ngoài */}
      <div className="absolute inset-[4%] animate-orbit rounded-full border border-dashed border-white/40">
        <Orbiter angle={0}>📚</Orbiter><Orbiter angle={120}>🎧</Orbiter><Orbiter angle={240}>✏️</Orbiter>
      </div>
      {/* quỹ đạo trong, quay ngược chiều */}
      <div className="absolute inset-[24%] animate-orbit-rev rounded-full border border-white/25">
        <Orbiter angle={60} size="size-10" rev>🌍</Orbiter><Orbiter angle={240} size="size-10" rev>⭐</Orbiter>
      </div>
      {/* lõi */}
      <div className="absolute inset-[36%] animate-float">
        <div className="relative grid size-full place-items-center rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white shadow-2xl shadow-indigo-900/40 ring-4 ring-white/30">
          <span className="absolute inset-0 animate-ping rounded-3xl bg-white/20 [animation-duration:2.6s]" />
          <div className="relative text-center leading-none"><div className="text-3xl">🎓</div><b className="mt-1 block text-2xl tracking-tight">ABC</b></div>
        </div>
      </div>
      <Bubble className="top-[6%] left-[-2%]" delay={0}>Hello! 👋</Bubble>
      <Bubble className="top-[20%] right-[-4%]" delay={1.2}>Xin chào!</Bubble>
      <Bubble className="bottom-[10%] left-[2%]" delay={2.4}>Let’s talk 💬</Bubble>
      <Bubble className="right-[0%] bottom-[2%]" delay={0.6}>Bonjour ✨</Bubble>
      {[['8%', '48%', 0], ['90%', '52%', 0.8], ['46%', '2%', 1.6], ['62%', '94%', 0.4]].map(([l, t, d], i) => (
        <i key={i} className="absolute animate-twinkle text-xl text-yellow-200 not-italic" style={{ left: l, top: t, animationDelay: `${d}s` }}>✦</i>
      ))}
    </div>
  );
}

/* Sóng chuyển cảnh cuối hero */
export const Wave = () => (
  <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-14 w-full text-[#f6f8fc]" aria-hidden>
    <path fill="currentColor" d="M0 50 C 240 100 480 0 720 40 C 960 80 1200 10 1440 50 L1440 90 L0 90 Z" />
  </svg>
);

export const TESTIMONIALS = [
  ['Ngọc Anh', 'Sinh viên năm 3', 'Mình mất gốc nhưng sau 3 tháng đã tự tin nói chuyện với bạn nước ngoài. Lớp nhỏ nên cô nhớ từng bạn!', '🧑‍🎓'],
  ['Minh Quân', 'Nhân viên văn phòng', 'Lịch học linh hoạt, bận công tác vẫn được bảo lưu và chuyển lớp rất nhanh. Rất yên tâm.', '👨‍💼'],
  ['Phương Linh', 'Phụ huynh', 'Con mình thích đi học vì toàn trò chơi và bài hát. Giáo viên báo cáo sau mỗi buổi rất rõ ràng.', '👩'],
  ['Đức Huy', 'Học viên IELTS', 'Lộ trình IELTS bài bản, được chấm chữa kỹ từng bài viết. Band điểm tăng thấy rõ.', '🎯'],
  ['Thu Trang', 'Giáo viên mầm non', 'Học phí minh bạch, đóng 50% là giữ được chỗ. Học bù buổi vắng cũng dễ dàng.', '🌸'],
  ['Hải Nam', 'Kỹ sư phần mềm', 'Các chi nhánh đều gần nhà, chọn khung giờ tối rất tiện. Đã giới thiệu cho cả đồng nghiệp.', '💻'],
];
