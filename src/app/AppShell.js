// src/app/AppShell.js
// Orquestrador da UI (remanufatura).
// - Coordena CanvasModel + CanvasView
// - Expõe EventBus e registro de comandos (command:*)
// - Suporta plugins (hooks) e drag&drop com ElementFactory
// - Cuida de render inicial, resize HiDPI e zoom centrado.
//
// Dependências diretas (núcleo):
//   ../canvas/CanvasModel.js
//   ../canvas/CanvasView.js
//   ./EventBus.js
//   ./ElementFactory.js  (para criar elementos em drops da paleta)
//
// Tópicos de comando (padrão):
//   command:zoomIn, command:zoomOut, command:zoomReset,
//   command:clear, command:exportJSON, command:importJSON,
//   command:addWire, command:addResistor,
//   command:deleteSelected, command:centerOnSelection
//
// Hooks de plugin (se existirem):
//   onInit(ctx)
//   beforeAddElement(el, ctx) -> pode retornar false para abortar
//   afterAddElement(el, ctx)
//   beforeRender(ctx)
//   afterRender(ctx)
//   beforeDestroy(ctx)
//
// Observação: Componentes de UI (CommandBar, PalettePanel) podem publicar em this.bus.

import { EventBus } from "./EventBus.js";
import { CanvasModel } from "../canvas/CanvasModel.js";
import { CanvasView } from "../canvas/CanvasView.js";
import { ElementFactory } from "./ElementFactory.js";
import { DragMoveController } from "./DragMoveController.js";
import { SelectionMarqueeController } from "./SelectionMarqueeController.js";
import { CommandStack } from "./CommandStack.js";
import { AddElementCommand } from "./commands/AddElementCommand.js";
import { RemoveSelectionCommand } from "./commands/RemoveSelectionCommand.js";
import { RotateSelectionCommand } from "./commands/RotateSelectionCommand.js";
import { WindowManager } from "./WindowManager.js";
import { NetlistView } from "../ui/views/NetlistView.js";
import { PropertyInspectorView } from "../ui/views/PropertyInspectorView.js";
import { GraphView } from "../ui/views/GraphView.js";
import { NetlistExporter } from "../services/NetlistExporter.js";
import { SimulationEngine } from "../services/SimulationEngine.js";


