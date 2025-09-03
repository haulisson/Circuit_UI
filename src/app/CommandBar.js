// src/app/CommandBar.js
// Barra de comandos enxuta e extensível.
// - Publica eventos no EventBus (command:*).
// - Oferece import/export de JSON.
// - Permite (opcional) reagir à seleção via ui:selectionChanged.
// - Suporta enable/disable contextual de botões (ex.: Delete).

export class CommandBar {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container - elemento destino para renderizar a barra
   * @param {EventBus}    opts.bus       - barramento de eventos
   * @param {boolean}    [opts.compact=false] - estilo compacto
   */
  constructor({ container, bus, compact = false } = {}) {
    if (!container) throw new Error("CommandBar: 'container' é obrigatório.");
    if (!bus) throw new Error("CommandBar: 'bus' é obrigatório.");

    this.container = container;
    this.bus = bus;
    this.compact = !!compact;

    // Estado interno
    this._buttons = new Map();   // id -> HTMLButtonElement
    this._hasSelection = false;  // controle de enable/disable contextual
    this._unsubs = [];

    this.#render();
    this.#wireSelectionListener(); // opcional (escuta ui:selectionChanged se existir)
  }

  /** Atualiza a UI conforme há seleção atual ou não. */
  setHasSelection(has) {
    this._hasSelection = !!has;
    this.#applyState();
  }

  /** Desmonta listeners (se precisar). */
  destroy() {
    for (const u of this._unsubs) {
      try { u(); } catch {}
    }
    this._unsubs.length = 0;
  }

  // =============== Renderização ===============

  #render() {
    const el = this.container;
    el.innerHTML = "";
    el.style.display = "flex";
    el.style.flexWrap = "wrap";
    el.style.alignItems = "center";
    el.style.gap = "8px";
    el.style.padding = this.compact ? "6px" : "8px 10px";
    el.style.border = "1px solid #333";
    el.style.background = "#1b1b1b";
    el.style.borderRadius = "8px";
    el.style.font = "13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";

    const group = (children = []) => {
      const g = document.createElement("div");
      g.style.display = "flex";
      g.style.gap = "6px";
      children.forEach(ch => g.appendChild(ch));
      return g;
    };

    const mkBtn = (id, label, title, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.title = title || label;
      b.style.padding = this.compact ? "6px 8px" : "8px 12px";
      b.style.border = "1px solid #444";
      b.style.borderRadius = "8px";
      b.style.background = "#242424";
      b.style.color = "#eaeaea";
      b.style.cursor = "pointer";
      b.style.userSelect = "none";
      b.onmouseenter = () => (b.style.background = "#2a2a2a");
      b.onmouseleave = () => (b.style.background = "#242424");
      b.onclick = (e) => { e.preventDefault(); onClick?.(e); };
      this._buttons.set(id, b);
      return b;
    };

    const sep = () => {
      const s = document.createElement("span");
      s.setAttribute("aria-hidden", "true");
      s.style.width = "1px";
      s.style.height = "22px";
      s.style.background = "#333";
      s.style.display = "inline-block";
      s.style.margin = "0 4px";
      return s;
    };

    // ------- grupo: undo/redo (NOVO) -------
    const bUndo = mkBtn("undo", "↩︎ Undo", "Desfazer (Ctrl+Z)", () => this.bus.publish("command:undo"));
    const bRedo = mkBtn("redo", "↪︎ Redo", "Refazer (Ctrl+Y / Ctrl+Shift+Z)", () => this.bus.publish("command:redo"));

    // ------- grupo: navegação/zoom -------
    const bZoomIn  = mkBtn("zoomIn",  "🔎＋", "Zoom In (Shift+=)", () => this.bus.publish("command:zoomIn"));
    const bZoomOut = mkBtn("zoomOut", "🔎－", "Zoom Out (-)",      () => this.bus.publish("command:zoomOut"));
    const bZoom0   = mkBtn("zoom0",   "🔁",  "Reset Zoom (Ctrl+0)",() => this.bus.publish("command:zoomReset"));
    const bCenter  = mkBtn("center",  "🎯",  "Centralizar seleção",() => this.bus.publish("command:centerOnSelection"));
    
