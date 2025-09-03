// CommandBar.js — barra de comandos simples que publica eventos no EventBus
export class CommandBar {
  constructor({ container, bus }) {
    this.bus = bus;
    this.container = container;
    this.#render();
  }

  #btn(label, topic) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = () => this.bus.publish(topic);
    return b;
  }

  #render() {
    this.container.innerHTML = "";
    this.container.style.display = "flex";
    this.container.style.gap = "8px";
    this.container.style.margin = "8px 0";

    const row = document.createElement("div");
    row.append(
      this.#btn("Zoom +", "command:zoomIn"),
      this.#btn("Zoom −", "command:zoomOut"),
      this.#btn("Limpar", "command:clear"),
      this.#btn("Add Wire", "command:addWire"),
      this.#btn("Add Resistor", "command:addResistor"),
      this.#btn("Export JSON", "command:exportJSON")
    );
    this.container.append(row);
  }
}
