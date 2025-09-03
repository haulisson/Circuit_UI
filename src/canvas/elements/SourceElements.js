import { BaseElement } from "./BaseElement.js";

export class SourceElement extends BaseElement {
  // properties: { kind: "V"|"I", value: "5V"|"1A", name: "V1/I1", polarity?: "+"|"-" }
  constructor(x, y, rotation = 0, kind = "V", value = "5V", name = "V1") {
    super({
      type: "source",
      x, y, rotation,
      properties: { kind, value, name, polarity: "+" },
      schema: {
        kind:  { type: "string", enum: ["V","I"], required: true },
        value: { type: "string", required: true },
        name:  { type: "string", required: true }
      }
    });
    this.addPort("A", 0, 0);
    this.addPort("B", 0, 48);
    this.updateCoords();
  }

  draw(c) {
    if (!this.visible) return;
    const A = this.getPort("A"), B = this.getPort("B");

    const ux = B.x - A.x, uy = B.y - A.y;
    const L = Math.hypot(ux, uy) || 1;
    const Ux = ux / L, Uy = uy / L;
    const Vx = -Uy, Vy = Ux;
    const L2W = (lx, ly) => [A.x + Ux*ly + Vx*lx, A.y + Uy*ly + Vy*lx];

    c.save();
    c.lineWidth = 2;
    c.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";

    // pernas
    c.beginPath();
    let p;
    p = L2W(0, 0);  c.moveTo(p[0], p[1]);
    p = L2W(0, 12); c.lineTo(p[0], p[1]);
    p = L2W(0, 48); c.moveTo(p[0], p[1]);
    p = L2W(0, 36); c.lineTo(p[0], p[1]);
    c.stroke();

    // círculo central (raio 10) centrado em t=24
    const R = 10;
    const [cx, cy] = L2W(0, 24);
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.stroke();

    // símbolo interno
    c.beginPath();
    if ((this.properties.kind || "V") === "I") {
      // seta de corrente ao longo de +U
      const tip = L2W(0, 24 + R - 2);
      const tail = L2W(0, 24 - R + 2);
      c.moveTo(tail[0], tail[1]); c.lineTo(tip[0], tip[1]);
      // flecha (duas linhas laterais)
      const a1 = L2W( 4, 24 + R - 6);
      const a2 = L2W(-4, 24 + R - 6);
      c.moveTo(tip[0], tip[1]); c.lineTo(a1[0], a1[1]);
      c.moveTo(tip[0], tip[1]); c.lineTo(a2[0], a2[1]);
    } else {
      // tensão: sinal + e - ao longo de V
      const plus = L2W(0, 24);
      const h1 = L2W( 4, 24), h2 = L2W(-4, 24);
      const v1 = L2W( 0, 24 - 4), v2 = L2W(0, 24 + 4);
      // '+'
      c.moveTo(h1[0], h1[1]); c.lineTo(h2[0], h2[1]);
      c.moveTo(v1[0], v1[1]); c.lineTo(v2[0], v2[1]);
      // '-'
      const m1 = L2W( -8, 24 + 0), m2 = L2W(-12, 24 + 0);
      c.moveTo(m1[0], m1[1]); c.lineTo(m2[0], m2[1]);
    }
    c.stroke();

    // textos (valor / nome) deslocados ±V do centro
    c.fillStyle = "#bdbdbd";
    c.font = "12px sans-serif";
    c.textBaseline = "middle";

    const gap = 16;
    const valX = cx + Vx * gap, valY = cy + Vy * gap;
    const namX = cx - Vx * gap, namY = cy - Vy * gap;

    const alignFor = (vx) => (vx >= 0 ? "left" : "right");
    c.textAlign = alignFor(Vx);
    if (this.properties.value) c.fillText(this.properties.value, valX, valY);
    c.textAlign = alignFor(-Vx);
    if (this.properties.name)  c.fillText(this.properties.name,  namX, namY);

    c.restore();
  }

  getBounds() {
    const A = this.getPort("A"), B = this.getPort("B");
    const pad = 12;
    const minX = Math.min(A.x, B.x) - pad;
    const minY = Math.min(A.y, B.y) - pad;
    const maxX = Math.max(A.x, B.x) + pad;
    const maxY = Math.max(A.y, B.y) + pad;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  toNetlist() {
    const pins = this.getPorts().map(cp => [cp.x, cp.y]);
    const kind = (this.properties.kind || "V").toLowerCase(); // "v"|"i"
    return [kind, { name: this.properties.name, value: this.properties.value, pins }];
  }
}

export default SourceElement;