    // ------- grupo: rotação (NOVO) -------
    // Rotaciona seleção em passos de 45° (steps:1). Shift+R já funciona no teclado.
    const bRotCCW = mkBtn("rotCCW", "↺", "Rotacionar -45°", () => this.bus.publish("command:rotateCCW", { steps: 1 }));
    const bRotCW  = mkBtn("rotCW",  "↻", "Rotacionar +45°", () => this.bus.publish("command:rotateCW",  { steps: 1 }));

    // ------- grupo: edição -------
    const bAddWire = mkBtn("addWire", "➕ Wire",      "Adicionar fio",       () => this.bus.publish("command:addWire"));
    const bAddRes  = mkBtn("addRes",  "➕ Resistor",  "Adicionar resistor",  () => this.bus.publish("command:addResistor"));
    const bDelete  = mkBtn("del",     "🗑️ Del",      "Excluir seleção (Del)",() => this.bus.publish("command:deleteSelected"));
    const bClear   = mkBtn("clear",   "🧹 Limpar",    "Limpar projeto",       () => this.bus.publish("command:clear"));

    // ------- grupo: arquivo (import/export) -------
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";
    fileInput.style.display = "none";
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const text = await file.text();
      // publica import JSON (AppShell já trata command:importJSON)
      this.bus.publish("command:importJSON", { json: text });
      // limpa o input pra permitir reimportar o mesmo arquivo
      fileInput.value = "";
    };
    el.appendChild(fileInput);

    const bImport = mkBtn("import", "📂 Importar", "Importar projeto (JSON)", () => fileInput.click());
    const bExport = mkBtn("export", "💾 Exportar", "Exportar projeto (JSON)", () => {
      // Preferência: AppShell faz export e dispara um download.
      // Aqui chamamos o fluxo padrão "command:exportJSON".
      this.bus.publish("command:exportJSON");
    });

    // Montagem
    el.appendChild(group([bUndo, bRedo]));               // NOVO
    el.appendChild(sep());
    el.appendChild(group([bZoomIn, bZoomOut, bZoom0, bCenter]));
    el.appendChild(sep());
    el.appendChild(group([bRotCCW, bRotCW]));            // << NOVO grupo rotação
    el.appendChild(sep());
    el.appendChild(group([bAddWire, bAddRes, bDelete, bClear]));
    el.appendChild(sep());
    el.appendChild(group([bImport, bExport]));

    // Estado inicial
    this.#applyState();
  }

  // =============== Estado / Reatividade ===============

  #applyState() {
    // Regras simples: Delete/Center exigem seleção
    const disableWhenNoSel = ["del", "center"];
    for (const id of disableWhenNoSel) {
      const b = this._buttons.get(id);
      // if (b) b.disabled = !this._hasSelection;
      // if (b) b.style.opacity = b.disabled ? "0.5" : "1.0";
      // if (b) b.style.cursor = b.disabled ? "not-allowed" : "pointer";
      if (!b) continue;
      b.disabled = !this._hasSelection;
      b.style.opacity = b.disabled ? "0.5" : "1.0";
      b.style.cursor = b.disabled ? "not-allowed" : "pointer";
    }
  }

  #wireSelectionListener() {
    // Opcional: se o AppShell publicar "ui:selectionChanged", reagimos automaticamente.
    // Ex.: app.bus.publish("ui:selectionChanged", { count: model.selection.getAll().length })
    try {
      const unsub = this.bus.subscribe("ui:selectionChanged", (p) => {
        const count = (p && typeof p.count === "number") ? p.count : 0;
        this.setHasSelection(count > 0);
      });
      this._unsubs.push(unsub);
    } catch {
      // silencioso: o EventBus pode não suportar unsubscribe por retorno
    }
  }
}

export default CommandBar;
