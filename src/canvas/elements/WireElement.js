// WireElement.js — usando BaseElement (options) + portas nomeadas "A"/"B"
import { BaseElement } from "./BaseElement.js";

export class WireElement extends BaseElement {
  constructor(x1, y1, x2, y2) {
    super({
      type: "wire",
      x: x1,
      y: y1,
      rotation: 0,
      properties: {}
    });

    // offset relativo da ponta B
    this.dx = (typeof x2 === "number" ? x2 : x1 + 64) - x1;
    this.dy = (typeof y2 === "number" ? y2 : y1      ) - y1;

    // Portas nomeadas
    this.addPort("A", 0, 0);
    this.addPort("B", this.dx, this.dy);

    this.updateCoords();
  }

  otherEnd(cp) {
    const a = this.getPort("A");
    const b = this.getPort("B");
    return (cp === a) ? b : a;
  }

  draw(ctx) {
    if (!this.visible) return;
    const a = this.getPort("A");
    const b = this.getPort("B");

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  near(x, y, tolerance = 5) {
    const a = this.getPort("A");
    const b = this.getPort("B");
    const dist = pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
    return dist <= tolerance;
  }

  getBounds() {
    const a = this.getPort("A");
    const b = this.getPort("B");
    const minX = Math.min(a.x, b.x), minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x, b.x), maxY = Math.max(a.y, b.y);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  clone(x, y) {
    return new WireElement(x, y, x + this.dx, y + this.dy);
  }

  toNetlist() {
    const a = this.getPort("A");
    const b = this.getPort("B");
    return ["w", [a.x, a.y, b.x, b.y]];
  }
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const t = c1 / c2;
  const projx = ax + t * vx, projy = ay + t * vy;
  return Math.hypot(px - projx, py - projy);
}
