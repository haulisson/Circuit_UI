// WireElement.js
// Representa um fio entre dois pontos (coordenadas absolutas no momento da criação).

import { BaseElement } from "./BaseElement.js";

export class WireElement extends BaseElement {
  constructor(x1, y1, x2, y2) {
    super("wire", x1, y1, 0);
    this.dx = x2 - x1;
    this.dy = y2 - y1;

    // dois CPs: origem (0,0) e destino (dx,dy)
    this.addConnection(0, 0);
    this.addConnection(this.dx, this.dy);

    // bbox inicial
    this.updateCoords();
  }

  otherEnd(cp) {
    return cp === this.connections[0] ? this.connections[1] : this.connections[0];
  }

  draw(ctx) {
    const a = this.connections[0];
    const b = this.connections[1];

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  /** Teste de proximidade ponto-segmento para seleção/“hit test” */
  near(x, y, tolerance = 5) {
    const a = this.connections[0];
    const b = this.connections[1];
    const dist = pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
    return dist <= tolerance;
  }

  /** BBox mundial baseado nos dois pontos */
  getBounds() {
    const a = this.connections[0];
    const b = this.connections[1];
    const minX = Math.min(a.x, b.x), minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x, b.x), maxY = Math.max(a.y, b.y);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  clone(x, y) {
    return new WireElement(x, y, x + this.dx, y + this.dy);
  }

  toNetlist() {
    const a = this.connections[0];
    const b = this.connections[1];
    return ["w", [a.x, a.y, b.x, b.y]];
  }
}

/** Distância do ponto (px,py) ao segmento AB */
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
