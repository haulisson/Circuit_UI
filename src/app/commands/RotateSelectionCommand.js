// RotateSelectionCommand.js — gira a seleção em torno do centro (bbox center)
// steps: inteiro em "passos de 45°" (positivo = CW, negativo = CCW)

export class RotateSelectionCommand {
  /**
   * @param {{app: any, steps: number}} opts
   */
  constructor({ app, steps }) {
    this.app = app;
    this.steps = Math.trunc(steps || 0);
    this._items = []; // [{ el, x0, y0, rot0, x1, y1, rot1 }]
    this._center = null;

    // snapshot inicial
    const sel = app.model.selection.getAll();
    if (!sel.length) return;

    // centro do bounding box da seleção
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of sel) {
      const b = (typeof el.getBounds === "function") ? el.getBounds() : { x: el.x, y: el.y, w: 0, h: 0 };
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this._center = { cx, cy };

    // pré-calcular estados final (x1,y1,rot1)
    const ang = (Math.PI / 4) * this.steps; // 45° * steps
    const cos = Math.cos(ang), sin = Math.sin(ang);
    for (const el of sel) {
      const x0 = el.x, y0 = el.y, rot0 = (el.rotation ?? 0);
      const vx = x0 - cx, vy = y0 - cy;
      const rx =  vx * cos - vy * sin;
      const ry =  vx * sin + vy * cos;
      const x1 = cx + rx, y1 = cy + ry;
      const rot1 = (rot0 + this.steps) & 7; // 0..7 (45°)
      this._items.push({ el, x0, y0, rot0, x1, y1, rot1 });
    }
  }

  execute() {
    if (!this._items.length) return;
    for (const it of this._items) {
      it.el.x = it.x1;
      it.el.y = it.y1;
      it.el.rotation = it.rot1;
      it.el.updateCoords?.();
    }
    this.app.scheduleRender();
  }

  undo() {
    if (!this._items.length) return;
    for (const it of this._items) {
      it.el.x = it.x0;
      it.el.y = it.y0;
      it.el.rotation = it.rot0;
      it.el.updateCoords?.();
    }
    this.app.scheduleRender();
  }
}

export default RotateSelectionCommand;
