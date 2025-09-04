// SelectionMarqueeController.js
// Seleção retangular ("marquee") no canvas.
// - Clique e arraste no "vazio" -> desenha retângulo de seleção
// - Soltar botão: seleciona elementos cujos bounds intersectam o retângulo
// - Shift: adiciona à seleção existente
// - Ctrl/Cmd: alterna (toggle) os itens encontrados
//
// Desenho do retângulo é feito via hook afterRender do AppShell (overlay).

export class SelectionMarqueeController {
  /**
   * @param {{canvasEl: HTMLCanvasElement, app: import('./AppShell.js').AppShell}} opts
   */
  constructor({ canvasEl, app }) {
    this.canvas = canvasEl;
    this.app = app;

    this.isDragging = false;
    this.startClient = { x: 0, y: 0 };
    this.endClient   = { x: 0, y: 0 };

    // plugin para desenhar overlay após render
    const plugin = {
      afterRender: (ctx) => {
        // guarda de segurança se ctx ou view/ctx2d não existirem
        if (!ctx || !ctx.view || !ctx.view.ctx) return;
        this._drawOverlay(ctx.view.ctx);
      }
    };

    // >>> ADICIONE ESTA GUARDA ANTES DO push <<<
    if (!Array.isArray(this.app.plugins)) this.app.plugins = [];
    this.app.plugins.push(plugin);
    this._plugin = plugin;

    // binds
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);

    // eventos (Pointer Events se disponíveis)
    if ("onpointerdown" in this.canvas) {
      this.canvas.addEventListener("pointerdown", this._onPointerDown);
    } else {
      this.canvas.addEventListener("mousedown", this._onPointerDown);
      window.addEventListener("mousemove", this._onPointerMove);
      window.addEventListener("mouseup", this._onPointerUp);
    }
  }

  destroy() {
    // remove listeners
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("mousedown", this._onPointerDown);
    window.removeEventListener("mousemove", this._onPointerMove);
    window.removeEventListener("mouseup", this._onPointerUp);
    // remove plugin
    // Remover plugin de forma segura
    if (Array.isArray(this.app.plugins)) {
      const i = this.app.plugins.indexOf(this._plugin);
      if (i >= 0) this.app.plugins.splice(i, 1);
    }
  }

  _onPointerDown(e) {
    // ignorar pan (ALT ou botão do meio) e arrasto de elemento (deixa para DragMoveController)
    if (e.altKey || e.button === 1) return;

    // só inicia marquee se "não há elemento" sob o cursor
    const hit = this.app.view.pickAtClientPoint(e.clientX, e.clientY);
    if (hit) return;

    this.isDragging = true;
    this.startClient.x = e.clientX;
    this.startClient.y = e.clientY;
    this.endClient.x = e.clientX;
    this.endClient.y = e.clientY;

    // capturar ponteiro p/ receber move/up
    if (this.canvas.setPointerCapture && e.pointerId != null) {
      this.canvas.setPointerCapture(e.pointerId);
      window.addEventListener("pointermove", this._onPointerMove);
      window.addEventListener("pointerup", this._onPointerUp, { once: true });
    }

    e.preventDefault();
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    this.endClient.x = e.clientX;
    this.endClient.y = e.clientY;
    this.app.scheduleRender(); // redesenha com overlay
  }

  _onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;

    // calcula retângulo em coordenadas do mundo
    const [x1, y1] = this.app.view.clientToWorld(this.startClient.x, this.startClient.y);
    const [x2, y2] = this.app.view.clientToWorld(this.endClient.x,   this.endClient.y);
    const rect = normRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });

    const found = this.app.model.elementsInRect(rect);

    const multiAdd  = e.shiftKey && !e.ctrlKey && !e.metaKey;
    const multiTgl  = e.ctrlKey || e.metaKey;

    if (!multiAdd && !multiTgl) {
      // seleção nova
      this.app.model.selection.clear();
      for (const el of found) this.app.model.selection.add(el);
    } else if (multiAdd) {
      // adiciona encontrados
      for (const el of found) this.app.model.selection.add(el);
    } else if (multiTgl) {
      // alterna encontrados
      for (const el of found) this.app.model.selection.toggle(el);
    }

    this.app.scheduleRender();
    // Evita que o clique imediatamente após o mouseup limpe a seleção
    this.app._suppressNextClick = true;
    // libera na próxima volta do event loop
    setTimeout(() => { this.app._suppressNextClick = false; }, 0);
    this.app.bus?.publish("ui:selectionChanged", { 
      count: this.app.model.selection.getAll().length 
    });

  }

  _drawOverlay(ctx2d) {
    if (!this.isDragging) return;

    // desenha retângulo em coordenadas de TELA
    const [sx1, sy1] = this._clientToScreen(this.startClient.x, this.startClient.y);
    const [sx2, sy2] = this._clientToScreen(this.endClient.x,   this.endClient.y);
    const rx = Math.min(sx1, sx2);
    const ry = Math.min(sy1, sy2);
    const rw = Math.abs(sx2 - sx1);
    const rh = Math.abs(sy2 - sy1);

    ctx2d.save();
    ctx2d.strokeStyle = "rgba(57,160,255,0.9)";
    ctx2d.fillStyle   = "rgba(57,160,255,0.15)";
    ctx2d.lineWidth = 1;
    ctx2d.setLineDash([6, 4]);
    ctx2d.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
    ctx2d.fillRect(rx, ry, rw, rh);
    ctx2d.restore();
  }

  _clientToScreen(cx, cy) {
    // converte client -> world -> screen (para compatibilidade com zoom/origem)
    const [wx, wy] = this.app.view.clientToWorld(cx, cy);
    return this.app.view.toScreen(wx, wy);
  }
}

function normRect({ x, y, w, h }) {
  const rx = w >= 0 ? x : x + w;
  const ry = h >= 0 ? y : y + h;
  const rw = Math.abs(w);
  const rh = Math.abs(h);
  return { x: rx, y: ry, w: rw, h: rh };
}

export default SelectionMarqueeController;
