// src/app/commands/PropertyChangeCommand.js
export class PropertyChangeCommand {
  /**
   * @param {{ app:any, patches:Array<{el:any, patch:object}> }} opts
   */
  constructor({ app, patches }) {
    this.app = app;
    this.items = [];
    for (const { el, patch } of patches || []) {
      if (!el || !patch) continue;
      const before = { ...(el.properties || {}) };
      const after = { ...before, ...patch };
      this.items.push({ el, before, after });
    }
  }
  execute() {
    for (const it of this.items) it.el.setProperties(it.after);
    this.app.scheduleRender();
  }
  undo() {
    for (const it of this.items) it.el.setProperties(it.before);
    this.app.scheduleRender();
  }
}
export default PropertyChangeCommand;
