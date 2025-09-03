// AddElementCommand.js — adiciona 1 elemento no modelo (undo: remove)

export class AddElementCommand {
  /**
   * @param {{app: any, element: any, select?: boolean}} opts
   */
  constructor({ app, element, select = true }) {
    this.app = app;
    this.element = element;
    this.select = select;
    this._removedIndex = -1;
  }

  execute() {
    this.app.model.add(this.element);
    if (this.select) this.app.model.selection.set([this.element]);
    this.app.scheduleRender();
  }

  undo() {
    // guardar índice atual para recolocar no mesmo lugar caso queira (opcional)
    this._removedIndex = this.app.model.elements.indexOf(this.element);
    this.app.model.remove(this.element);
    this.app.scheduleRender();
  }
}

export default AddElementCommand;
