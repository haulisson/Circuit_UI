// ElementFactory.js — cria elementos por "tipo"
import { ResistorElement } from "../canvas/elements/ResistorElement.js";
import { WireElement } from "../canvas/elements/WireElement.js";
// quando criar mais elementos, importar aqui.

const registry = new Map();
registry.set("resistor", (x, y) => new ResistorElement(x, y));
registry.set("wire",     (x, y) => new WireElement(x, y, x + 64, y)); // fio curto horizontal

export const ElementFactory = {
  has: (type) => registry.has(type),
  create: (type, x, y) => {
    const maker = registry.get(type);
    if (!maker) throw new Error(`Elemento desconhecido: ${type}`);
    return maker(x, y);
  },
  list: () => Array.from(registry.keys()),
};
