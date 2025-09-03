// BaseElement.js
// Classe base para todos os elementos do canvas (resistor, fio, fonte etc.)

export class BaseElement {
  constructor(type, x, y, rotation = 0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.selected = false;
    this.properties = {};
    this.boundingBox = [0, 0, 0, 0];
    this.connections = [];
  }

  addConnection(offsetX, offsetY) {
    // TODO: criar ConnectionPoint e adicionar à lista
  }

  updateCoords() {
    // TODO: atualizar bounding box e posições absolutas dos connection points
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.updateCoords();
  }

  rotate(amount = 1) {
    this.rotation = (this.rotation + amount) % 8;
    this.updateCoords();
  }

  draw(ctx) {
    // TODO: implementar no elemento concreto
  }

  toNetlist() {
    // TODO: retornar JSON compatível com exportação de netlist
  }
}
