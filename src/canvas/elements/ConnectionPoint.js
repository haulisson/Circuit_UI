// ConnectionPoint.js
// Representa um ponto de conexão elétrica de um elemento.

export class ConnectionPoint {
  constructor(parent, offsetX, offsetY) {
    this.parent = parent;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.label = undefined;
    this.updateLocation();
  }

  updateLocation() {
    // TODO: calcular coordenadas absolutas baseado no parent
  }

  propagateLabel(label) {
    // TODO: propagar rótulo para parent e outros CPs coincidentes
  }

  coincident(x, y) {
    return this.x === x && this.y === y;
  }

  draw(ctx, count = 1) {
    // TODO: desenhar o ponto de conexão (ex: bolinha)
  }
}
