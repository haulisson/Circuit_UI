// src/services/NetlistExporter.js
export class NetlistExporter {
  /**
   * @param {{ model: any }} ctx
   * @returns {{ grid:number, components:Array, wires:Array }}
   */
  static export({ model }) {
    const out = {
      grid: model?.grid ?? 8,
      components: [],
      wires: []
    };
    if (!model) return out;

    for (const el of model.elements) {
      if (!el?.type) continue;

      if (typeof el.toNetlist === "function") {
        // Se o elemento define seu próprio formato, usamos como “component”
        const [kind, payload] = el.toNetlist();
        out.components.push({ kind, ...payload });
        continue;
      }

      // fallback genérico
      if (el.type === "wire") {
        const a = el.getPort?.("A"), b = el.getPort?.("B");
        if (a && b) out.wires.push({ a: [a.x, a.y], b: [b.x, b.y] });
      } else {
        const pins = el.getPorts?.().map(cp => [cp.x, cp.y]) || [];
        out.components.push({
          kind: el.type,
          name: el.properties?.name,
          value: el.properties?.value,
          pins
        });
      }
    }

    return out;
  }
}

export default NetlistExporter;
