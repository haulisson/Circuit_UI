// src/app/PalettePanel.js
// Paleta de componentes com drag & drop, filtro e (opcionais) categorias.
// Integra-se com ElementFactory (list/has) e apenas publica "palette:dragStart".
// O AppShell já trata o drop no canvas, então não é necessário alterar o núcleo.
//
// Requisitos mínimos já atendidos no seu projeto:
// - ElementFactory.list() -> string[] de tipos registrados ("resistor", "wire", ...)
// - ElementFactory.has(type) -> boolean
//
// Tópicos EventBus usados (publica):
// - "palette:dragStart"  { type }
//
// Uso típico:
//   new PalettePanel({ container: document.getElementById("palette"), bus: app.bus })
//
// Dica: Você pode customizar "icons" e "descriptions" no config.

import { ElementFactory } from "./ElementFactory.js";

export class PalettePanel {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container - Elemento onde a paleta será renderizada
   * @param {EventBus}    opts.bus - Barramento de eventos
   * @param {boolean}    [opts.enableCategories=true] - Mostra categorias simples
   * @param {Object}     [opts.icons] - Mapa type->emoji/ícone para exibição
   * @param {Object}     [opts.descriptions] - Mapa type->string (tooltip)
   */
  constructor({
    container,
    bus,
    enableCategories = true,
    icons = {},
    descriptions = {},
  } = {}) {
    if (!container) throw new Error("PalettePanel: 'container' é obrigatório.");
    if (!bus) throw new Error("PalettePanel: 'bus' é obrigatório.");

    this.container = container;
    this.bus = bus;
    this.enableCategories = enableCategories;
    this.icons = {
      resistor: "📐",
      wire: "〰️",
      ground: "⏚",
      source: "⚡",
      capacitor: "▮▮",
      probe: "📎",
      ammeter: "🧲",
      label: "🏷️",
      ...icons,
    };
    this.descriptions = {
      resistor: "Elemento passivo R (2 pinos).",
      wire: "Conexão elétrica entre nós.",
      ground: "Referência 0V.",
      source: "Fonte (V/I).",
      capacitor: "Elemento passivo C (2 pinos).",
      probe: "Medição (tensão).",
      ammeter: "Medição (corrente).",
      label: "Rótulo de nó.",
      ...descriptions,
    };

    // cache inicial
    this._allTypes = ElementFactory.list(); // ex.: ["resistor","wire",...]
    this._filtered = this._allTypes;

    // render
    this.#render();
  }

  /** Atualiza a lista de tipos (caso ElementFactory mude em runtime). */
  refresh() {
    this._allTypes = ElementFactory.list();
    this.#applyFilter(this._search?.value || "");
  }

  // ================== Render ==================

  #render() {
    const root = this.container;
    root.innerHTML = "";

    // estilo geral
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.gap = "8px";
    root.style.padding = "8px";
    root.style.border = "1px solid #333";
    root.style.background = "#1b1b1b";
    root.style.borderRadius = "8px";
    root.style.font = "13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    root.style.color = "#eaeaea";

    // Cabeçalho (título + busca)
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";

    const title = document.createElement("div");
    title.textContent = "Componentes";
    title.style.fontWeight = "600";

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Buscar...";
    search.style.flex = "1";
    search.style.padding = "6px 8px";
    search.style.background = "#141414";
    search.style.border = "1px solid #333";
    search.style.borderRadius = "6px";
    search.style.color = "#eee";
    search.oninput = () => this.#applyFilter(search.value);

    header.append(title, search);
    this._search = search;

    // Conteúdo (lista ou categorias)
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "6px";

    this._content = content;

    root.append(header, content);

    // primeira renderização
    this.#applyFilter("");
  }

  #applyFilter(text) {
    const q = (text || "").toLowerCase().trim();
    if (!q) {
      this._filtered = this._allTypes.slice();
    } else {
      this._filtered = this._allTypes.filter(t =>
        t.toLowerCase().includes(q) ||
        (this.descriptions[t] || "").toLowerCase().includes(q)
      );
    }
    this.#renderContent();
  }

  #renderContent() {
    const content = this._content;
    content.innerHTML = "";

    // Agrupar por categoria simples (passivos, medida, conexões, fontes, rotulagem)
    // Você pode ajustar aqui como preferir ou desativar via enableCategories:false
    const categorize = (type) => {
      if (!this.enableCategories) return "_";
      if (/resistor|capacitor|inductor/.test(type)) return "Passivos";
      if (/probe|ammeter|voltmeter/.test(type)) return "Medida";
      if (/wire|connection|node/.test(type)) return "Conexões";
      if (/source|vsrc|isrc/.test(type)) return "Fontes";
      if (/label/.test(type)) return "Rotulagem";
      return "Outros";
    };

    const groups = new Map(); // nome -> [types]
    for (const t of this._filtered) {
      const g = categorize(t);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(t);
    }

    // Render: cada grupo com seus chips
    for (const [groupName, types] of groups.entries()) {
      if (groupName !== "_" && this.enableCategories) {
        const h = document.createElement("div");
        h.textContent = groupName;
        h.style.fontWeight = "600";
        h.style.opacity = "0.9";
        h.style.marginTop = "6px";
        content.appendChild(h);
      }

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "8px";

      for (const t of types) {
        row.appendChild(this.#makeChip(t));
      }
      content.appendChild(row);
    }

    // caso vazio
    if (!this._filtered.length) {
      const empty = document.createElement("div");
      empty.textContent = "Nenhum componente encontrado.";
      empty.style.opacity = "0.7";
      empty.style.fontStyle = "italic";
      empty.style.padding = "4px 2px";
      content.appendChild(empty);
    }
  }

  #makeChip(type) {
    const chip = document.createElement("div");
    chip.draggable = true;
    chip.style.display = "inline-flex";
    chip.style.alignItems = "center";
    chip.style.gap = "6px";
    chip.style.padding = "6px 10px";
    chip.style.border = "1px solid #444";
    chip.style.borderRadius = "999px";
    chip.style.cursor = "grab";
    chip.style.userSelect = "none";
    chip.style.background = "#242424";
    chip.style.whiteSpace = "nowrap";

    const icon = document.createElement("span");
    icon.textContent = this.icons[type] || "🔧";

    const label = document.createElement("span");
    label.textContent = type;

    chip.title = this.descriptions[type] || type;

    chip.append(icon, label);

    chip.addEventListener("dragstart", (e) => {
      // Garante que o tipo exista no factory antes de publicar
      if (!ElementFactory.has(type)) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", type);
      e.dataTransfer.dropEffect = "copy";
      this.bus.publish("palette:dragStart", { type });
    });

    // Duplo-clique: adiciona aproximadamente no centro do canvas (opcional)
    // Publicamos um "hint" via EventBus; AppShell pode (futuramente) reagir.
    chip.addEventListener("dblclick", () => {
      // Se quiser adicionar sem drag & drop, você pode publicar um comando:
      // this.bus.publish("command:addResistor"), etc.
      // Aqui preferimos manter genérico:
      this.bus.publish("palette:dblclick", { type });
      alert(`Dica: arraste "${type}" para o canvas para posicionar.`);
    });

    return chip;
  }
}

export default PalettePanel;
