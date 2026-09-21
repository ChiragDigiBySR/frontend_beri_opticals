const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(", ");

function isRealField(el) {
  if (el.offsetParent === null) return false; // hidden
  if (el.dataset?.enterSkip === "true") return false; // explicitly opted out
  if (el.readOnly) return false;
  if (window.getComputedStyle(el).pointerEvents === "none") return false;
  return true;
}

export function handleEnterAsTab(e) {
  if (e.key !== "Enter") return;

  const target = e.target;
  const tag = target.tagName;

  if (tag === "BUTTON" || tag === "TEXTAREA") return;
  if (target.dataset?.enterSkip === "true") return;

  const container = e.currentTarget;
  const focusable = Array.from(
    container.querySelectorAll(FOCUSABLE_SELECTOR),
  ).filter(isRealField);

  const currentIndex = focusable.indexOf(target);
  if (currentIndex === -1) return;

  e.preventDefault();

  const next = focusable[currentIndex + 1];
  if (next) {
    next.focus();
    if (typeof next.select === "function") {
      try {
        next.select();
      } catch {
        /* not all elements support .select() */
      }
    }
  }
}