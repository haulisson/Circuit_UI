// src/services/SimulationEngine.js
// Stub de simulação: gera sinais sintéticos a partir do netlist.
// Quando incorporar um solver real, troque apenas este arquivo (e mantenha a API).

export class SimulationEngine {
  constructor() {
    this.running = false;
  }

  /**
   * Executa “simulação” (fake) e retorna { t:number[], signals:[{name,data:number[]}] }.
   * @param {{grid:number, components:any[], wires:any[]}} netlist
   * @param {{duration?:number, dt?:number}} [opts]
   */
  run(netlist, opts = {}) {
    const duration = opts.duration ?? 2.0;  // segundos
    const dt = opts.dt ?? 0.01;             // passo
    const N = Math.max(2, Math.floor(duration / dt));
    const t = Array.from({ length: N }, (_, i) => i * dt);

    // “Observáveis” a partir do netlist
    const probes = (netlist?.components || []).filter(c => c.kind === "probe" || c.kind === "vprobe");
    const resistors = (netlist?.components || []).filter(c => c.kind === "r" || c.kind === "resistor");
    const sources = (netlist?.components || []).filter(c =>
      c.kind === "v" || c.kind === "i" || c.kind === "source"
    );

    // Gera sinais determinísticos (sem aleatório) para facilitar teste visual
    const mkSine = (freq, phase = 0, amp = 1) => t.map(tt => amp * Math.sin(2 * Math.PI * freq * tt + phase));
    const mkStep = (t0) => t.map(tt => (tt >= t0 ? 1 : 0));
    const mkRamp = () => t.map((tt) => (tt % 1)); // dente-de-serra

    let signals = [];

    if (probes.length) {
      // Para cada Probe -> V(name): senóide com defasagem diferente
      probes.forEach((p, idx) => {
        const name = p.name || p.text || `Probe${idx + 1}`;
        signals.push({ name: `V(${name})`, data: mkSine(1 + idx * 0.2, idx * 0.5, 1) });
      });
    } else {
      // Sem probes: plota algo útil genérico
      signals.push({ name: "V(out)", data: mkSine(1, 0, 1) });
    }

    if (resistors.length) {
      // Corrente no primeiro resistor: degrau
      const r = resistors[0];
      const label = r.name || "R1";
      signals.push({ name: `I(${label})`, data: mkStep(duration * 0.4) });
    }

    if (sources.length) {
      // Tensão da 1ª fonte: rampa (dente de serra) escalada
      const s = sources[0];
      signals.push({ name: `${(s.kind || "V").toUpperCase()}src`, data: mkRamp().map(v => (v * 2 - 1)) });
    }

    if (!signals.length) {
      // fallback mínimo
      signals = [
        { name: "V(out)", data: mkSine(1.2) },
        { name: "I(R1)", data: mkStep(duration * 0.5) }
      ];
    }

    return { t, signals };
  }

  /** Para um solver assíncrono real, gerencie cancelamento aqui. */
  stop() {
    this.running = false;
  }
}

export default SimulationEngine;
