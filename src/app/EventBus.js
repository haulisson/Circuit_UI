// EventBus.js — pub/sub simples
export class EventBus {
  constructor() { this.map = new Map(); }
  subscribe(topic, handler) {
    const list = this.map.get(topic) || [];
    list.push(handler);
    this.map.set(topic, list);
    return () => { // unsubscribe
      const arr = this.map.get(topic) || [];
      const i = arr.indexOf(handler);
      if (i >= 0) arr.splice(i, 1);
    };
  }
  publish(topic, payload) {
    (this.map.get(topic) || []).forEach(h => h(payload));
  }
}
