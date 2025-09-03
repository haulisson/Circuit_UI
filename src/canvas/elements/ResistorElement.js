// ResistorElement.js — desenho minimalista (zig-zag) + 2 pinos verticais
import { BaseElement } from "./BaseElement.js";

export class ResistorElement extends BaseElement {
  constructor(x, y, rotation = 0, value = "1k", name = "R1") {
    super("resistor", x, y, rotation);
    this.properties.value = value;
    this.properties.name = name;

    // pinos em (0,0) e (0,48) no espaço local (igual ao sandbox)
    this.addConnection(0, 0);
    this.addConnection(0, 48);
    this.updateCoords();
  }

  draw(c) {
    // aplica a rotação local: vamos desenhar na orientação base (0°)
    // Conexões já foram transformadas em coords absolutas, então só ligamos as pontas
    const a = this.connections[0], b = this.connections[1];

    // “pernas” retas
    c.save();
    c.lineWidth = 2;
    c.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(a.x, a.y + 12);
    c.moveTo(b.x, b.y);
    c.lineTo(b.x, b.y - 12);
    c.stroke();

    // zig-zag no meio (o zigzag é desenhado “reto” no eixo Y)
    const segments = [
      [0, 12,  4, 14],
      [4, 14, -4, 18],
      [-4, 18, 4, 22],
      [4, 22, -4, 26],
      [-4, 26, 4, 30],
      [4, 30, -4, 34],
      [-4, 34, 0, 36],
    ];

    c.beginPath();
    c.moveTo(a.x, a.y + 12);
    let cx = a.x, cy = a.y;
    for (const [dx1, dy1, dx2, dy2] of [[0,12,0,12], ...segments]) { /* noop first pair */ }
    // redesenha com base nos offsets relativos
    c.moveTo(a.x, a.y + 12);
    const offs = [
      [0,12], [4,14], [-4,18], [4,22], [-4,26], [4,30], [-4,34], [0,36]
    ];
    for (let i = 1; i < offs.length; i++) {
      const [ox, oy] = offs[i];
      c.lineTo(a.x + ox, a.y + oy);
    }
    c.lineTo(b.x, b.y - 12);
    c.stroke();

    // valor/nome (simples)
    c.fillStyle = "#bdbdbd";
    c.font = "12px sans-serif";
    if (this.properties.value) c.fillText(this.properties.value, a.x + 8, a.y + 26);
    if (this.properties.name)  c.fillText(this.properties.name,  a.x - 28, a.y + 26);

    c.restore();
  }

  getBounds() {
    const a = this.connections[0], b = this.connections[1];
    const minX = Math.min(a.x - 6, b.x - 6);
    const maxX = Math.max(a.x + 6, b.x + 6);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  toNetlist() {
    // formato provisório (ajustaremos quando criarmos o NetlistExporter)
    return ["r", { name: this.properties.name, value: this.properties.value, pins: this.connections.map(cp => [cp.x, cp.y]) }];
  }
}
