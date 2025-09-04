// src/app/WindowManager.js
export class WindowManager {
  /**
   * @param {{root?:HTMLElement}} opts
   */
  constructor({ root = document.body } = {}) {
    this.root = root;
    this._zbase = 1000;
    this._wins = new Map(); // id -> {el, api}
  }

  /**
   * Cria (ou traz à frente) uma janela.
   * @param {{ id:string, title:string, width?:number, height?:number, x?:number, y?:number, content?:HTMLElement }} opts
   */
  open(opts) {
    const { id, title, width = 420, height = 320, x = 60, y = 60, content } = opts || {};
    if (!id) throw new Error("WindowManager.open: 'id' é obrigatório.");

    // se já existe, só traz para frente
    if (this._wins.has(id)) {
      const w = this._wins.get(id);
      this._bringToFront(w.el);
      return w.api;
    }

    // cria DOM
    const el = document.createElement("div");
    el.className = "wm-window";
    Object.assign(el.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      background: "#1b1b1b",
      color: "#eaeaea",
      border: "1px solid #333",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
      zIndex: String(++this._zbase),
      display: "flex",
      flexDirection: "column",
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      height: "36px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px",
      background: "#242424",
      borderBottom: "1px solid #333",
      cursor: "move",
      userSelect: "none"
    });
    const hTitle = document.createElement("div");
    hTitle.textContent = title || "Window";
    hTitle.style.fontWeight = "600";

    const hBtns = document.createElement("div");
    const btnClose = document.createElement("button");
    btnClose.textContent = "✕";
    Object.assign(btnClose.style, {
      border: "1px solid #444",
      borderRadius: "6px",
      background: "#2a2a2a",
      color: "#eaeaea",
      cursor: "pointer",
      padding: "4px 8px"
    });
    btnClose.onclick = () => this.close(id);

    hBtns.appendChild(btnClose);
    header.append(hTitle, hBtns);

    const body = document.createElement("div");
    Object.assign(body.style, {
      flex: "1",
      overflow: "auto",
      padding: "8px"
    });
    if (content) body.appendChild(content);

    const resizer = document.createElement("div");
    Object.assign(resizer.style, {
      position: "absolute",
      width: "14px",
      height: "14px",
      right: "0",
      bottom: "0",
      cursor: "nwse-resize",
      background: "linear-gradient(135deg, transparent 50%, #444 50%)"
    });

    el.append(header, body, resizer);
    this.root.appendChild(el);

    // drag
    let dragging = false;
    let startX = 0, startY = 0, startL = 0, startT = 0;
    header.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      startL = rect.left; startT = rect.top;
      this._bringToFront(el);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${startL + dx}px`;
      el.style.top  = `${startT + dy}px`;
    });
    window.addEventListener("mouseup", () => dragging = false);

    // resize
    let resizing = false;
    let sw = 0, sh = 0, sx = 0, sy = 0;
    resizer.addEventListener("mousedown", (e) => {
      resizing = true;
      const rect = el.getBoundingClientRect();
      sw = rect.width; sh = rect.height;
      sx = e.clientX;  sy = e.clientY;
      this._bringToFront(el);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!resizing) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      el.style.width  = `${Math.max(280, sw + dx)}px`;
      el.style.height = `${Math.max(180, sh + dy)}px`;
    });
    window.addEventListener("mouseup", () => resizing = false);

    // public api
    const api = {
      id,
      el,
      setTitle: (t) => { hTitle.textContent = t; },
      setContent: (node) => { body.innerHTML = ""; if (node) body.appendChild(node); },
      focus: () => this._bringToFront(el),
      close: () => this.close(id),
      getBody: () => body
    };

    this._wins.set(id, { el, api });
    return api;
  }

  close(id) {
    const w = this._wins.get(id);
    if (!w) return false;
    w.el.remove();
    this._wins.delete(id);
    return true;
  }

  _bringToFront(el) {
    el.style.zIndex = String(++this._zbase);
  }
}

export default WindowManager;
