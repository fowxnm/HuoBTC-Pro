import "./HomeCarousel.css";
import { createSignal, onMount, onCleanup } from "solid-js";

const SLIDES = [
  { src: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=800&auto=format&fit=crop", alt: "Crypto Trading" },
  { src: "https://images.unsplash.com/photo-1605792657660-596af9009e82?q=80&w=800&auto=format&fit=crop", alt: "Gold Bitcoin" },
  { src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop", alt: "Data Dashboard" },
  { src: "https://images.unsplash.com/photo-1639762681057-408e52192e55?q=80&w=800&auto=format&fit=crop", alt: "Digital Assets" },
];

const AUTO_MS = 4000;

export default function HomeCarousel() {
  const [idx, setIdx] = createSignal(0);
  let timer: ReturnType<typeof setInterval> | null = null;
  let trackRef: HTMLDivElement | undefined;
  let touchX = 0;

  function startAuto() {
    stopAuto();
    timer = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), AUTO_MS);
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

  onMount(startAuto);
  onCleanup(stopAuto);

  // 手指滑动
  function onTouchStart(e: TouchEvent) {
    stopAuto();
    touchX = e.touches[0].clientX;
  }
  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx < -40) setIdx(i => (i + 1) % SLIDES.length);
    else if (dx > 40) setIdx(i => (i - 1 + SLIDES.length) % SLIDES.length);
    startAuto();
  }

  return (
    <div class="hc-wrap">
      <div
        class="hc-track"
        ref={trackRef}
        style={{ transform: `translateX(-${idx() * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {SLIDES.map(s => (
          <div class="hc-slide">
            <img src={s.src} alt={s.alt} class="hc-img" loading="lazy" draggable={false} />
          </div>
        ))}
      </div>
      {/* 圆点指示器 */}
      <div class="hc-dots">
        {SLIDES.map((_, i) => (
          <button
            type="button"
            class="hc-dot"
            classList={{ "hc-dot-on": idx() === i }}
            onClick={() => { setIdx(i); stopAuto(); startAuto(); }}
          />
        ))}
      </div>
    </div>
  );
}
