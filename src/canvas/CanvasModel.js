// CanvasModel.js
// Mantém o estado do diagrama (elementos, conexões, seleção) — SEM DOM.

import { SelectionModel } from "./SelectionModel.js";

export class CanvasModel {
  constructor({ grid = 8 } = {}) {
    this.grid = grid;
    this.elements = [];            // BaseElement[]
    this.selection = new SelectionModel();
    this.connectionIndex = new Map(); // chave "x,y" -> ConnectionPoint[]
  }

  add(element) {
    this.elements.push(element);
    element.sch = this;            // referência fraca ao "owner" (para propagação)
    this.#indexConnections(element);
    return element;
  }

  remove(element) {
    const i = this.elements.indexOf(element);
    if (i >= 0) this.elements.splice(i, 1);
    this.selection.remove(element);
    this.#deindexConnections(element);
  }

  clear() {
    this.elements.length = 0;
    this.selection.clear();
    this.connectionIndex.clear();
  }

  forEach(fn) {
    this.elements.forEach(fn);
  }

  hitTest(x, y, hitTestService) {
    // Prioriza seleção pelo topo (último desenhado)
    for (let i = this.elements.length - 1; i >= 0; --i) {
      const el = this.elements[i];
      if (hitTestService.hitElement(el, x, y)) return el;
    }
    return null;
  }

  findCoincidentCP(x, y) {
    return this.connectionIndex.get(`${x},${y}`) || [];
  }

  updateConnectionPoint(cp, oldLocation) {
    if (oldLocation) {
      const list = this.connectionIndex.get(oldLocation);
      if (list) {
        const idx = list.indexOf(cp);
        if (idx >= 0) list.splice(idx, 1);
        if (!list.length) this.connectionIndex.delete(oldLocation);
      }
    }
    const loc = `${cp.x},${cp.y}`;
    const list = this.connectionIndex.get(loc) || [];
    if (!list.includes(cp)) list.push(cp);
    this.connectionIndex.set(loc, list);
  }

  propagateLabel(label, location) {
    const list = this.connectionIndex.get(location) || [];
    list.forEach(cp => {
      if (cp.label === undefined) {
        cp.label = label;
        // regra opcional: chamar propagate no parent (quando aplicável)
        if (cp.parent && typeof cp.parent.propagate_label === "function") {
          cp.parent.propagate_label(label);
        }
      }
    });
  }

  elementsInRect(rect) {
    const out = [];
    const rx = rect.x, ry = rect.y, rw = rect.w, rh = rect.h;
    const r2x = rx + rw, r2y = ry + rh;

    for (const el of this.elements) {
      if (typeof el.getBounds !== "function") continue;
      const b = el.getBounds();
      const bx2 = b.x + b.w, by2 = b.y + b.h;
      // interseção AABB simples
      const intersects = (b.x <= r2x) && (bx2 >= rx) && (b.y <= r2y) && (by2 >= ry);
      if (intersects) out.push(el);
    }
    return out;
  }

  toJSON() {
    return {
      grid: this.grid,
      elements: this.elements.map(e => ({
        type: e.type,
        x: e.x, y: e.y, rotation: e.rotation,
        properties: e.properties
      }))
    };
  }

  // (Opcional) carregar de JSON futuramente
  static fromJSON(json) {
    const model = new CanvasModel({ grid: json.grid });
    // TODO: reconstruir elementos concretos com um registry/factory
    return model;
  }

  // ------- privados -------
  #indexConnections(element) {
    if (!element.connections) return;
    for (const cp of element.connections) {
      // cp.updateLocation() deve chamar model.updateConnectionPoint(...)
      cp.updateLocation();
    }
  }

  #deindexConnections(element) {
    if (!element.connections) return;
    for (const cp of element.connections) {
      const loc = `${cp.x},${cp.y}`;
      const list = this.connectionIndex.get(loc);
      if (!list) continue;
      const idx = list.indexOf(cp);
      if (idx >= 0) list.splice(idx, 1);
      if (!list.length) this.connectionIndex.delete(loc);
    }
  }
}
