// src/app/DragMoveController.js
// Habilita mover/arrastar elementos já colocados no canvas.
// - Click simples: seleciona (respeita Shift/Ctrl para multiseleção)
// - Arrastar com botão esquerdo sobre um elemento: move seleção (snap à grade)
// - Mantém compatível com pan do CanvasView (ALT/btn do meio)

export class DragMoveController {
  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} opts.canvasEl
   * @param {import('./AppShell.js').AppShell} opts.app
   */
  constructor({ canvasEl, app }) {
    this.canvas = canvasEl;
    this.app = app;

    // estado do drag
    this.dragging = false;
    this.startClient = { x: 0, y: 0 };  // ponto inicial em client
    this.startWorld  = { x: 0, y: 0 };  // ponto inicial em world
    this.snapStep = app?.model?.grid ?? 8;

    // posição inicial dos itens selecionados (para mover em grupo)
    this.selStartPos = new Map(); // element -> {x,y}

    // binds
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);

    // eventos
    // preferimos Pointer Events, mas caímos para mouse se não tiver
    if ("onpointerdown" in this.canvas) {
      this.canvas.addEventListener("pointerdown", this._onPointerDown);
    } else {
      this.canvas.addEventListener("mousedown", this._onPointerDown);
      window.addEventListener("mousemove", this._onPointerMove);
      window.addEventListener("mouseup", this._onPointerUp);
    }
  }

  destroy() {
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("mousedown", this._onPointerDown);
    window.removeEventListener("mousemove", this._onPointerMove);
    window.removeEventListener("mouseup", this._onPointerUp);
  }

  _onPointerDown(e) {
    // ignora pan: ALT ou botão do meio
    if (e.altKey || e.button === 1) return;

    // capture para receber move/up fora do canvas
    if (this.canvas.setPointerCapture && e.pointerId != null) {
      this.canvas.setPointerCapture(e.pointerId);
      window.addEventListener("pointermove", this._onPointerMove);
      window.addEventListener("pointerup", this._onPointerUp, { once: true });
    }

    this.startClient.x = e.clientX;
    this.startClient.y = e.clientY;

    const [wx, wy] = this.app.view.clientToWorld(e.clientX, e.clientY);
    this.startWorld.x = wx;
    this.startWorld.y = wy;

    // tentar pegar um elemento sob o cursor
    const hit = this.app.view.pickAtClientPoint(e.clientX, e.clientY);

    // seleção
    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    if (hit) {
      if (!multi && !this.app.model.selection.getAll().includes(hit)) {
        this.app.model.selection.clear();
        this.app.model.selection.add(hit);
      } else if (multi) {
        // alterna somente se já havia algo
        if (this.app.model.selection.getAll().includes(hit)) {
          this.app.model.selection.remove(hit);
        } else {
          this.app.model.selection.add(hit);
        }
      }
      // preparar arrasto
      this.dragging = true;
      this._snapshotSelection();
      e.preventDefault();
    } else {
      // clique no vazio: limpa seleção (se não multi)
      if (!multi) {
        this.app.model.selection.clear();
        this.app.scheduleRender();
      }
      this.dragging = false;
    }
  }

  _onPointerMove(e) {
    if (!this.dragging) return;

    // delta em coordenadas do mundo
    const [wx, wy] = this.app.view.clientToWorld(e.clientX, e.clientY);
    const dx = wx - this.startWorld.x;
    const dy = wy - this.startWorld.y;

    // movemos cada item da seleção a partir do snapshot
    const items = this.app.model.selection.getAll();
    if (!items.length) return;

    for (const el of items) {
      const start = this.selStartPos.get(el);
      if (!start) continue;

      // alvo (sem snap)
      let tx = start.x + dx;
      let ty = start.y + dy;

      // snap à grade por posição absoluta (alinha a "ancora" do elemento)
      [tx, ty] = this._snapToGrid(tx, ty, this.snapStep);

      // compute delta a aplicar a partir da posição atual do elemento
      const mdx = tx - el.x;
      const mdy = ty - el.y;

      if (mdx !== 0 || mdy !== 0) {
        if (typeof el.move === "function") {
          el.move(mdx, mdy);
        } else {
          // fallback: ajuste direto
          el.x += mdx; el.y += mdy;
          if (typeof el.updateCoords === "function") el.updateCoords();
        }
      }
    }

    this.app.scheduleRender();
    e.preventDefault();
  }

  _onPointerUp(_e) {
    this.dragging = false;
    this.selStartPos.clear();
  }

  _snapshotSelection() {
    this.selStartPos.clear();
    for (const el of this.app.model.selection.getAll()) {
      this.selStartPos.set(el, { x: el.x, y: el.y });
    }
  }

  _snapToGrid(x, y, step) {
    const sx = Math.round(x / step) * step;
    const sy = Math.round(y / step) * step;
    return [sx, sy];
  }
}

export default DragMoveController;