export class AppShell {
  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} opts.canvasEl - canvas alvo
   * @param {number} [opts.grid=8] - passo da grade
   * @param {Array<Object>} [opts.plugins=[]] - plugins { onInit, beforeAddElement, ... }
   * @param {boolean} [opts.enableShortcuts=true] - ativa atalhos básicos de teclado
   */
  constructor({ canvasEl, grid = 8, plugins = [], enableShortcuts = true } = {}) {
    if (!canvasEl) throw new Error("AppShell: canvasEl é obrigatório.");

    // Core
    this.bus = new EventBus();
    this.model = new CanvasModel({ grid });
    this.view = new CanvasView(canvasEl, this.model);
    this.windows = new WindowManager({ root: document.body });
    this.sim = new SimulationEngine();

    // Config
    // >>> garantir plugins antes dos controllers <<<
    this.plugins = Array.isArray(plugins) ? [...plugins] : [];
    this.enableShortcuts = enableShortcuts;
    this.grid = grid;

    // Estado interno
    this._ro = null;                  // ResizeObserver
    this._needsRender = false;        // batch render flag
    this._rafId = 0;                  // requestAnimationFrame id
    this._handlers = [];              // para cleanup (listeners)
    this._unsubs = [];                // para cleanup (bus unsubscribes)

    // Inicializações
    // (listeners, comandos, resize observer, etc.)
    this.#wireCanvasInteractions(canvasEl);
    this.#bindDefaultCommands();
    if (this.enableShortcuts) this.#bindKeyboardShortcuts(canvasEl);
    this.#observeResize(canvasEl);

    //Controllers
    // >>> agora sim: controllers de drag e marquee <<<
    this._dragCtl = new DragMoveController({ canvasEl, app: this });
    this._marqueeCtl = new SelectionMarqueeController({ canvasEl, app: this });


    // Pilha de comandos
    this.commands = new CommandStack();

    // Render inicial robusto (após layout do DOM)
    requestAnimationFrame(() => this.render());

    // Plugins: onInit
    this.#callPlugins("onInit", this.#ctx());
  }

  /* ===================== API pública ===================== */

  /** Adiciona elemento ao modelo e renderiza. */
  addElement(el, { select = true } = {}) {
    if (!el) return null;

    // Plugin hook: beforeAddElement
    const proceed = this.#callPlugins("beforeAddElement", this.#ctx(), el);
    if (proceed === false) return null;

    this.model.add(el);
    if (select) this.model.selection.set([el]);

    this.bus.publish("ui:selectionChanged", {
      count: this.model.selection.getAll().length
    });

    // Plugin hook: afterAddElement
    this.#callPlugins("afterAddElement", this.#ctx(), el);

    this.scheduleRender();
    return el;
  }

  addElement(el, { select = true, recordCommand = true } = {}) {
    if (!el) return null;
    const proceed = this.#callPlugins("beforeAddElement", this.#ctx(), el);
    if (proceed === false) return null;
    if (recordCommand && this.commands) {
      this.commands.pushAndExecute(new AddElementCommand({ app: this, element: el, select }));
    } else {
      this.model.add(el);
      if (select) this.model.selection.set([el]);
      this.bus.publish("ui:selectionChanged", {
        count: this.model.selection.getAll().length
      });
      this.scheduleRender();
    }
    this.#callPlugins("afterAddElement", this.#ctx(), el);
    return el;
  }

  /** Remove todos os itens selecionados. */
  removeSelected() {
    const sel = this.model.selection.getAll();
    sel.forEach(el => this.model.remove(el));
    this.scheduleRender();
    return sel.length;
  }
  removeSelected() {
    const count = this.model.selection.getAll().length;
    if (!count) return 0;
    if (this.commands) {
      this.commands.pushAndExecute(new RemoveSelectionCommand({ app: this }));
    } else {
      const sel = this.model.selection.getAll();
      sel.forEach(el => this.model.remove(el));
      this.scheduleRender();
    }
    return count;
  }

  /** Exporta o projeto (modelo) para JSON string. */
  exportJSON(pretty = true) {
    const json = this.model.toJSON();
    return pretty ? JSON.stringify(json, null, 2) : JSON.stringify(json);
  }

  /**
 * Importa projeto de JSON.
 * Aceita:
 *  - Formato "project": { grid, elements: [{ type, x, y, rotation, properties? }] }
 *  - Formato "netlist": { grid, components:[...], wires:[...] }
 */
  importJSON(jsonString, factory = ElementFactory) {
    try {
      const data = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
      if (!data || typeof data !== "object") throw new Error("JSON inválido.");

      // aplica grid se vier
      if (typeof data.grid === "number") this.model.grid = data.grid;

      // Limpa projeto atual
      this.model.clear();

      // Detecta esquema
      if (Array.isArray(data.elements)) {
        // ---- Formato PROJECT (existente) ----
        for (const e of data.elements) {
          const type = e.type || e.kind || e.t;
          if (factory && factory.has(type)) {
            const el = factory.create(type, e.x, e.y, { rotation: e.rotation, properties: e.properties });
            el.updateCoords?.();
            this.model.add(el);
          }
        }
      } else if (Array.isArray(data.components) || Array.isArray(data.wires)) {
        // ---- Formato NETLIST (novo) ----
        const mapKind = (k) => {
          const s = String(k || "").toLowerCase();
          if (s === "w" || s === "wire") return "wire";
          if (s === "r" || s === "res" || s === "resistor") return "resistor";
          if (s === "c" || s === "cap" || s === "capacitor") return "capacitor";
          if (s === "gnd" || s === "ground") return "ground";
          if (s === "probe") return "probe";
          if (s === "ammeter" || s === "am") return "ammeter";
          if (s === "v" || s === "i" || s === "source") return "source";
          if (s === "label") return "label";
          return s;
        };

        const rotFromPins = (ax, ay, bx, by) => {
          // ângulo do vetor A->B (em rad) em relação ao eixo +X
          const angX = Math.atan2(by - ay, bx - ax);
          // nosso eixo base é +Y; logo α = angX - 90°
          const alpha = angX - Math.PI / 2;
          // quantiza para passos de 45°
          let steps = Math.round(alpha / (Math.PI / 4));
          steps = ((steps % 8) + 8) % 8;
          return steps;
        };

        // wires
        if (Array.isArray(data.wires)) {
          for (const w of data.wires) {
            const [[ax, ay], [bx, by]] =
              w.a && w.b ? [w.a, w.b] :
                Array.isArray(w.pins) && w.pins.length >= 2 ? [w.pins[0], w.pins[1]] :
                  [];
            if (ax == null || ay == null || bx == null || by == null) continue;
            const el = factory?.create("wire", ax, ay, { x2: bx, y2: by });
            if (el) this.model.add(el);
          }
        }

        // components
        if (Array.isArray(data.components)) {
          for (const c of data.components) {
            const kind = mapKind(c.kind || c.type);
            // pinos esperados como [[x,y], [x,y], ...]
            const pins = Array.isArray(c.pins) ? c.pins : (Array.isArray(c.pin) ? [c.pin] : []);
            const props = {
              ...(c.name ? { name: c.name } : {}),
              ...(c.value ? { value: c.value } : {}),
              ...(c.kind && (c.kind.toLowerCase() === "v" || c.kind.toLowerCase() === "i")
                ? { kind: c.kind.toUpperCase() } : {})
            };

            if (kind === "wire") {
              if (pins.length >= 2) {
                const [a, b] = pins;
                const el = factory?.create("wire", a[0], a[1], { x2: b[0], y2: b[1] });
                if (el) this.model.add(el);
              }
              continue;
            }

            // elementos 2-pinos
            if (pins.length >= 2 && ["resistor", "capacitor", "source", "ammeter"].includes(kind)) {
              const [a, b] = pins;
              const rotation = rotFromPins(a[0], a[1], b[0], b[1]);
              const el = factory?.create(kind, a[0], a[1], { rotation, properties: props });
              if (el) this.model.add(el);
              continue;
            }

            // ground (1 pino)
            if (kind === "ground" && pins.length >= 1) {
              const [a] = pins;
              const el = factory?.create("ground", a[0], a[1], { properties: props });
              if (el) this.model.add(el);
              continue;
            }

            // probe (1 pino)
            if (kind === "probe" && pins.length >= 1) {
              const [a] = pins;
              const el = factory?.create("probe", a[0], a[1], { properties: props });
              if (el) this.model.add(el);
              continue;
            }

            // label (usa posição "at" se existir)
            if (kind === "label" && Array.isArray(c.at)) {
              const [x, y] = c.at;
              const el = factory?.create("label", x, y, { properties: { text: c.text || c.name || "" } });
              if (el) this.model.add(el);
              continue;
            }
          }
        }
      } else {
        throw new Error("JSON inválido.");
      }

      this.scheduleRender();
      return true;
    } catch (err) {
      console.error("Falha ao importar JSON:", err);
      return false;
    }
  }


  /** Força (ou agenda) um render. */
  render() {
    // Hooks
    this.#callPlugins("beforeRender", this.#ctx());
    this.view.render();
    this.#callPlugins("afterRender", this.#ctx());
    this._needsRender = false;
    this._rafId = 0;
  }

  /** Agenda render para o próximo frame (evita renders redundantes). */
  scheduleRender() {
    if (this._needsRender) return;
    this._needsRender = true;
    this._rafId = requestAnimationFrame(() => this.render());
  }

  /** Define zoom multiplicativo, centrando em (opcional) ponto do cursor. */
  zoomBy(factor, centerClientX = null, centerClientY = null) {
    const { canvas } = this.view;
    const rect = canvas.getBoundingClientRect();
    let px = rect.left + rect.width / 2;
    let py = rect.top + rect.height / 2;
    if (centerClientX != null && centerClientY != null) {
      px = centerClientX;
      py = centerClientY;
    }
    const [wx, wy] = this.view.clientToWorld(px, py);
    this.view.scale *= factor;
    const [px2, py2] = this.view.toScreen(wx, wy);
    this.view.originX += ((px - rect.left) - px2) / this.view.scale;
    this.view.originY += ((py - rect.top) - py2) / this.view.scale;
    this.scheduleRender();
  }

  /** Reseta zoom/viewport para padrão. */
  zoomReset() {
    this.view.scale = 1;
    this.view.originX = 0;
    this.view.originY = 0;
    this.scheduleRender();
  }

  /** Centraliza viewport na seleção (ou no conteúdo todo se vazio). */
  centerOnSelection() {
    const items = this.model.selection.getAll();
    const targets = items.length ? items : this.model.elements;
    if (!targets.length) return;

    // calcula bbox global
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of targets) {
      if (typeof el.getBounds !== "function") continue;
      const b = el.getBounds();
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    if (!isFinite(minX)) return;

    const { canvas } = this.view;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);

    // margem
    const margin = 24;
    const scaleX = (w - 2 * margin) / boxW;
    const scaleY = (h - 2 * margin) / boxH;
    this.view.scale = Math.max(0.1, Math.min(scaleX, scaleY));

    // centraliza
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const [px2, py2] = this.view.toScreen(cx, cy);
    this.view.originX += ((w / 2) - px2) / this.view.scale;
    this.view.originY += ((h / 2) - py2) / this.view.scale;

    this.scheduleRender();
  }

  /** Habilita/Desabilita shortcuts (em tempo de execução). */
  setShortcutsEnabled(enabled) {
    this.enableShortcuts = !!enabled;
  }

  /** Libera recursos (listeners, observer, raf). */
  destroy() {
    // Plugins
    this.#callPlugins("beforeDestroy", this.#ctx());

    // Listeners
    for (const off of this._handlers) {
      try { off(); } catch { /* noop */ }
    }
    this._handlers.length = 0;

    // Bus unsubscribes
    for (const u of this._unsubs) {
      try { u(); } catch { /* noop */ }
    }
    this._unsubs.length = 0;

    // ResizeObserver
    if (this._ro && typeof this._ro.disconnect === "function") this._ro.disconnect();
    this._ro = null;

    // RAF
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;

    if (this._dragCtl?.destroy) this._dragCtl.destroy();
    if (this._marqueeCtl?.destroy) this._marqueeCtl.destroy();
  }

  /* ===================== Internals ===================== */

  #ctx() {
    return {
      app: this,
      bus: this.bus,
      model: this.model,
      view: this.view,
      grid: this.grid,
    };
  }

  #callPlugins(hookName, ctx, arg) {
    const list = Array.isArray(this.plugins) ? this.plugins : [];
    let proceed = true;
    for (const p of list) {
      const fn = p && p[hookName];
      if (typeof fn === "function") {
        const r = (arg !== undefined) ? fn.call(p, ctx, arg) : fn.call(p, ctx);
        if (r === false) proceed = false;
      }
    }
    return proceed;
  }

  #observeResize(canvasEl) {
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => this.view.resize());
      ro.observe(canvasEl);
      this._ro = ro;
    } else {
      const onResize = () => this.view.resize();
      window.addEventListener("resize", onResize);
      this._handlers.push(() => window.removeEventListener("resize", onResize));
    }
  }

  #wireCanvasInteractions(canvasEl) {
    // Seleção por clique (Shift/Ctrl para toggle)
    const onClick = (e) => {
      // Se a seleção por marquee acabou de rodar, ignore este clique
      if (this._suppressNextClick) { this._suppressNextClick = false; return; }
      const el = this.view.pickAtClientPoint(e.clientX, e.clientY);
      const multi = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!multi) this.model.selection.clear();
      if (el) {
        if (multi) this.model.selection.toggle(el);
        else this.model.selection.add(el);
      }
      this.scheduleRender();
      this.bus.publish("ui:selectionChanged", { count: this.model.selection.getAll().length });
    };

    canvasEl.addEventListener("click", onClick);
    this._handlers.push(() => canvasEl.removeEventListener("click", onClick));

    // Área de drop (arrastar da paleta)
    const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
    const onDrop = (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("text/plain");
      if (!type || !ElementFactory.has(type)) return;

      const [wx, wy] = this.view.clientToWorld(e.clientX, e.clientY);
      const [gx, gy] = this.#snapToGrid(wx, wy, this.model.grid);
      const el = ElementFactory.create(type, gx, gy);
      this.addElement(el, { select: true });
    };
    canvasEl.addEventListener("dragover", onDragOver);
    canvasEl.addEventListener("drop", onDrop);
    this._handlers.push(() => {
      canvasEl.removeEventListener("dragover", onDragOver);
      canvasEl.removeEventListener("drop", onDrop);
    });
  }

  #bindDefaultCommands() {
    // Helper p/ registrar assinatura e guardar unsubscribe
    const sub = (topic, fn) => this._unsubs.push(this.bus.subscribe(topic, fn));

    sub("command:zoomIn", (p) => this.zoomBy(1.1, p?.x, p?.y));
    sub("command:zoomOut", (p) => this.zoomBy(1 / 1.1, p?.x, p?.y));
    sub("command:zoomReset", () => this.zoomReset());

    sub("command:clear", () => { this.model.clear(); this.scheduleRender(); });
    sub("command:deleteSelected", () => { this.removeSelected(); });

    sub("command:centerOnSelection", () => this.centerOnSelection());

    sub("command:exportJSON", () => {
      const data = this.exportJSON(true);
      // Em produção, você pode abrir uma janela/baixar arquivo.
      console.log("Project JSON:\n", data);
      alert("Exportado no console (F12).");
    });

    sub("command:importJSON", (payload) => {
      if (!payload || !payload.json) return;
      const ok = this.importJSON(payload.json, ElementFactory);
      if (!ok) alert("Falha ao importar JSON (ver console).");
    });

    // Ações de exemplo (enquanto não há PalettePanel)
    sub("command:addWire", () => {
      const el = ElementFactory.create("wire", 16, 16);
      this.addElement(el, { select: true });
    });
    sub("command:addResistor", () => {
      const el = ElementFactory.create("resistor", 160, 80);
      this.addElement(el, { select: true });
    });
    // Undo / Redo
    sub("command:undo", () => { if (this.commands?.undo()) this.scheduleRender(); });
    sub("command:redo", () => { if (this.commands?.redo()) this.scheduleRender(); });

    // Rotação (CW/CCW)
    // sub("command:rotateCW",  () => this.#rotateSelection(+1));
    // sub("command:rotateCCW", () => this.#rotateSelection(-1));
    // sub("command:rotateCW",  (p) => this.#rotateSelection(p?.steps ?? 1));
    // sub("command:rotateCCW", (p) => this.#rotateSelection(-(p?.steps ?? 1)));
    sub("command:rotateCW", (p) => this.#rotateSelection(p?.steps ?? 1));
    sub("command:rotateCCW", (p) => this.#rotateSelection(-(p?.steps ?? 1)));

    sub("ui:openNetlist", () => {
      const id = "netlist";
      const view = new NetlistView({ app: this });
      const win = this.windows.open({
        id,
        title: "Netlist",
        width: 520,
        height: 420,
        x: 80,
        y: 80,
        content: view.getElement()
      });
      win.focus();
    });

    sub("ui:openInspector", () => {
      const id = "inspector";
      const view = new PropertyInspectorView({ app: this });
      const win = this.windows.open({
        id,
        title: "Properties",
        width: 360,
        height: 300,
        x: 520, y: 80,
        content: view.getElement()
      });
      // quando a seleção mudar, peça para o view atualizar
      const unsub = this.bus.subscribe("ui:selectionChanged", () => view.refresh());
      // remove o listener quando a janela for fechada
      const origClose = win.close;
      win.close = () => { unsub(); origClose(); };
      win.focus();
    });

    sub("ui:openGraph", () => {
      const id = "graph";
      const view = new GraphView({ app: this });
      this.windows.open({
        id,
        title: "Graph",
        width: 640,
        height: 360,
        x: 150, y: 150,
        content: view.getElement()
      });
    });

    // dentro de #bindDefaultCommands():
    sub("ui:openGraph", () => {
      const id = "graph";
      const view = new GraphView({ app: this });
      const win = this.windows.open({
        id,
        title: "Graph",
        width: 680,
        height: 420,
        x: 160, y: 120,
        content: view.getElement()
      });
      win.focus();
    });

    sub("sim:run", (p) => {
      const netlist = NetlistExporter.export({ model: this.model });
      const out = this.sim.run(netlist, p || {});
      this.#openGraphWithSignals(out.signals);
    });

    sub("sim:stop", () => {
      this.sim.stop();
      // por enquanto, nada assíncrono; mantemos o comando para futuro cancelamento
    });

  }

  #bindKeyboardShortcuts(canvasEl) {
    const onKey = (e) => {
      if (!this.enableShortcuts) return;
      // evitar conflitos com inputs
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;

      // atalhos básicos
      if ((e.key === "+" || (e.key === "=" && e.shiftKey)) && !e.ctrlKey) {
        this.bus.publish("command:zoomIn");
        e.preventDefault();
      } else if (e.key === "-" && !e.ctrlKey) {
        this.bus.publish("command:zoomOut");
        e.preventDefault();
      } else if (e.key.toLowerCase() === "0" && (e.ctrlKey || e.metaKey)) {
        this.bus.publish("command:zoomReset");
        e.preventDefault();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        this.bus.publish("command:deleteSelected");
        e.preventDefault();
      } else if (e.key.toLowerCase() === "c" && e.ctrlKey) {
        // futuro: copiar
        e.preventDefault();
      } else if (e.key.toLowerCase() === "v" && e.ctrlKey) {
        // futuro: colar
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        this.bus.publish("command:undo");
        e.preventDefault();
      } else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")) {
        this.bus.publish("command:redo");
        e.preventDefault();
      } else if (!e.ctrlKey && !e.metaKey && (e.key === "r" || e.key === "R")) {
        // R gira CW, Shift+R gira CCW
        this.bus.publish(e.shiftKey ? "command:rotateCCW" : "command:rotateCW");
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey);
    this._handlers.push(() => window.removeEventListener("keydown", onKey));
  }

  #snapToGrid(x, y, step) {
    const sx = Math.round(x / step) * step;
    const sy = Math.round(y / step) * step;
    return [sx, sy];
  }



  #rotateSelection(steps) {
    const items = this.model.selection.getAll();
    if (!items.length) return;
    // usa CommandStack para habilitar Undo/Redo da rotação em grupo
    if (this.commands) {
      this.commands.pushAndExecute(new RotateSelectionCommand({ app: this, steps }));
    } else {
      // fallback sem stack (não deve acontecer no seu app):
      const ang = (Math.PI / 4) * steps;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      // centro da seleção
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const el of items) {
        const b = el.getBounds?.() ?? { x: el.x, y: el.y, w: 0, h: 0 };
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      // aplica
      for (const el of items) {
        const vx = el.x - cx, vy = el.y - cy;
        el.x = cx + (vx * cos - vy * sin);
        el.y = cy + (vx * sin + vy * cos);
        el.rotation = ((el.rotation ?? 0) + steps) & 7;
        el.updateCoords?.();
      }
      this.scheduleRender();
    }
  }

  #openGraphWithSignals(signals) {
    // abre (ou traz à frente) a janela Graph e injeta sinais
    const id = "graph";
    let win = this.windows.open({ id, title: "Graph", width: 680, height: 420, x: 160, y: 120 });
    // se ainda não tem view, crie e acople
    let container = win.getBody();
    let view = container.__graphView;
    if (!view) {
      view = new GraphView({ app: this, signals });
      container.innerHTML = "";
      container.appendChild(view.getElement());
      container.__graphView = view;
    } else if (signals) {
      view.setSignals(signals);
    }
    win.focus();
  }


}

export default AppShell;
