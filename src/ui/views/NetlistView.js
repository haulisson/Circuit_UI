// src/ui/views/NetlistView.js
import NetlistExporter from "../../services/NetlistExporter.js";

export class NetlistView {
  /**
   * @param {{ app:any }} opts
   */
  constructor({ app }) {
    this.app = app;
    this.el = document.createElement("div");
    this.el.style.display = "flex";
    this.el.style.flexDirection = "column";
    this.el.style.gap = "8px";

    // Barra ações
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";

    const mkBtn = (label, title, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.title = title || label;
      Object.assign(b.style, {
        padding: "6px 10px",
        border: "1px solid #444",
        borderRadius: "8px",
        background: "#242424",
        color: "#eaeaea",
        cursor: "pointer"
      });
      b.onclick = (e) => { e.preventDefault(); fn?.(); };
      return b;
    };

    const btnRefresh = mkBtn("🔄 Refresh", "Regerar netlist", () => this.refresh());
    const btnCopy    = mkBtn("📋 Copy",    "Copiar JSON", () => this.copy());
    const btnSave    = mkBtn("💾 Download","Salvar netlist.json", () => this.download());

    actions.append(btnRefresh, btnCopy, btnSave);

    // Área de visualização
    this.pre = document.createElement("pre");
    Object.assign(this.pre.style, {
      margin: 0,
      padding: "8px",
      background: "#141414",
      border: "1px solid #333",
      borderRadius: "8px",
      overflow: "auto",
      maxHeight: "60vh",
      fontSize: "12px",
      lineHeight: "1.35"
    });

    this.el.append(actions, this.pre);
    this.refresh();
  }

  refresh() {
    const data = NetlistExporter.export({ model: this.app.model });
    const text = JSON.stringify(data, null, 2);
    this.pre.textContent = text;
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.pre.textContent || "");
      alert("Netlist copiado para a área de transferência.");
    } catch {
      alert("Falha ao copiar. Veja o console.");
      console.log(this.pre.textContent);
    }
  }

  download() {
    const blob = new Blob([this.pre.textContent || ""], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "netlist.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  /** Retorna o elemento raiz para inserir em uma janela. */
  getElement() { return this.el; }
}

export default NetlistView;
