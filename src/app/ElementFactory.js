// src/app/ElementFactory.js
// Fábrica de elementos por "tipo" com suporte a opções.
// Assinatura: create(type, x, y, opts?)
//   - opts.rotation: inteiro de passos de 45° (0..7)
//   - opts.properties: objeto de propriedades específicas (name, value, kind...)
//   - opts.x2 / opts.y2: segundo ponto (apenas para wire)

import { ResistorElement }   from "../canvas/elements/ResistorElement.js";
import { WireElement }       from "../canvas/elements/WireElement.js";
import { CapacitorElement }  from "../canvas/elements/CapacitorElement.js";
import { GroundElement }     from "../canvas/elements/GroundElement.js";
import { SourceElement }     from "../canvas/elements/SourceElement.js";
import { AmmeterElement }    from "../canvas/elements/AmmeterElement.js";
import { ProbeElement }      from "../canvas/elements/ProbeElement.js";
import { LabelElement }      from "../canvas/elements/LabelElement.js";

// Registrador interno: maker(x, y, opts) -> BaseElement
const registry = new Map();

// --------- Resistor ---------
registry.set("resistor", (x, y, opts = {}) => {
  const rotation = opts.rotation ?? 0;
  const p = opts.properties || {};
  const value = p.value ?? "1k";
  const name  = p.name  ?? "R1";
  return new ResistorElement(x, y, rotation, value, name);
});

// --------- Capacitor ---------
registry.set("capacitor", (x, y, opts = {}) => {
  const rotation = opts.rotation ?? 0;
  const p = opts.properties || {};
  const value = p.value ?? "1u";
  const name  = p.name  ?? "C1";
  return new CapacitorElement(x, y, rotation, value, name);
});

// --------- Ground ---------
registry.set("ground", (x, y, opts = {}) => {
  const rotation = opts.rotation ?? 0;
  const p = opts.properties || {};
  const name = p.name ?? "0";
  return new GroundElement(x, y, rotation, name);
});

// --------- Source (V/I) ---------
registry.set("source", (x, y, opts = {}) => {
  const rotation = opts.rotation ?? 0;
  const p = opts.properties || {};
  const kind  = (p.kind ?? "V").toUpperCase(); // "V" | "I"
  const value = p.value ?? (kind === "I" ? "1A" : "5V");
  const name  = p.name  ?? (kind === "I" ? "I1" : "V1");
  return new SourceElement(x, y, rotation, kind, value, name);
});

// --------- Ammeter ---------
registry.set("ammeter", (x, y, opts = {}) => {
  const rotation = opts.rotation ?? 0;
  const p = opts.properties || {};
  const name = p.name ?? "AM1";
  return new AmmeterElement(x, y, rotation, name);
});

// --------- Probe ---------
registry.set("probe", (x, y, opts = {}) => {
  const rotation = opts.rotation ?? 0;
  const p = opts.properties || {};
  const name = p.name ?? "Vprobe";
  return new ProbeElement(x, y, rotation, name);
});

// --------- Label ---------
registry.set("label", (x, y, opts = {}) => {
  const rotation = opts.rotation ?? 0;
  const p = opts.properties || {};
  const text = p.text ?? p.name ?? "label";
  return new LabelElement(x, y, rotation, text);
});

// --------- Wire (usa x2/y2) ---------
registry.set("wire", (x, y, opts = {}) => {
  const x2 = (typeof opts.x2 === "number") ? opts.x2 : x + 64;
  const y2 = (typeof opts.y2 === "number") ? opts.y2 : y;
  return new WireElement(x, y, x2, y2);
});

export const ElementFactory = {
  /** true se o tipo estiver registrado */
  has(type) {
    return registry.has(String(type).toLowerCase());
  },

  /**
   * Cria um elemento.
   * @param {string} type
   * @param {number} x
   * @param {number} y
   * @param {object} [opts]  { rotation, properties, x2, y2 }
   */
  create(type, x, y, opts = {}) {
    const key = String(type).toLowerCase();
    const maker = registry.get(key);
    if (!maker) throw new Error(`Elemento desconhecido: ${type}`);
    return maker(x, y, opts);
  },

  /** registra/override um maker em tempo de execução */
  register(type, maker) {
    registry.set(String(type).toLowerCase(), maker);
  },

  /** lista tipos registrados */
  list() {
    return Array.from(registry.keys());
  }
};

export default ElementFactory;
