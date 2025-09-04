// src/ui/views/GraphView.js
export class GraphView {
  /**
   * @param {{ app:any, signals?:Array<{name:string, data:number[]}> }} opts
   */
  constructor({ app, signals = [] }) {
    this.app = app;
    this.signals = signals.length ? signals : this.#dummySignals();

    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      width: "100%", height: "100%", background: "#111", color: "#eee",
      fontFamily: "ui-monosans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      display: "flex", flexDirection: "column"
    });

    const header = document.createElement("div");
    header.textContent = "Graph View";
    Object.assign(header.style, {
      padding: "6px 8px", background: "#222", borderBottom: "1px solid #333", fontWeight: "600"
    });

    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, { flex: "1", background: "#000", display: "block" });

    this.root.append(header, this.canvas);

    // auto-resize
    this._ro = new ResizeObserver(() => this.#resizeCanvas());
    this._ro.observe(this.root);

    // primeira render
    this.#resizeCanvas();
    this.render();
  }

  getElement() { return this.root; }

  setSignals(signals) {
    if (Array.isArray(signals) && signals.length) {
      this.signals = signals;
      this.render();
    }
  }

  #resizeCanvas() {
    const rect = this.root.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(200, Math.floor(rect.width));
    const h = Math.max(140, Math.floor(rect.height - 36)); // 36px header
    if (this.canvas.width !== Math.floor(w * dpr) || this.canvas.height !== Math.floor(h * dpr)) {
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      const ctx = this.canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.render();
    }
  }

  render() {
    const ctx = this.canvas.getContext("2d");
    const w = parseInt(this.canvas.style.width, 10) || 600;
    const h = parseInt(this.canvas.style.height, 10) || 300;

    // fundo
    ctx.clearRect(0, 0, w, h);

    // grid leve
    ctx.save();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    for (let x = 50; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40)  { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();

    // eixos
    ctx.save();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
    ctx.moveTo(40, 0);  ctx.lineTo(40, h);
    ctx.stroke();
    ctx.restore();

    // legendas
    ctx.save();
    ctx.fillStyle = "#aaa";
    ctx.font = "12px monospace";
    ctx.fillText("t", w - 12, h/2 + 14);
    ctx.fillText("0", 28, h/2 + 12);
    ctx.restore();

    // sinais
    const palette = ["#00e676", "#ff5252", "#18ffff", "#ffd740", "#7c4dff", "#ff6e40"];
    this.signals.forEach((sig, i) => {
      const color = palette[i % palette.length];
      const N = Math.max(2, (sig.data?.length || 0));
      if (N < 2) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < N; k++) {
        const x = 40 + (k / (N - 1)) * (w - 50);
        const yy = h / 2 - (sig.data[k] || 0) * (h * 0.35); // escala simples
        if (k === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();

      // legenda
      ctx.fillStyle = color;
      ctx.font = "12px monospace";
      ctx.fillText(sig.name || `sig${i+1}`, 10, 16 + i * 14);
      ctx.restore();
    });
  }

  #dummySignals() {
    const N = 240;
    const t = Array.from({ length: N }, (_, i) => i);
    return [
      { name: "V(out)", data: t.map(i => Math.sin(i/20)) },
      { name: "I(R1)",  data: t.map(i => (i < 80 ? 0 : 1)) }
    ];
  }
}

export default GraphView;
