// HitTestService.js
// Estratégias de hit-test (por bounding box, distância de linha, etc.)

export class HitTestService {
  constructor({ tolerance = 5 } = {}) {
    this.tolerance = tolerance;
  }

  hitElement(element, x, y) {
    // 1) se o elemento tiver near(x,y), use (mais preciso)
    if (typeof element.near === "function") return element.near(x, y, this.tolerance);

    // 2) fallback: bounding box
    if (typeof element.getBounds === "function") {
      const { x: bx, y: by, w, h } = element.getBounds();
      return x >= bx && x <= bx + w && y >= by && y <= by + h;
    }

    return false;
  }
}
