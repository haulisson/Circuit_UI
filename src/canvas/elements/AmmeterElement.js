import { BaseElement } from "./BaseElement.js";

export class AmmeterElement extends BaseElement {
  constructor(x, y, rotation = 0, name = "AM1") {
    super({
      type: "ammeter",
      x, y, rotation,
      properties: { name },
      schema: { name: { type: "string", required: true } }
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
    const Vx = -Uy,  Vy = Ux;
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

    // círculo “A”
    const [cx, cy] = L2W(0, 24);
    c.beginPath();
    c.arc(cx, cy, 10, 0, Math.PI * 2);
    c.stroke();

    // letra A
    c.fillStyle = this.selected ? "#39a0ff" : "#d0d0d0";
    c.font = "12px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("A", cx, cy);

    // nome/label deslocado para fora
    const gap = 16;
    const alignFor = (vx) => (vx >= 0 ? "left" : "right");
    const nx = cx + Vx * gap, ny = cy + Vy * gap;
    c.fillStyle = "#bdbdbd";
    c.textAlign = alignFor(Vx);
    if (this.properties.name) c.fillText(this.properties.name, nx, ny);

    c.restore();
  }

  toNetlist() {
    const pins = this.getPorts().map(cp => [cp.x, cp.y]);
    return ["ammeter", { name: this.properties.name, pins }];
  }
}

export default AmmeterElement;
