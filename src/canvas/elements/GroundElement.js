import { BaseElement } from "./BaseElement.js";

export class GroundElement extends BaseElement {
  constructor(x, y, rotation = 0, name = "0") {
    super({
      type: "ground",
      x, y, rotation,
      properties: { name }, // "0" por padrão
      schema: { name: { type: "string", required: true } }
    });
    this.addPort("GND", 0, 0); // único pino
    this.updateCoords();
  }

  draw(c) {
    if (!this.visible) return;
    const G = this.getPort("GND");

    // eixos segundo rotação
    const pU = this.transformOffset(0, 1); // “para baixo” local
    const L = Math.hypot(pU[0], pU[1]) || 1;
    const Ux = pU[0] / L, Uy = pU[1] / L; // longitudinal
    const Vx = -Uy,  Vy = Ux;             // lateral
    const L2W = (lx, ly) => [G.x + Ux*ly + Vx*lx, G.y + Uy*ly + Vy*lx];

    c.save();
    c.lineWidth = 2;
    c.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";

    // haste (0..4)
    c.beginPath();
    let p;
    p = L2W(0, 0);  c.moveTo(p[0], p[1]);
    p = L2W(0, 4);  c.lineTo(p[0], p[1]);
    c.stroke();

    // três linhas decrescentes
    c.beginPath();
    const widths = [12, 8, 4];
    const ys = [6, 9, 12];
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i] / 2;
      const y = ys[i];
      const a = L2W(-w, y), b = L2W(w, y);
      c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
    }
    c.stroke();

    // texto (nome) para fora
    const gap = 10;
    const [cx, cy] = L2W(0, 8);
    const tx = cx + Vx * gap, ty = cy + Vy * gap;
    c.fillStyle = "#bdbdbd";
    c.font = "12px sans-serif";
    c.textBaseline = "middle";
    c.textAlign = (Vx >= 0 ? "left" : "right");
    if (this.properties.name) c.fillText(this.properties.name, tx, ty);

    c.restore();
  }

  getBounds() {
    const G = this.getPort("GND");
    const pad = 12;
    return { x: G.x - pad, y: G.y - pad, w: pad*2, h: pad*2 };
  }

  toNetlist() {
    const p = this.getPort("GND");
    return ["gnd", { name: this.properties.name, pin: [p.x, p.y] }];
  }
}

export default GroundElement;
