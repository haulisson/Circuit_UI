// ResistorElement.js — desenho minimalista (zig-zag) + 2 pinos verticais
import { BaseElement } from "./BaseElement.js";

export class ResistorElement extends BaseElement {
  constructor(x, y, rotation = 0, value = "1k", name = "R1") {
    super({
      type: "resistor",
      x, y, rotation, //agora 0..7 (45º)
      properties: { value, name },
      schema: {
        value: { type: "string", required: true },
        name:  { type: "string", required: true }
      }
    });
    //Portas locais no eixo Y local (A -> B , 48 de comprimento)
    this.addPort("A", 0, 0);
    this.addPort("B", 0, 48);
    
    this.updateCoords();
  }

  draw(c) {
    if (!this.visible) return;
    
    const A = this.getPort("A");
    const B = this.getPort("B");

    // desenhe corpo + pernas entre getPort("A") e getPort("B")
    // use this.selected para realce
    // aplica a rotação local: vamos desenhar na orientação base (0°)
    // Conexões já foram transformadas em coords absolutas, então só ligamos as pontas

    // Vetor do eixo (A->B)
    const ux = B.x - A.x;
    const uy = B.y - A.y;
    const len = Math.hypot(ux, uy) || 1;
    const Ux = ux / len, Uy = uy / len;     // eixo longitudinal
    const Vx = -Uy,   Vy = Ux;              // perpendicular

    // Helper: converte ponto local [lx, ly] -> mundo = A + U*ly + V*lx
    const L2W = (lx, ly) => [ A.x + Ux*ly + Vx*lx, A.y + Uy*ly + Vy*lx ];

    // const a = this.connections[0], b = this.connections[1];

    // “pernas” retas
    c.save();
    c.lineWidth = 2;
    c.strokeStyle = this.selected ? "#39a0ff" : "#d0d0d0";

    // c.moveTo(a.x, a.y);
    // c.lineTo(a.x, a.y + 12);
    // c.moveTo(b.x, b.y);
    // c.lineTo(b.x, b.y - 12);
    // c.stroke();

    // zig-zag no meio (o zigzag é desenhado “reto” no eixo Y)
    // const segments = [
    //   [0, 12,  4, 14],
    //   [4, 14, -4, 18],
    //   [-4, 18, 4, 22],
    //   [4, 22, -4, 26],
    //   [-4, 26, 4, 30],
    //   [4, 30, -4, 34],
    //   [-4, 34, 0, 36],
    // ];

    // c.beginPath();
    // c.moveTo(a.x, a.y + 12);
    // let cx = a.x, cy = a.y;
    // for (const [dx1, dy1, dx2, dy2] of [[0,12,0,12], ...segments]) { /* noop first pair */ }
    // // redesenha com base nos offsets relativos
    // c.moveTo(a.x, a.y + 12);
    // const offs = [
    //   [0,12], [4,14], [-4,18], [4,22], [-4,26], [4,30], [-4,34], [0,36]
    // ];
    // for (let i = 1; i < offs.length; i++) {
    //   const [ox, oy] = offs[i];
    //   c.lineTo(a.x + ox, a.y + oy);
    // }
    // c.lineTo(b.x, b.y - 12);
    // c.stroke();

    // // valor/nome (simples)
    // c.fillStyle = "#bdbdbd";
    // c.font = "12px sans-serif";
    // if (this.properties.value) c.fillText(this.properties.value, a.x + 8, a.y + 26);
    // if (this.properties.name)  c.fillText(this.properties.name,  a.x - 28, a.y + 26);

    // c.restore();

    // pernas (0..12) e (36..48) no eixo local
    c.beginPath();
    {
      const [x1,y1] = L2W(0, 0);
      const [x2,y2] = L2W(0, 12);
      c.moveTo(x1,y1); 
      c.lineTo(x2,y2);

      const [x3,y3] = L2W(0, 48);
      const [x4,y4] = L2W(0, 36);
      c.moveTo(x3,y3); 
      c.lineTo(x4,y4);
      c.stroke();
    }
    // zig-zag entre 12..36 no eixo local (x = deslocamento lateral ±4)
    c.beginPath();
    const path = [
      [  0, 12 ],
      [  4, 14 ],
      [ -4, 18 ],
      [  4, 22 ],
      [ -4, 26 ],
      [  4, 30 ],
      [ -4, 34 ],
      [  0, 36 ]
    ];
    {
      const [sx,sy] = L2W(path[0][0], path[0][1]);
      c.moveTo(sx, sy);
      for (let i=1; i<path.length; i++) {
        const [lx, ly] = path[i];
        const [x,y] = L2W(lx, ly);
        c.lineTo(x, y);
      }
      c.stroke();
    }

//     // textos próximos ao centro (em local ~24), deslocados no eixo V
//     c.fillStyle = "#bdbdbd";
//     c.font = "12px sans-serif";
//     const [tx, ty] = L2W(8, 24);   // 8 px para o lado
//     if (this.properties.value) c.fillText(this.properties.value, tx, ty);
//     const [nx, ny] = L2W(-28, 24); // -28 px para o outro lado
//     if (this.properties.name)  c.fillText(this.properties.name, nx, ny);

//     c.restore();
//   }

//   getBounds() {
//     const a = this.connections[0], b = this.connections[1];
//     const minX = Math.min(a.x - 6, b.x - 6);
//     const maxX = Math.max(a.x + 6, b.x + 6);
//     const minY = Math.min(a.y, b.y);
//     const maxY = Math.max(a.y, b.y);
//     return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
//   }

//   toNetlist() {
//     // formato provisório (ajustaremos quando criarmos o NetlistExporter)
//     return ["r", { name: this.properties.name, value: this.properties.value, pins: this.connections.map(cp => [cp.x, cp.y]) }];
//   }
// }

    // textos próximos ao centro (em local ~24), deslocados no eixo V
    // Problema durante a rotação

    // c.fillStyle = "#bdbdbd";
    // c.font = "12px sans-serif";
    // const [tx, ty] = L2W(8, 24);   // 8 px para o lado
    // if (this.properties.value) c.fillText(this.properties.value, tx, ty);
    // const [nx, ny] = L2W(-28, 24); // -28 px para o outro lado
    // if (this.properties.name)  c.fillText(this.properties.name, nx, ny);
    // --- textos: centralizados ao longo do corpo e deslocados para fora ---
    c.fillStyle = "#bdbdbd";
    c.font = "12px sans-serif";
    c.textBaseline = "middle";

    // Centro ao longo do corpo (t = 24 na coordenada local)
    const centerLocalY = 24;

    // Posição do centro em mundo
    const [cx, cy] = L2W(0, centerLocalY);

    // Distância lateral (em px) para afastar do zig-zag
    const labelGap = 14; // pode ajustar (12..18)

    // Posições “fora” do corpo nas duas metades laterais
    const valX = cx + Vx * labelGap, valY = cy + Vy * labelGap;   // valor (lado +V)
    const namX = cx - Vx * labelGap, namY = cy - Vy * labelGap;   // nome  (lado -V)

    // Alinhamento horizontal para manter texto “virado” para fora
    // Se o vetor lateral aponta para a direita (Vx>=0), alinhe à esquerda; caso contrário, à direita.
    const alignForSide = (vx) => (vx >= 0 ? "left" : "right");

    // Desenha valor
    c.textAlign = alignForSide(Vx);
    if (this.properties.value) c.fillText(this.properties.value, valX, valY);

    // Desenha nome (alinha ao lado oposto)
    c.textAlign = alignForSide(-Vx);
    if (this.properties.name) c.fillText(this.properties.name, namX, namY);
      c.restore();
  }

  getBounds() {
    const a = this.getPort("A");
    const b = this.getPort("B");
    const pad = 8; // margem um pouco maior para contemplar o zig-zag lateral
    const minX = Math.min(a.x, b.x) - pad;
    const maxX = Math.max(a.x, b.x) + pad;
    const minY = Math.min(a.y, b.y) - pad;
    const maxY = Math.max(a.y, b.y) + pad;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  toNetlist() {
    const pins = this.getPorts().map(cp => [cp.x, cp.y]);
    return ["r", { name: this.properties.name, value: this.properties.value, pins }];
  }
}
