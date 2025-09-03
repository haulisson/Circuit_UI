// CommandStack.js — pilha de comandos com undo/redo

export class CommandStack {
  constructor({ limit = 500 } = {}) {
    this._done = [];  // comandos já executados
    this._undone = []; // comandos desfeitos (para refazer)
    this._limit = limit;
  }

  clear() {
    this._done.length = 0;
    this._undone.length = 0;
  }

  pushAndExecute(cmd) {
    if (!cmd || typeof cmd.execute !== "function" || typeof cmd.undo !== "function") {
      throw new Error("CommandStack: comando inválido.");
    }
    cmd.execute();
    this._done.push(cmd);
    if (this._done.length > this._limit) this._done.shift();
    this._undone.length = 0; // novo comando invalida a pilha de redo
  }

  undo() {
    const cmd = this._done.pop();
    if (!cmd) return false;
    cmd.undo();
    this._undone.push(cmd);
    return true;
  }

  redo() {
    const cmd = this._undone.pop();
    if (!cmd) return false;
    cmd.execute();
    this._done.push(cmd);
    return true;
  }
}

export default CommandStack;
