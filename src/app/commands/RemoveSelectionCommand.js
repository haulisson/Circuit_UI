// RemoveSelectionCommand.js — remove todos os itens selecionados (undo: recoloca)

export class RemoveSelectionCommand {
  /**
   * @param {{app: any}} opts
   */
  constructor({ app }) {
    this.app = app;
    // snapshot dos elementos e suas posições na lista
    const sel = app.model.selection.getAll();
    this._items = sel.map(el => ({
      el,
      idx: app.model.elements.indexOf(el)
    }));
  }

  execute() {
    for (const { el } of this._items) this.app.model.remove(el);
    this.app.model.selection.clear();
    this.app.scheduleRender();
  }

  undo() {
    // Reinsere na ordem original aproximada (append é suficiente na maioria dos casos)
    for (const { el } of this._items) this.app.model.add(el);
    // restaura seleção
    this.app.model.selection.set(this._items.map(i => i.el));
    this.app.scheduleRender();
  }
}

export default RemoveSelectionCommand;
