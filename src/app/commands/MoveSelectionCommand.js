// MoveSelectionCommand.js — move a seleção de uma posição inicial para a final
// Guarda mapas {element -> {x,y}} para desfazer/refazer movimentos em grupo.

export class MoveSelectionCommand {
  /**
   * @param {{app: any, startPos: Map<any,{x:number,y:number}>, endPos?: Map<any,{x:number,y:number}>}} opts
   */
  constructor({ app, startPos, endPos }) {
    this.app = app;
    this.startPos = new Map(startPos || []);
    this.endPos = new Map(endPos || []);
  }

  setEndPositions(endPos) {
    this.endPos = new Map(endPos || []);
  }

  execute() {
    // aplica endPos
    for (const [el, pos] of this.endPos.entries()) {
      if (!pos) continue;
      const mdx = pos.x - el.x;
      const mdy = pos.y - el.y;
      if (mdx || mdy) {
        if (typeof el.move === "function") el.move(mdx, mdy);
        else { el.x = pos.x; el.y = pos.y; el.updateCoords?.(); }
      }
    }
    this.app.scheduleRender();
  }

  undo() {
    // volta para startPos
    for (const [el, pos] of this.startPos.entries()) {
      if (!pos) continue;
      const mdx = pos.x - el.x;
      const mdy = pos.y - el.y;
      if (mdx || mdy) {
        if (typeof el.move === "function") el.move(mdx, mdy);
        else { el.x = pos.x; el.y = pos.y; el.updateCoords?.(); }
      }
    }
    this.app.scheduleRender();
  }
}

export default MoveSelectionCommand;
