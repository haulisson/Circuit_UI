// BaseElement.js
// Classe base para todos os elementos do canvas.

import { ConnectionPoint } from "./ConnectionPoint.js";

export class BaseElement {
  /**
   * @param {string} type - identificador curto (ex: "wire", "r", "c"...)
   * @param {number} x
   * @param {number} y
   * @param {number} rotation - múltiplos de 90° (0..3)
   */
  constructor(type, x, y, rotation = 0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.rotation = rotation % 4; // 0,1,2,3 -> 0°,90°,180°,270°
    this.selected = false;
    this.properties = {};
    // boundingBox em coords do MUNDO: [x, y, w, h]
    this.boundingBox = [x, y, 0, 0];
    this.connections = [];
    // referência opcional ao modelo (CanvasModel) é atribuída quando add() no model
    this.sch = undefined;
  }

  /** Registra um ponto de conexão relativo ao elemento */
  addConnection(offsetX, offsetY) {
    const cp = new ConnectionPoint(this, offsetX, offsetY);
    this.connections.push(cp);
    // se já estiver no modelo, indexa
    if (this.sch) cp.updateLocation();
    return cp;
  }

  /** Atualiza bounding box e coordenadas absolutas dos connection points */
  updateCoords() {
    for (const cp of this.connections) cp.updateLocation();
    // fallback simples: bbox como envoltória dos CPs
    if (this.connections.length) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const cp of this.connections) {
        if (cp.x < minX) minX = cp.x;
        if (cp.y < minY) minY = cp.y;
        if (cp.x > maxX) maxX = cp.x;
        if (cp.y > maxY) maxY = cp.y;
      }
      const margin = 2;
      this.boundingBox = [minX - margin, minY - margin, (maxX - minX) + 2 * margin, (maxY - minY) + 2 * margin];
    } else {
      this.boundingBox = [this.x - 2, this.y - 2, 4, 4];
    }
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.updateCoords();
  }

  rotate(steps = 1) {
    this.rotation = (this.rotation + steps) % 4; // 90° por passo
    this.updateCoords();
  }

  /** Helpers de rotação (múltiplos de 90°) para offsets locais -> mundo */
  transformOffset(offsetX, offsetY) {
    const r = this.rotation & 3;
    switch (r) {
      case 0: return [offsetX, offsetY];
      case 1: return [-offsetY, offsetX];   // 90°
      case 2: return [-offsetX, -offsetY];  // 180°
      case 3: return [offsetY, -offsetX];   // 270°
    }
  }

  /** Retorna bbox em coords do MUNDO */
  getBounds() {
    const [x, y, w, h] = this.boundingBox;
    return { x, y, w, h };
  }

  // Para elementos concretos sobrescreverem:
  draw(_ctx) { /* no-op */ }
  toNetlist() { return []; }
}
