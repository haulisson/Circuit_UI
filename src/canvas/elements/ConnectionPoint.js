// src/canvas/elements/ConnectionPoint.js
// Ponto de conexão (porta/terminal) pertencente a um BaseElement.
// - Mantém offset local (em relação ao elemento), nome e posição absoluta.
// - Recalcula posição considerando rotação (0/90/180/270) e flip X/Y do elemento.
// - Atualiza o índice de conexões do CanvasModel (via model.updateConnectionPoint).
// - Suporta propagação simples de rótulos (labels de nó).

export class ConnectionPoint {
  /**
   * @param {import("./BaseElement.js").BaseElement} parent
   * @param {number} offsetX  - offset local X
   * @param {number} offsetY  - offset local Y
   * @param {string} [name]   - nome da porta (ex.: "A", "B", "GND")
   */
  constructor(parent, offsetX, offsetY, name) {
    if (!parent) throw new Error("ConnectionPoint: 'parent' é obrigatório.");
    this.parent = parent;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    this.name = name || undefined;

    // posição absoluta (mundo)
    this.x = parent.x + (offsetX || 0);
    this.y = parent.y + (offsetY || 0);

    // rótulo/nome de nó propagado (ex.: "Vout", "0")
    this.label = undefined;
  }

  /** Define/atualiza o nome desta porta */
  setName(name) {
    this.name = name || undefined;
  }

  /** Atualiza posição absoluta; reindexa no modelo se existir */
  updateLocation() {
    const oldLoc = `${this.x},${this.y}`;

    const [dx, dy] = this.parent.transformOffset(this.offsetX, this.offsetY);
    this.x = this.parent.x + dx;
    this.y = this.parent.y + dy;

    // atualiza índice do modelo (para detecção de pontos coincidentes, propagação, etc.)
    if (this.parent.sch && typeof this.parent.sch.updateConnectionPoint === "function") {
      this.parent.sch.updateConnectionPoint(this, oldLoc);
    }
  }

  /** Propaga um rótulo de nó para CPs coincidentes no modelo */
  propagateLabel(label) {
    if (label == null) return;

    // se já existe e é igual, nada a fazer
    if (this.label === label) return;

    // política simples: adota o novo label (exceto se for 0 e já houver outro — pode ajustar depois)
    this.label = label;

    // propaga para CPs coincidentes via CanvasModel
    const location = `${this.x},${this.y}`;
    if (this.parent.sch && typeof this.parent.sch.propagateLabel === "function") {
      this.parent.sch.propagateLabel(label, location);
    }

    // dá chance ao elemento pai de reagir (ex.: LabelElement, Source naming, etc.)
    if (typeof this.parent.propagate_label === "function") {
      this.parent.propagate_label(label);
    }
  }

  /** True se coincide exatamente com (x,y) */
  coincident(x, y) {
    return this.x === x && this.y === y;
  }

  /** Distância euclidiana até (x,y) */
  distanceTo(x, y) {
    return Math.hypot(this.x - x, this.y - y);
  }

  /** Desenho opcional do “ponto” no canvas (debug/inspeção) */
  draw(ctx, { filled = false } = {}) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = "#ddd";
      ctx.fill();
    }
    ctx.strokeStyle = "#999";
    ctx.stroke();
    ctx.restore();
  }

  /** Serialização leve (normalmente não é salva isoladamente) */
  toJSON() {
    return {
      name: this.name,
      x: this.x,
      y: this.y,
      label: this.label
    };
  }
}

export default ConnectionPoint;
