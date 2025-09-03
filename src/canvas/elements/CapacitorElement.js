import { BaseElement } from "./BaseElement.js";

export class CapacitorElement extends BaseElement {
  constructor(x, y, rotation = 0, value = "1u", name = "C1") {
    super({
      type: "capacitor",
      x, y, rotation,
      properties: { value, name },
      schema: {
        value: { type: "string", required: true },
        name:  { type: "string", required: true }
      }
    });
    // portas ao longo do eixo local (A->B)
    this.addPort("A", 0, 0);
    this.addPort("B", 0, 48);
    this.updateCoords();
  }

  draw(c) {
    if (!this.visible) return;
    const A = this.getPort("A"), B = this.getPort("B");

    // eixos locais
    const ux = B.x - A.x, uy = B.y - A.y;
    const L = Math.hypot(ux, uy) || 1;
    const Ux = ux / L, Uy = uy / L;    // longitudinal (A->B)
    const Vx = -Uy,  Vy = Ux;          // perpendicular

    // helper local->mundo
    const L2W = (lx, ly) => [A.x + Ux*ly + Vx*lx, A.y + Uy*ly + Vy*lx];

    c.save();
    c.lineWidth = 2;
    c.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";

    // pernas até as placas
    c.beginPath();
    let p;
    p = L2W(0, 0);  c.moveTo(p[0], p[1]);
    p = L2W(0, 18); c.lineTo(p[0], p[1]);
    p = L2W(0, 48); c.moveTo(p[0], p[1]);
    p = L2W(0, 30); c.lineTo(p[0], p[1]);
    c.stroke();

    // duas placas paralelas (largura ~12px), separadas por ~6px
    const halfW = 6;
    c.beginPath();
    let a1 = L2W(-halfW, 18), a2 = L2W(halfW, 18);
    c.moveTo(a1[0], a1[1]); c.lineTo(a2[0], a2[1]);
    let b1 = L2W(-halfW, 30), b2 = L2W(halfW, 30);
    c.moveTo(b1[0], b1[1]); c.lineTo(b2[0], b2[1]);
    c.stroke();

    // textos no centro (t=24), deslocados ±V
    c.fillStyle = "#bdbdbd";
    c.font = "12px sans-serif";
    c.textBaseline = "middle";
    const [cx, cy] = L2W(0, 24);
    const gap = 14;

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
    const pad = 10;
    const minX = Math.min(A.x, B.x) - pad;
    const minY = Math.min(A.y, B.y) - pad;
    const maxX = Math.max(A.x, B.x) + pad;
    const maxY = Math.max(A.y, B.y) + pad;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  toNetlist() {
    const pins = this.getPorts().map(cp => [cp.x, cp.y]);
    return ["c", { name: this.properties.name, value: this.properties.value, pins }];
  }
}

export default CapacitorElement;
