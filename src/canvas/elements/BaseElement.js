// src/canvas/elements/BaseElement.js
// Classe base para todos os elementos do canvas (pai de Resistor, Wire, etc.)
//
// Principais recursos:
// - Identidade estável (id) e zIndex
// - Estado: selected, locked, visible
// - Portas/terminais nomeadas (ConnectionPoint), com offsets locais
// - Transformações discretas: rotate(90°*k), flipX/flipY opcionais
// - Atualização de bounding box e reindexação de portas no CanvasModel
// - Hit-test padrão (bbox/near) e desenhista de outline
// - Serialização consistente (toJSON / fromJSON via factories)
// - Hooks simples para subclasses:
//      onAfterMove(), onAfterRotate(), onAfterFlip(), onPropsChanged(changes)
// - Validação leve de propriedades com schema opcional
//
// Dependências esperadas no projeto:
// - ConnectionPoint: src/canvas/elements/ConnectionPoint.js
//
// Notas de integração:
// - O CanvasModel chama cp.updateLocation() e indexa portas via updateConnectionPoint(cp)
// - Se o elemento estiver no model (this.sch setado por CanvasModel.add), addPort()
//   já dispara updateLocation() para manter os índices em dia.

import { ConnectionPoint } from "./ConnectionPoint.js";

let AUTO_ID = 1;

export class BaseElement {
  /**
   * @param {Object} opts
   * @param {string}  opts.type                - identificador curto (ex.: "resistor", "wire")
   * @param {number}  opts.x                   - posição âncora X (mundo)
   * @param {number}  opts.y                   - posição âncora Y (mundo)
   * @param {number} [opts.rotation=0]         - rotação (0..3) = 0°,90°,180°,270°
   * @param {Object} [opts.properties={}]      - propriedades específicas do elemento
   * @param {string} [opts.id]                 - id único (se não vier, é gerado)
   * @param {number} [opts.zIndex=0]           - ordem de desenho (maior = mais à frente)
   * @param {boolean}[opts.visible=true]       - se falso, não desenha nem seleciona
   * @param {boolean}[opts.locked=false]       - se true, não pode mover/editar
   * @param {Object} [opts.schema]             - esquema de props (validação leve)
   */
  constructor({
    type,
    x,
    y,
    rotation = 0,     // agora múltiplos de 45° (0..7)
    properties = {},
    id,
    zIndex = 0,
    visible = true,
    locked = false,
    schema = null
  }) {
    if (!type) throw new Error("BaseElement: 'type' é obrigatório.");
    if (typeof x !== "number" || typeof y !== "number") {
      throw new Error("BaseElement: 'x' e 'y' numéricos são obrigatórios.");
    }

    this.id = id || `${type}-${AUTO_ID++}`;
    this.type = type;

    this.x = x;
    this.y = y;
    //this.rotation = (rotation % 4 + 4) % 4; // 0..3 (90°)
    this.rotation = ((rotation % 8) + 8) % 8; // 0..7 (45°)
    this.flippedX = false;
    this.flippedY = false;

    this.zIndex = zIndex;
    this.visible = visible;
    this.locked = locked;

    this.properties = { ...properties };
    this.schema = schema; // opcional para validar propriedades

    this.selected = false;
    this.boundingBox = [x - 2, y - 2, 4, 4]; // [x,y,w,h] mundo
    this.ports = new Map();  // nome -> ConnectionPoint
    this.order = [];         // ordem determinística das portas

    // referência opcional ao CanvasModel (setada quando add() no model)
    this.sch = undefined;

    // Faça subclasses definirem portas no construtor usando addPort()
    // Exemplo: this.addPort("A", 0, 0); this.addPort("B", 0, 48);
  }

  /* ========================= Portas ========================= */

  /**
   * Adiciona uma porta/terminal nomeado com offset local.
   * @param {string} name
   * @param {number} offsetX
   * @param {number} offsetY
   */
  addPort(name, offsetX, offsetY) {
    if (!name) throw new Error("addPort: 'name' é obrigatório.");
    const cp = new ConnectionPoint(this, offsetX, offsetY);
    this.ports.set(name, cp);
    this.order.push(name);
    // Se já está no modelo, posicione/indize agora
    if (this.sch) cp.updateLocation();
    this.updateCoords();
    return cp;
  }

  /** Obtém a porta por nome (ex.: getPort("A")) */
  getPort(name) { return this.ports.get(name); }

  /** Lista as portas em ordem determinística */
  getPorts() { return this.order.map(n => this.ports.get(n)); }

  /** Para compatibilidade com código antigo que usava `connections` (array) */
  get connections() { return this.getPorts(); }

  /* ====================== Transformações ====================== */

  /** Move em dx,dy (mundo); respeita lock */
  move(dx, dy) {
    if (this.locked) return;
    if (!dx && !dy) return;
    this.x += dx;
    this.y += dy;
    this.updateCoords();
    this.onAfterMove?.();
  }

  /** Rotaciona em passos de 90°; respeita lock */
  rotate(steps = 1) {
    if (this.locked) return;
    const old = this.rotation;
    this.rotation = (this.rotation + steps) & 7; //0 ..7
    if (this.rotation !== old) {
      this.updateCoords();
      this.onAfterRotate?.();
    }
  }

  /** Espelha horizontalmente (opcional, para elementos que suportam) */
  flipX() {
    if (this.locked) return;
    this.flippedX = !this.flippedX;
    this.updateCoords();
    this.onAfterFlip?.("x");
  }

