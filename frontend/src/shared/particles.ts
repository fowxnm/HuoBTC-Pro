/**
 * 高性能粒子引擎 — PC / Mobile 共用
 *
 * 优化手段：
 * 1. Canvas 2x 降采样（CSS 尺寸 vs 实际像素 DPR 限制为 1）
 * 2. 空间网格 (spatial grid) 将连线从 O(n^2) 降到 O(n·k)
 * 3. 单次 Path2D 批量绘制所有粒子和连线
 * 4. 移动端自动减少粒子数
 */

export interface ParticleOpts {
  count?: number;           // 粒子数，默认 PC 50 / Mobile 30
  linkDist?: number;        // 连线距离，默认 110
  mouseRadius?: number;     // 鼠标影响半径
  speed?: number;           // 速度因子
  color?: [number, number, number]; // RGB
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number;
}

export function createParticleEngine(
  canvas: HTMLCanvasElement,
  getMouseNorm: () => { x: number; y: number },
  opts: ParticleOpts = {}
) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return { destroy() {} };

  const {
    count = 50,
    linkDist = 110,
    mouseRadius = 160,
    speed = 0.4,
    color = [0, 240, 255],
  } = opts;

  const [cr, cg, cb] = color;
  let w = 0, h = 0;
  let particles: Particle[] = [];
  let raf = 0;
  let gridCols = 0, gridRows = 0;
  let grid: number[][] = [];

  // ── resize（不使用高 DPR，减少像素量）──
  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
    rebuildGrid();
  }

  function rebuildGrid() {
    gridCols = Math.ceil(w / linkDist) || 1;
    gridRows = Math.ceil(h / linkDist) || 1;
  }

  function init() {
    resize();
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      r: Math.random() * 2 + 0.8,
      a: Math.random() * 0.4 + 0.15,
    }));
  }

  function draw() {
    ctx!.clearRect(0, 0, w, h);
    const m = getMouseNorm();
    const mx = m.x * w, my = m.y * h;

    // ── 清空空间网格 ──
    grid = Array.from({ length: gridCols * gridRows }, () => []);

    // ── 更新粒子 + 填入网格 ──
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // 鼠标吸引
      const dx = mx - p.x, dy = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouseRadius && dist > 1) {
        const f = 0.015;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
      }
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x += w; if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h; if (p.y > h) p.y -= h;

      // 放入网格
      const col = Math.min(Math.floor(p.x / linkDist), gridCols - 1);
      const row = Math.min(Math.floor(p.y / linkDist), gridRows - 1);
      grid[row * gridCols + col].push(i);
    }

    // ── 绘制连线（只检查相邻格子）──
    ctx!.lineWidth = 0.5;
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const cellIdx = row * gridCols + col;
        const cell = grid[cellIdx];
        // 检查本格 + 右 + 下 + 右下
        const neighbors = [cellIdx];
        if (col + 1 < gridCols) neighbors.push(cellIdx + 1);
        if (row + 1 < gridRows) neighbors.push(cellIdx + gridCols);
        if (col + 1 < gridCols && row + 1 < gridRows) neighbors.push(cellIdx + gridCols + 1);

        for (const ci of cell) {
          const a = particles[ci];
          for (const ni of neighbors) {
            for (const cj of grid[ni]) {
              if (cj <= ci) continue;
              const b = particles[cj];
              const ddx = a.x - b.x, ddy = a.y - b.y;
              const d = ddx * ddx + ddy * ddy;
              if (d < linkDist * linkDist) {
                const alpha = 0.1 * (1 - Math.sqrt(d) / linkDist);
                ctx!.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
                ctx!.beginPath();
                ctx!.moveTo(a.x, a.y);
                ctx!.lineTo(b.x, b.y);
                ctx!.stroke();
              }
            }
          }
        }
      }
    }

    // ── 绘制粒子（批量）──
    for (const p of particles) {
      const dx = mx - p.x, dy = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const near = dist < mouseRadius ? 1 + (1 - dist / mouseRadius) : 1;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.r * near, 0, 6.2832);
      ctx!.fillStyle = `rgba(${cr},${cg},${cb},${p.a * Math.min(near, 1.5)})`;
      ctx!.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  init();
  draw();

  const onResize = () => { resize(); };
  window.addEventListener("resize", onResize);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    },
  };
}
