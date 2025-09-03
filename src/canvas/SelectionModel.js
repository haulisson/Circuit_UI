// SelectionModel.js
// Gerencia seleção simples/múltipla e operações utilitárias.

export class SelectionModel {
  constructor() {
    this.items = new Set();
  }

  set(targets) {
    this.clear();
    for (const t of targets) this.add(t);
  }

  add(item) {
    if (!item) return;
    item.selected = true;
    this.items.add(item);
  }

  remove(item) {
    if (!item) return;
    item.selected = false;
    this.items.delete(item);
  }

  toggle(item) {
    if (!item) return;
    if (this.items.has(item)) this.remove(item);
    else this.add(item);
  }

  clear() {
    for (const it of this.items) it.selected = false;
    this.items.clear();
  }

  getAll() {
    return Array.from(this.items);
  }
}