  /** Espelha verticalmente (opcional) */
  flipY() {
    if (this.locked) return;
    this.flippedY = !this.flippedY;
    this.updateCoords();
    this.onAfterFlip?.("y");
  }

  /** Converte offset local -> mundo, considerando rotation e flips */
  transformOffset(offsetX, offsetY) {
    let ox = offsetX, oy = offsetY;
    if (this.flippedX) ox = -ox;
    if (this.flippedY) oy = -oy;

    // // rotação 0..3 (90° * r)
    // switch (this.rotation & 3) {
    //   case 0: return [ox, oy];
    //   case 1: return [-oy, ox];
    //   case 2: return [-ox, -oy];
    //   case 3: return [oy, -ox];
    // }

    // Atualização para rotacionar 45°
    const angle = (Math.PI / 4) * (this.rotation & 7); // 45°
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = ox * cos - oy * sin;
    const dy = ox * sin + oy * cos;
    return [dx, dy];

  }

  /* ==================== Atualização geométrica ==================== */

  /** Atualiza posições absolutas das portas e bounding box */
  updateCoords() {
    // Atualiza portas
    for (const cp of this.ports.values()) cp.updateLocation();

    // BBox como envoltória das portas (subclasses podem sobrepor com forma própria)
    if (this.ports.size) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const cp of this.ports.values()) {
        if (cp.x < minX) minX = cp.x;
        if (cp.y < minY) minY = cp.y;
        if (cp.x > maxX) maxX = cp.x;
        if (cp.y > maxY) maxY = cp.y;
      }
      const margin = 3;
      this.boundingBox = [minX - margin, minY - margin, (maxX - minX) + 2 * margin, (maxY - minY) + 2 * margin];
    } else {
      this.boundingBox = [this.x - 2, this.y - 2, 4, 4];
    }
  }

  /** BBox mundial como objeto {x,y,w,h} */
  getBounds() {
    const [x, y, w, h] = this.boundingBox;
    return { x, y, w, h };
  }

  /* ======================= Hit testing ======================= */

  /**
   * Ponto próximo do elemento? Padrão usa bbox; subclasses podem refinar.
   * @param {number} x mundo
   * @param {number} y mundo
   * @param {number} tolerance pixels (mundo)
   */
  near(x, y, tolerance = 5) {
    const b = this.getBounds();
    // Inclusão de tolerância na AABB
    return (
      x >= b.x - tolerance &&
      x <= b.x + b.w + tolerance &&
      y >= b.y - tolerance &&
      y <= b.y + b.h + tolerance
    );
  }

  /** Opcional: desenhar um contorno quando selecionado (utilitário) */
  drawOutline(ctx, color = "rgba(57,160,255,0.8)") {
    const { x, y, w, h } = this.getBounds();
    ctx.save();
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /* ========================= Propriedades ========================= */

  /**
   * Atualiza propriedades do elemento. Se schema existir, validações simples.
   * @param {Object} patch
   */
  setProperties(patch) {
    if (!patch || typeof patch !== "object") return;
    const old = { ...this.properties };

    // Validação leve se schema existir: { propName: { type, required?, enum?, min?, max? } }
    if (this.schema && typeof this.schema === "object") {
      for (const [k, v] of Object.entries(patch)) {
        const s = this.schema[k];
        if (!s) continue;
        if (s.required && (v === undefined || v === null || v === "")) {
          console.warn(`Property ${k} é obrigatória`);
          continue;
        }
        if (s.type && typeof v !== s.type) {
          console.warn(`Property ${k} deve ser do tipo ${s.type}`);
          continue;
        }
        if (s.enum && Array.isArray(s.enum) && !s.enum.includes(v)) {
          console.warn(`Property ${k} deve ser um de: ${s.enum.join(", ")}`);
          continue;
        }
        if (typeof v === "number") {
          if (typeof s.min === "number" && v < s.min) console.warn(`Property ${k} < min (${s.min})`);
          if (typeof s.max === "number" && v > s.max) console.warn(`Property ${k} > max (${s.max})`);
        }
      }
    }

    Object.assign(this.properties, patch);

    // Hook
    if (typeof this.onPropsChanged === "function") {
      const changes = diffObject(old, this.properties);
      this.onPropsChanged(changes);
    }
  }

  /* ==================== Desenho / Serialização ==================== */
  /* ======================== draw/save ============================= */
  /** Subclasses devem implementar o desenho do “corpo” */
  draw(ctx) {
    // no-op; cada elemento concreto implementa
    // Lembre: portas/terminais não precisam ser desenhadas aqui (opcional).
  }

  /** Representação mínima para salvar projeto (CanvasModel.toJSON usa isso) */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      flippedX: this.flippedX || undefined,
      flippedY: this.flippedY || undefined,
      zIndex: this.zIndex || undefined,
      visible: this.visible !== true ? this.visible : undefined,
      locked: this.locked || undefined,
      properties: Object.keys(this.properties).length ? this.properties : undefined
      // Portas são definidas pela classe concreta; normalmente offsets são fixos por tipo
    };
  }

  /* ===================== Utilidades internas ===================== */

  /** *Opcional* — elemento pode reagir a rótulos propagados nos ports */
  propagate_label(_label) {
    // no-op por padrão (ex.: LabelElement pode sobrepor)
  }
}

/* ============== helpers ============== */

function diffObject(oldObj, newObj) {
  const out = {};
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const k of keys) {
    if (oldObj[k] !== newObj[k]) out[k] = { from: oldObj[k], to: newObj[k] };
  }
  return out;
}

export default BaseElement;
