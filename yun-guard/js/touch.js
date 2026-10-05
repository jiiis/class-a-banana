// Dragging the view. Touch: one finger pans, a quick tap clicks. Mouse: press and drag on the board pans,
// and a drag swallows the click that would otherwise follow. Native pinch zoom and scrolling are suppressed.
import { panBy, canPan } from "./ui.js";

let start = null, last = null, dragged = false;
const DRAG = 8;   // pixels of movement before a press counts as a drag

export function initTouch() {
  window.addEventListener("touchstart", (ev) => {
    ev.preventDefault();
    if (ev.touches.length !== 1) { start = null; return; }
    const t = ev.touches[0];
    start = { x: t.clientX, y: t.clientY, time: performance.now() }; last = { x: t.clientX, y: t.clientY }; dragged = false;
  }, { passive: false });
  window.addEventListener("touchmove", (ev) => {
    ev.preventDefault();
    if (!start || ev.touches.length !== 1) return;
    const t = ev.touches[0];
    if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > DRAG) dragged = true;
    if (dragged && canPan()) panBy(t.clientX - last.x, t.clientY - last.y);
    last = { x: t.clientX, y: t.clientY };
  }, { passive: false });
  window.addEventListener("touchend", (ev) => {
    ev.preventDefault();
    if (!start) return;
    if (!dragged && performance.now() - start.time < 600) {        // a tap: hover then click whatever is under the finger
      const el = document.elementFromPoint(last.x, last.y);
      if (el) {
        const opts = { clientX: last.x, clientY: last.y, bubbles: true, cancelable: true };
        el.dispatchEvent(new MouseEvent("mousemove", opts));
        el.dispatchEvent(new MouseEvent("click", opts));
      }
    }
    start = null;
  }, { passive: false });
  window.addEventListener("touchcancel", () => { start = null; }, { passive: false });

  // Mouse dragging on the board (buttons and menus are left alone)
  let mouse = null, mouseDragged = false;
  window.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0 || ev.target.closest("button, #menu, #overlay, #heroPick")) return;
    mouse = { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY }; mouseDragged = false;
  });
  window.addEventListener("mousemove", (ev) => {
    if (!mouse) return;
    if (Math.hypot(ev.clientX - mouse.sx, ev.clientY - mouse.sy) > DRAG) mouseDragged = true;
    if (mouseDragged && canPan()) { panBy(ev.clientX - mouse.x, ev.clientY - mouse.y); document.body.style.cursor = "grabbing"; }
    mouse.x = ev.clientX; mouse.y = ev.clientY;
  });
  window.addEventListener("mouseup", () => { mouse = null; document.body.style.cursor = ""; });
  window.addEventListener("click", (ev) => { if (mouseDragged) { ev.stopPropagation(); ev.preventDefault(); mouseDragged = false; } }, true);
}
