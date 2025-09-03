import { BaseElement } from "./BaseElement.js";

export class LabelElement extends BaseElement {
  // Label “livre” (não conecta eletricamente; para nomear nós use um elemento de “net label” com CP)
  constructor(x, y, rotation = 0, text = "label") {
    super({
      type: "label",
      x, y, rotation,
      properties: { text },
      schema: { text: { type: "string", required: true } }
    });
    // sem portas; é apenas visual
    this.updateCoords();
  }

  draw(c) {
    if (!this.visible) return;

    // eixos a partir da rotação
    const pU = this.transformOffset(0, 1);
    const L = Math.hypot(pU[0], pU[1]) || 1;
    const Ux = pU[0] / L, Uy = pU[1] / L;
    const Vx = -Uy,  Vy = Ux;

    // base do texto deslocada levemente para “cima” (no -V) para não colar em fios
    const gap = 6;
    const tx = this.x + Vx * gap;
    const ty = this.y + Vy * gap;

    c.save();
    c.fillStyle = "#bdbdbd";
    c.font = "12px sans-serif";
    c.textBaseline = "middle";
    c.textAlign = (Vx >= 0 ? "left" : "right");
    if (this.properties.text) c.fillText(this.properties.text, tx, ty);
    c.restore();

    if (this.selected) {
      // pequeno marcador/outline opcional
      c.save();
      c.strokeStyle = "rgba(57,160,255,0.8)";
      c.setLineDash([4,3]);
      const w = Math.max(16, (c.measureText(this.properties.text || "").width || 1) + 6);
      const h = 14;
      c.strokeRect(tx - (c.textAlign==="right"? w:0), ty - h/2, w, h);
      c.restore();
    }
  }

  getBounds() {
    // aproximação: caixa de 24x16 px envolvendo o texto
    const pad = 12;
    return { x: this.x - pad, y: this.y - pad, w: pad*2, h: pad*2 };
  }

  toNetlist() {
    // não participa do netlist elétrico
    return ["label", { text: this.properties.text, at: [this.x, this.y] }];
  }
}

export default LabelElement;
