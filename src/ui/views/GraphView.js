// src/ui/views/GraphView.js
export class GraphView {
  /**
   * @param {{ app:any, signals?:Array<{name:string, data:number[]}> }} opts
   */
  constructor({ app, signals = [] }) {
    this.app = app;
    this.signals = signals.length ? signals : this.#dummySignals();

    this.root = document.createElement("div");
    this.root.style.width = "100%";
    this.root.style.height = "100%";
    this.root.style.background = "#111";
    this.root.style.color = "#eee";
    this.root.style.fontFamily = "monospace";
    this.root.style.display = "flex";
    this.root.style.flexDirection = "column";

    const header = document.createElement("div");
    header.textContent = "Graph View (demo)";
    header.style.padding = "4px";
    header.style.background = "#222";
    header.style.fontWeight = "bold";

    this.canvas = document.createElement("canvas");
    this.canvas.width = 600;
    this.canvas.height = 300;
    this.canvas.style.flex = "1";
    this.canvas.style.background = "#000";

    this.root.append(header, this.canvas);
    this.render();
  }

  getElement() { return this.root; }

  render() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const w = this.canvas.width;
    const h = this.canvas.height;

    // eixo
    ctx.strokeStyle = "#555";
    ctx.beginPath();
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
    ctx.moveTo(40, 0); ctx.lineTo(40, h);
    ctx.stroke();

    // desenha sinais
    const colors = ["#0f0", "#f00", "#0ff", "#ff0"];
    this.signals.forEach((sig, i) => {
      ctx.strokeStyle = colors[i % colors.length];
      ctx.beginPath();
      sig.data.forEach((y, idx) => {
        const x = (idx / sig.data.length) * (w-50) + 50;
        const yy = h/2 - y * 100; // escala simplificada
        if (idx === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      });
      ctx.stroke();

      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(sig.name, 10, 20 + i*14);
    });
  }

  #dummySignals() {
    const N = 200;
    const t = [...Array(N).keys()];
    return [
      { name: "V(out)", data: t.map(i => Math.sin(i/20)) },
      { name: "I(R1)", data: t.map(i => (i<100?0:1)) }
    ];
  }
}

export default GraphView;
