// PalettePanel.js — catálogo/drag & drop de elementos
import { ElementFactory } from "./ElementFactory.js";

export class PalettePanel {
  constructor({ container, bus }) {
    this.bus = bus;
    this.container = container;
    this.#render();
  }

  #render() {
    const el = this.container;
    el.innerHTML = "";
    el.style.display = "flex";
    el.style.flexWrap = "wrap";
    el.style.gap = "8px";
    el.style.padding = "6px";
    el.style.border = "1px solid #333";
    el.style.background = "#1b1b1b";
    el.style.borderRadius = "8px";

    for (const type of ElementFactory.list()) {
      const chip = document.createElement("div");
      chip.textContent = type;
      chip.draggable = true;
      chip.style.padding = "6px 10px";
      chip.style.border = "1px solid #444";
      chip.style.borderRadius = "999px";
      chip.style.cursor = "grab";
      chip.style.userSelect = "none";
      chip.style.font = "12px ui-sans-serif";
      chip.style.background = "#242424";

      chip.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", type);
        // dica p/ drop effect
        e.dataTransfer.dropEffect = "copy";
        this.bus.publish("palette:dragStart", { type });
      });

      el.appendChild(chip);
    }
  }
}
