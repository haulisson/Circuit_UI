// src/ui/views/PropertyInspectorView.js
import PropertyChangeCommand from "../../app/commands/PropertyChangeCommand.js";

export class PropertyInspectorView {
  /**
   * @param {{ app:any }} opts
   */
  constructor({ app }) {
    this.app = app;

    this.root = document.createElement("div");
    this.root.style.display = "flex";
    this.root.style.flexDirection = "column";
    this.root.style.gap = "8px";

    // form
    this.form = document.createElement("div");
    this.form.style.display = "grid";
    this.form.style.gridTemplateColumns = "90px 1fr";
    this.form.style.gap = "6px";

    this.fields = {
      type: this.#row("Tipo", this.#readOnly()),
      name: this.#row("Name", this.#text("name")),
      value:this.#row("Value",this.#text("value")),
      kind: this.#row("Kind", this.#select("kind", [
        {label:"(—)", value:""},
        {label:"Voltage (V)", value:"V"},
        {label:"Current (I)", value:"I"},
      ]))
    };

    // ações
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";

    const mkBtn = (label, fn) => {
      const b = document.createElement("button");
      b.textContent = label; b.type = "button";
      Object.assign(b.style, {
        padding: "6px 10px", border:"1px solid #444", borderRadius:"8px",
        background:"#242424", color:"#eaeaea", cursor:"pointer"
      });
      b.onclick = (e) => { e.preventDefault(); fn?.(); };
      return b;
    };

    this.btnApply = mkBtn("Apply", () => this.apply());
    const btnRefresh = mkBtn("Refresh", () => this.refresh());
    actions.append(this.btnApply, btnRefresh);

    this.root.append(this.form, actions);
    this.refresh();
  }

  getElement() { return this.root; }

  /** Atualiza inputs a partir da seleção atual */
  refresh() {
    const sel = this.app.model.selection.getAll();
    const first = sel[0];

    // tipo
    this.fields.type.input.value = first?.type ?? "";

    // name/value/kind (se existir nos props)
    const props = first?.properties || {};
    this.fields.name.input.value  = props.name  ?? "";
    this.fields.value.input.value = props.value ?? "";
    this.fields.kind.input.value  = props.kind  ?? "";

    // habilita/desabilita Apply
    this.btnApply.disabled = sel.length === 0;
    this.btnApply.style.opacity = this.btnApply.disabled ? "0.5" : "1";
  }

  /** Aplica as edições a todos os selecionados (com Undo/Redo) */
  apply() {
    const sel = this.app.model.selection.getAll();
    if (!sel.length) return;

    const patch = {};
    const name = this.fields.name.input.value.trim();
    const value= this.fields.value.input.value.trim();
    const kind = this.fields.kind.input.value.trim();
    if (name)  patch.name  = name;
    if (value) patch.value = value;
    if (kind)  patch.kind  = kind;

    if (!Object.keys(patch).length) return;

    const patches = sel.map(el => ({ el, patch }));
    const cmd = new PropertyChangeCommand({ app: this.app, patches });
    this.app.commands?.pushAndExecute(cmd);
  }

  /* ===== helpers de UI ===== */

  #row(label, input) {
    const lab = document.createElement("label");
    lab.textContent = label;
    lab.style.color = "#c9c9c9";
    lab.style.alignSelf = "center";

    const wrap = document.createElement("div");
    wrap.appendChild(input);

    this.form.append(lab, wrap);
    return { label: lab, input };
  }

  #text(name) {
    const i = document.createElement("input");
    i.type = "text";
    i.placeholder = name;
    Object.assign(i.style, {
      width:"100%", padding:"6px 8px", border:"1px solid #444",
      borderRadius:"6px", background:"#141414", color:"#eaeaea"
    });
    return i;
  }

  #select(_name, opts) {
    const s = document.createElement("select");
    Object.assign(s.style, {
      width:"100%", padding:"6px 8px", border:"1px solid #444",
      borderRadius:"6px", background:"#141414", color:"#eaeaea"
    });
    for (const o of opts) {
      const op = document.createElement("option");
      op.textContent = o.label; op.value = o.value;
      s.appendChild(op);
    }
    return s;
  }

  #readOnly() {
    const i = this.#text("");
    i.readOnly = true;
    i.style.opacity = "0.7";
    return i;
  }
}

export default PropertyInspectorView;
