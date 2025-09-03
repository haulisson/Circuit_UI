// CanvasView.js
// Renderização e interações básicas do canvas (apenas desenho + pan/zoom mínimos).

import { HitTestService } from "./HitTestService.js";

export class CanvasView {
  constructor(canvasEl, model) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.model = model;

    // viewport
    this.scale = 1;
    this.originX = 0;
    this.originY = 0;

    // serviços
    this.hitTestService = new HitTestService();

    // DPI aware
    this.#setupHiDPI();

    // (Opcional) listeners simples de pan
    this.#installBasicPan();
  }

  setViewport({ scale, originX, originY } = {}) {
    if (scale !== undefined) this.scale = scale;
    if (originX !== undefined) this.originX = originX;
    if (originY !== undefined) this.originY = originY;
    this.render();
  }

  // Conversões
  toWorld(px, py) {
    return [
      px / this.scale + this.originX,
      py / this.scale + this.originY
    ];
  }

  toScreen(wx, wy) {
    return [
      (wx - this.originX) * this.scale,
      (wy - this.originY) * this.scale
    ];
  }

  render() {
    const { width, height } = this.canvas;
    const c = this.ctx;

    // fundo
    c.clearRect(0, 0, width, height);
    this.#drawGrid(c);

    // elementos
    c.save();
    c.translate(-this.originX * this.scale, -this.originY * this.scale);
    c.scale(this.scale, this.scale);

    this.model.forEach(el => {
      if (typeof el.draw === "function") el.draw(c);
      // destaque seleção (simples)
      if (el.selected && typeof el.getBounds === "function") {
        const { x, y, w, h } = el.getBounds();
        c.save();
        c.strokeStyle = "rgba(0, 150, 255, 0.8)";
        c.setLineDash([4, 3]);
        c.strokeRect(x, y, w, h);
        c.restore();
      }
    });

    c.restore();
  }

  pickAtClientPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const [wx, wy] = this.toWorld(px, py);
    return this.model.hitTest(wx, wy, this.hitTestService);
  }

  // ------- privados -------
  #drawGrid(c) {
    const step = this.model?.grid ?? 8;
    const w = this.canvas.width;
    const h = this.canvas.height;

    c.save();
    c.fillStyle = "#1e1e1e";
    c.fillRect(0, 0, w, h);

    c.strokeStyle = "#2a2a2a";
    c.lineWidth = 1;

    // desenha poucas linhas visíveis com base no viewport
    const left = this.originX;
    const top = this.originY;
    const right = left + w / this.scale;
    const bottom = top + h / this.scale;

    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;

    c.beginPath();
    for (let x = startX; x <= right; x += step) {
      const [sx] = this.toScreen(x, 0);
      c.moveTo(sx + 0.5, 0);
      c.lineTo(sx + 0.5, h);
    }
    for (let y = startY; y <= bottom; y += step) {
      const [, sy] = this.toScreen(0, y);
      c.moveTo(0, sy + 0.5);
      c.lineTo(w, sy + 0.5);
    }
    c.stroke();
    c.restore();
  }

  #setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  #installBasicPan() {
    let panning = false;
    let lastX = 0, lastY = 0;

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 1 || e.altKey) { // botão do meio ou ALT
        panning = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!panning) return;
      const dx = (e.clientX - lastX) / this.scale;
      const dy = (e.clientY - lastY) / this.scale;
      this.originX -= dx;
      this.originY -= dy;
      lastX = e.clientX;
      lastY = e.clientY;
      this.render();
    });

    window.addEventListener("mouseup", () => { panning = false; });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

      // zoom para o cursor
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const [wx, wy] = this.toWorld(px, py);

      this.scale *= factor;
      const [px2, py2] = this.toScreen(wx, wy);
      this.originX += (px - px2) / this.scale;
      this.originY += (py - py2) / this.scale;

      this.render();
    }, { passive: false });
  }
}
