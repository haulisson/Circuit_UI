// ConnectionPoint.js
// Representa um ponto de conexão elétrica de um elemento.

export class ConnectionPoint {
  constructor(parent, offsetX, offsetY) {
    this.parent = parent;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.x = parent.x + offsetX; // absoluto
    this.y = parent.y + offsetY; // absoluto
    this.label = undefined;      // rótulo de nó (quando propagado)
  }

  updateLocation() {
    const [dx, dy] = this.parent.transformOffset(this.offsetX, this.offsetY);
    this.x = this.parent.x + dx;
    this.y = this.parent.y + dy;

    // manter índice de conexões do modelo (se existir)
    if (this.parent.sch && typeof this.parent.sch.updateConnectionPoint === "function") {
      this.parent.sch.updateConnectionPoint(this); // não passamos oldLocation aqui (stub simples)
    }
  }

  propagateLabel(label) {
    if (this.label === undefined) {
      this.label = label;
      // propaga para CPs coincidentes via model
      if (this.parent.sch && typeof this.parent.sch.propagateLabel === "function") {
        this.parent.sch.propagateLabel(label, `${this.x},${this.y}`);
      }
      // permissão ao parent para lógica extra (opcional)
      if (typeof this.parent.propagate_label === "function") {
        this.parent.propagate_label(label);
      }
    } else if (this.label !== label && this.label !== "0" && label !== "0") {
      // conflito simples de rótulos (pode evoluir para warning UI)
      // console.warn("Node label conflict:", this.label, label);
      this.label = label; // política simples por enquanto
    }
  }

  coincident(x, y) { return this.x === x && this.y === y; }

  draw(ctx, showFilled = false) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = showFilled ? "#ddd" : "transparent";
    ctx.strokeStyle = "#999";
    if (showFilled) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
