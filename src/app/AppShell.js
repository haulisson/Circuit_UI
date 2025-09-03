import { EventBus } from "./EventBus.js";
import { CanvasModel } from "../canvas/CanvasModel.js";
import { CanvasView } from "../canvas/CanvasView.js";
import { WireElement } from "../canvas/elements/WireElement.js";
import { ResistorElement } from "../canvas/elements/ResistorElement.js";

export class AppShell {
  constructor({ canvasEl, grid = 8 } = {}) {
    this.bus = new EventBus();
    this.model = new CanvasModel({ grid });
    this.view = new CanvasView(canvasEl, this.model);

    canvasEl.addEventListener("click", (e) => {
      const el = this.view.pickAtClientPoint(e.clientX, e.clientY);
      this.model.selection.clear();
      if (el) this.model.selection.add(el);
      this.view.render();
    });

    this.bus.subscribe("command:zoomIn", () => this.#zoom(1.1));
    this.bus.subscribe("command:zoomOut", () => this.#zoom(1/1.1));
    this.bus.subscribe("command:clear", () => { this.model.clear(); this.view.render(); });

    // novos:
    this.bus.subscribe("command:addWire", () => {
      this.addElement(new WireElement(16, 16, 96, 16));
    });
    this.bus.subscribe("command:addResistor", () => {
      this.addElement(new ResistorElement(160, 80, 0, "1k", "R1"));
    });
    this.bus.subscribe("command:exportJSON", () => {
      const data = this.exportJSON();
      console.log("Project JSON:\n", data);
      alert("Exportado no console (F12)");
    });
  }

  addElement(el) { this.model.add(el); this.view.render(); return el; }

  exportJSON() { return JSON.stringify(this.model.toJSON(), null, 2); }

  #zoom(f) {
    const { canvas } = this.view;
    const rect = canvas.getBoundingClientRect();
    const px = rect.left + rect.width / 2;
    const py = rect.top + rect.height / 2;
    const [wx, wy] = this.view.toWorld(px - rect.left, py - rect.top);
    this.view.scale *= f;
    const [px2, py2] = this.view.toScreen(wx, wy);
    this.view.originX += ((rect.width / 2) - px2) / this.view.scale;
    this.view.originY += ((rect.height / 2) - py2) / this.view.scale;
    this.view.render();
  }
}
