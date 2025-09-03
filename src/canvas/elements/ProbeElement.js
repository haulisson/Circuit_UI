import { BaseElement } from "./BaseElement.js";

export class ProbeElement extends BaseElement {
  // Sonda de tensão de 1 ponto (referência implícita ao nó)
  constructor(x, y, rotation = 0, name = "Vprobe") {
    super({
      type: "probe",
      x, y, rotation,
      properties: { name },
      schema: { name: { type: "string", required: true } }
    });
    this.addPort("P", 0, 0);
    this.updateCoords();
  }

  draw(c) {
    if (!this.visible) return;
    const P = this.getPort("P");

    // eixo U a partir da rotação (usamos transformOffset para obter um vetor unitário aproximado)
    const pU = this.transformOffset(0, 1); // um passo ao longo de U
    const len = Math.hypot(pU[0], pU[1]) || 1;
    const Ux = pU[0] / len, Uy = pU[1] / len;
    const Vx = -Uy,  Vy = Ux;
    const L2W = (lx, ly) => [P.x + Ux*ly + Vx*lx, P.y + Uy*ly + Vy*lx];

    c.save();
    c.lineWidth = 2;
    c.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";

    // desenha um “pino” + círculo pequeno
    let p;
    c.beginPath();
    p = L2W(0, 0);  c.moveTo(p[0], p[1]);
    p = L2W(0, 16); c.lineTo(p[0], p[1]); c.stroke();

    const [cx, cy] = L2W(0, 20);
    c.beginPath();
    c.arc(cx, cy, 4, 0, Math.PI * 2);
    c.stroke();

    // nome deslocado para fora (lado +V)
    const gap = 12;
    const nx = cx + Vx * gap, ny = cy + Vy * gap;
    c.fillStyle = "#bdbdbd";
    c.font = "12px sans-serif";
    c.textBaseline = "middle";
    c.textAlign = (Vx >= 0 ? "left" : "right");
    if (this.properties.name) c.fillText(this.properties.name, nx, ny);

    c.restore();
  }

  getBounds() {
    const P = this.getPort("P");
    const pad = 16;
    return { x: P.x - pad, y: P.y - pad, w: pad*2, h: pad*2 + 10 };
  }

  toNetlist() {
    const p = this.getPort("P");
    return ["probe", { name: this.properties.name, pin: [p.x, p.y] }];
  }
}

export default ProbeElement;
