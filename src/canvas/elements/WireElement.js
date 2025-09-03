// WireElement.js
// Representa um fio entre dois pontos de conexão.

import { BaseElement } from "./BaseElement.js";

export class WireElement extends BaseElement {
  constructor(x1, y1, x2, y2) {
    super("wire", x1, y1, 0);
    this.dx = x2 - x1;
    this.dy = y2 - y1;
    this.addConnection(0, 0);
    this.addConnection(this.dx, this.dy);
  }

  otherEnd(cp) {
    // TODO: retornar o outro connection point do fio
  }

  draw(ctx) {
    // TODO: desenhar linha entre os dois connection points
  }

  clone(x, y) {
    return new WireElement(x, y, x + this.dx, y + this.dy);
  }

  near(x, y) {
    // TODO: calcular se (x,y) está próximo da linha (para seleção)
  }

  toNetlist() {
    return ["w", [this.x, this.y, this.x + this.dx, this.y + this.dy]];
  }
}
