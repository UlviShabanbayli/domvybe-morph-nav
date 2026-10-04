// Morph nav — a liquid-glass mega-navigation in black and white: a floating glass capsule that flows down into ONE
// panel, and a layout that follows its container (a desktop capsule, a tablet capsule, a mobile burger).
// Point at a section: the capsule itself pours down into the panel — one drop of glass, no gap between bar and panel.
// Move across the menu: there is no dropdown per item; the drop reshapes to the next section on springs (the edge
// that travels furthest leads with a jelly bounce, the others follow) while the old content slides out and the new
// one slides in, block by block. A clear glass lens follows the pointer across the menu and across the links,
// stretching like a drop and keeping its volume. A spotlight and a rim light trail the pointer on the glass, a sheen
// sweeps across it the way you moved, and the light behind it leans towards the open section.
// On a phone the same markup is a burger: the capsule swells into a full-height glass sheet with an accordion inside.
// Drag the demo window's handle to resize it: the nav re-flows, and its pieces glide to their new places.
// Three looks share this code (?look=glass | metal | island, or a | b | c), each with its own material and its own
// feel: smoked liquid glass; liquid metal that pours heavy and wobbles; a solid black island that snaps like iOS and
// whose content focuses in out of a blur. Tokens and parts live in style.css; the physics per look is FEEL below.
// Real component: a <nav> with a list of disclosure buttons (aria-expanded, aria-controls) and regions, hover intent
// with a safe triangle, the arrow keys, Home/End and Escape, a modal sheet with a focus trap on mobile, tap instead of
// hover on touch, and prefers-reduced-motion (no morph, a short fade). Every link goes to #: nothing opens.
//
// The six stages of the tutorial (steps/step1 … step6; the STAGE banners below say where each part lives in this file):
//   1. the markup, the tokens, the three looks             4. the morph: the sliding content, the lenses, the light
//   2. the demo window: the layout comes from CSS          5. mobile: the sheet, the burger, the accordion, the swipe
//   3. the drop on springs, hover intent, keyboard, focus  6. the re-flow, the impact, the giant word, the feel, the loop

// ================================================================================================================
// STAGE 1 · the frame, the demo window, the drop and the lens
// ================================================================================================================
const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LOOK = html.dataset.look;                                   // set before the first paint (index.html)
const FULL = 'full' in html.dataset;                              // ?full=1: the bare component at the real viewport size
const WIDE = 'wide' in html.dataset;                              // ?wide=1: a 1280 × 720 landscape frame (16:9 videos)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const frameEl = $('.frame'), device = $('.device'), vp = $('#vp'), handle = $('.handle'), live = $('.live');
const mn = $('#mn'), bar = $('.bar'), glassEl = $('.glass'), sheen = $('.g-sheen'), rule = $('.g-rule');
const sheet = $('.sheet'), burger = $('.burger'), brand = $('.brand'), cta = $('.cta'), site = $('.site'), vscrim = $('.vscrim');

// the composition, per format: the frame's size; the demo window's CSS width range, its drawn width range and drawn
// height; the width it starts at; how wide the giant word may grow
const FORMAT = WIDE
  ? { fw: 1280, fh: 720, W: [390, 1280], FW: [300, 1168], clip: 486, start: 1280, word: 520 }
  : { fw: 432, fh: 768, W: [360, 1040], FW: [220, 400], clip: 348, start: 880, word: 396 };

// fit the composition to the screen
function fit() { html.style.setProperty('--k', FULL ? '1' : Math.min(innerWidth / FORMAT.fw, innerHeight / FORMAT.fh).toFixed(4)); }
fit();
addEventListener('resize', fit);
$('meta[name="theme-color"]').content = getComputedStyle(html).getPropertyValue('--page').trim();

// the studio clock: ambient life reads time from here, so a capture tool can pause or drive it
const studio = (window.__studio = window.__studio || {});
if (!studio.now) studio.now = () => performance.now();

// With reduced motion every spring is critically damped: things still arrive, they just don't bounce.
const spring = (stiffness, damping) => ({ stiffness, damping: calm ? 2 * Math.sqrt(stiffness) : damping });
const critical = (stiffness) => ({ stiffness, damping: 2 * Math.sqrt(stiffness) });
const snap = (s) => { s.value = s.target; s.velocity = 0; };

// each look's physics: the drop's leading and trailing edges, the lens's, how much the drop softens at speed, and
// whether content focuses in out of a blur, and whether the drop reshapes in two strokes (sideways, then down)
const FEEL = {
  glass: { drop: [[300, 17], [240, 24]], lens: [[620, 30], [210, 17]], soft: 0.006, focus: false, staged: false },  // a light, clear liquid
  metal: { drop: [[210, 10], [170, 13]], lens: [[460, 17], [150, 9]], soft: 0.012, focus: false, staged: false },    // dense mercury: slower, wobblier
  island: { drop: [[520, 34], [480, 33]], lens: [[760, 44], [620, 41]], soft: 0, focus: true, staged: true },       // a solid object: quick, in two strokes
}[LOOK];

// rendering helpers: write a style only when it changed; promote a layer only while it moves
const cache = new WeakMap(), promoted = new WeakMap();
function put(el, prop, v) {
  let c = cache.get(el);
  if (!c) cache.set(el, (c = {}));
  if (c[prop] !== v) { c[prop] = v; el.style[prop] = v; }
}
function promote(el, on) { if (promoted.get(el) !== on) { promoted.set(el, on); el.style.willChange = on ? 'transform, opacity' : ''; } }
const px = (v) => `${v.toFixed(2)}px`;

// The demo window: W is its real CSS width, so the page inside meets real container queries. On the frame it is
// drawn between FW_MIN and FW_MAX px wide, so a narrow window is drawn phone-shaped (tall), a wide one desktop-shaped.
const [W_MIN, W_MAX] = FORMAT.W, [FW_MIN, FW_MAX] = FORMAT.FW, CLIP_H = FORMAT.clip;
const win = new Spring(clamp(+params.get('w') || FORMAT.start, W_MIN, W_MAX), critical(420));
let W = 0;                                                        // the window's CSS width, as laid out
function sizeWindow() {
  if (FULL) return;
  const w = Math.round(win.value);
  if (w === W) return;
  W = w;
  const fw = FW_MIN + (FW_MAX - FW_MIN) * (W - W_MIN) / (W_MAX - W_MIN), k = fw / W;
  device.style.width = px(fw);
  device.style.left = px((FORMAT.fw - fw) / 2);
  vp.style.width = `${W}px`;
  vp.style.height = px(CLIP_H / k);
  vp.style.transform = `scale(${k.toFixed(5)})`;
}
sizeWindow();

// a pointer event → coordinates inside the demo page (the page is scaled twice: the window, then the frame)
function toPage(e) {
  const r = vp.getBoundingClientRect(), k = r.width / vp.offsetWidth;
  return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
}
// an element's layout box inside the nav, in CSS px (offsets ignore transforms, so motion never feeds back into it)
function boxOf(el) {
  let x = 0, y = 0;
  for (let n = el; n && n !== mn; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

// A drop: a box whose four edges are springs. When it reshapes, the edge that travels furthest leads with a jelly
// bounce and the others follow, so it pours rather than scales.
class Drop {
  constructor() { [this.l, this.r, this.t, this.b] = [0, 0, 0, 0].map(() => new Spring(0)); }
  to({ x, y, w, h }, lead = spring(...FEEL.drop[0]), trail = spring(...FEEL.drop[1])) {
    const pair = (a, b, va, vb) => {
      const da = Math.abs(va - a.target), db = Math.abs(vb - b.target);
      a.set(da >= db ? lead : trail); b.set(db >= da ? lead : trail);
      a.target = va; b.target = vb;
    };
    pair(this.l, this.r, x, x + w);
    pair(this.t, this.b, y, y + h);
  }
  place(box) { this.to(box); this.springs().forEach(snap); }
  springs() { return [this.l, this.r, this.t, this.b]; }
  get box() { return { x: this.l.value, y: this.t.value, w: this.r.value - this.l.value, h: this.b.value - this.t.value }; }
}
// A lens: a small drop that follows the pointer. The edge in front leads and the one behind lags, so it stretches
// while it travels — and keeps its volume: the longer it gets, the thinner. Hidden, it fades and reappears in place.
class Lens extends Drop {
  constructor(el) { super(); this.el = el; this.o = new Spring(0, spring(320, 28)); this.rest = { w: 1, h: 1 }; }
  to({ x, y, w, h }) {
    const lead = spring(...FEEL.lens[0]), trail = spring(...FEEL.lens[1]);
    if (this.o.value < 0.02) this.place({ x, y, w, h });
    const dx = x - this.l.target, dy = y - this.t.target;
    if (Math.abs(dx) > 0.5) { (dx > 0 ? this.r : this.l).set(lead); (dx > 0 ? this.l : this.r).set(trail); }
    if (Math.abs(dy) > 0.5) { (dy > 0 ? this.b : this.t).set(lead); (dy > 0 ? this.t : this.b).set(trail); }
    this.l.target = x; this.r.target = x + w; this.t.target = y; this.b.target = y + h;
    this.rest = { w, h };
    this.o.target = 1;
  }
  place(box) { [[this.l, box.x], [this.r, box.x + box.w], [this.t, box.y], [this.b, box.y + box.h]].forEach(([s, v]) => { s.value = s.target = v; s.velocity = 0; }); }
  hide() { this.o.target = 0; }
  springs() { return [...super.springs(), this.o]; }
  render() {
    const { x, y, w, h } = this.box;
    const sw = w / Math.sqrt(Math.max(1, h / this.rest.h)), sh = h / Math.sqrt(Math.max(1, w / this.rest.w));   // keep the volume
    promote(this.el, !this.springs().every((s) => s.resting(0.01)));
    put(this.el, 'opacity', clamp(this.o.value, 0, 1).toFixed(3));
    put(this.el, 'transform', `translate(${px(x + (w - sw) / 2)}, ${px(y + (h - sh) / 2)})`);
    put(this.el, 'width', px(Math.max(0, sw))); put(this.el, 'height', px(Math.max(0, sh)));
  }
}

// ================================================================================================================
// STAGE 2 · the layout: the mode comes from CSS
// ================================================================================================================
// The stylesheet decides the layout with container queries and writes it into --mode (full | bar | compact). The
// script never repeats a breakpoint: it reads the mode after every resize and adapts its behaviour to it.
const MODE_NAME = { full: 'Desktop', bar: 'Tablet', compact: 'Mobile' };
const ORDER = ['compact', 'bar', 'full'];
let mode = '';

const secs = $$('.it').map((li, i) => {
  const tg = $('.tg', li), el = $('.sec', li), inner = $('.sec-in', el);
  el.inert = true;
  return { i, li, tg, el, inner, name: tg.textContent.trim(), w: 0, h: 0, x: 0, y: 0, side: 0, rise: 0,
    blocks: [...inner.children].map((b) => ({ el: b, e: new Spring(0, spring(320, 24)) })),
    acc: new Spring(0, spring(300, 25)), pop: new Spring(1, spring(360, 22)) };
});

// the sizes everything else is laid out from: the capsule, each section's natural box, the page's height
let cap = { x: 0, y: 0, w: 0, h: 0 }, pageH = 0;
function measure() {
  if (mode === 'bar') mn.style.setProperty('--sheet-w', `${W - 24}px`);
  cap = boxOf(bar);
  pageH = vp.offsetHeight;
  for (const s of secs) { s.w = s.inner.offsetWidth; s.h = s.inner.offsetHeight; }
}

function onResize() {
  if (FULL) W = vp.offsetWidth;
  const next = getComputedStyle(mn).getPropertyValue('--mode').trim() || 'full';
  if (next !== mode) changeMode(mode, next);
  measure();
  retarget();
  aimMenuLens();
  remember();
  readout();
  wake();
}

// the read-out above the window and the handle's value
const bpSegs = $$('.bp-seg'), bpW = $('.bp-w span');
function readout() {
  bpSegs.forEach((s) => s.classList.toggle('is-on', s.dataset.m === mode));
  bpW.textContent = W;
  handle.setAttribute('aria-valuenow', W);
  handle.setAttribute('aria-valuetext', `${W} pixels, ${MODE_NAME[mode].toLowerCase()} layout`);
}

// ================================================================================================================
// STAGE 3 · the springs; hover intent, keyboard, focus
// ================================================================================================================
const glass = new Drop();                                         // the capsule, the panel and the sheet: one drop
const RADIUS = parseFloat(getComputedStyle(html).getPropertyValue('--pane-r')) || 28;
const menuLens = new Lens($('.hl')), linkLens = new Lens($('.lens'));   // one rides the menu, one rides the links
const opened = new Spring(0, spring(260, 26));                    // 0 capsule … 1 open: the hairline, the scrim
const spotX = new Spring(0, spring(170, 20)), spotY = new Spring(0, spring(170, 20));   // the light on the glass trails the pointer
const lean = new Spring(0, spring(40, 11));                       // the light behind leans towards the open section

let active = -1, openedAt = -1;
let clock = 0;
const queue = [];
const later = (s, fn) => queue.push({ at: clock + s, fn });

// one polite sentence per change
let sayTimer = 0;
function say(text) { clearTimeout(sayTimer); sayTimer = setTimeout(() => { live.textContent = text; }, 60); }

// ---- hover intent: a short delay before the first open; a safe triangle while the pointer travels to the panel ----
const INTENT_OPEN = 0.09, INTENT_SWITCH = 0.14, INTENT_CLOSE = 0.28;     // seconds
let hoverTimer = 0, closeTimer = 0, over = -1, anchor = null;
const hovering = (e) => e.pointerType === 'mouse' || e.pointerType === 'pen';
const inTriangle = (p, a, b, c) => {
  const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
secs.forEach((s) => {
  s.tg.addEventListener('pointerenter', (e) => {
    if (!hovering(e) || mode === 'compact') return;
    over = s.i;
    aimMenuLens();
    clearTimeout(hoverTimer); clearTimeout(closeTimer);
    if (active < 0) { hoverTimer = setTimeout(() => over === s.i && show(s.i), INTENT_OPEN * 1000); return; }
    if (s.i === active) return;
    // heading for the open panel across this trigger? wait a moment before switching
    const p = toPage(e), top = cap.y + cap.h, { x, w } = glass.box;
    const aiming = anchor && inTriangle(p, anchor, { x, y: top }, { x: x + w, y: top });
    if (aiming) hoverTimer = setTimeout(() => over === s.i && show(s.i), INTENT_SWITCH * 1000);
    else show(s.i);
  });
  s.tg.addEventListener('pointerleave', (e) => { if (s.i === active) anchor = toPage(e); });
  s.tg.addEventListener('click', () => {
    if (mode === 'compact') return toggleAccordion(s.i);
    if (active === s.i && clock - openedAt > 0.35) hide();          // a click right after a hover-open keeps it open
    else show(s.i);
  });
  s.tg.addEventListener('keydown', (e) => onTriggerKey(e, s));
  s.el.addEventListener('keydown', (e) => onPanelKey(e, s));
});
bar.addEventListener('pointerleave', () => { over = -1; aimMenuLens(); });
mn.addEventListener('pointerenter', () => clearTimeout(closeTimer));
let pointerIn = false;                                            // with no pointer on the nav, the light drifts by itself
mn.addEventListener('pointermove', (e) => { const p = toPage(e); spotX.target = p.x; spotY.target = p.y; pointerIn = true; });
mn.addEventListener('pointerleave', () => { pointerIn = false; });
mn.addEventListener('pointerleave', (e) => {
  if (!hovering(e) || mode === 'compact' || active < 0) return;
  clearTimeout(hoverTimer);
  closeTimer = setTimeout(() => hide(), INTENT_CLOSE * 1000);
});
addEventListener('pointerdown', (e) => { if (active >= 0 && !mn.contains(e.target)) hide(); });   // a tap outside closes

// ---- the lenses' targets: the menu lens sits on the trigger under the pointer, else on the open one; the link lens
// sits on the link under the pointer (or focus) and stays on it across the gaps until the pointer leaves the section ----
let lit = null;
function aimMenuLens() {
  const i = over >= 0 ? over : active;
  secs.forEach((s) => s.tg.classList.toggle('is-lit', s.i === i));
  if (i < 0 || mode === 'compact') return menuLens.hide();
  const t = boxOf(secs[i].tg);
  menuLens.to({ x: t.x, y: t.y + 2, w: t.w, h: t.h - 4 });
}
function light(el) {
  if (lit === el) return;
  lit?.classList.remove('is-lit');
  lit = el;
  lit?.classList.add('is-lit');
}
secs.forEach((s) => {
  $$('.lk, .tag, .all', s.inner).forEach((a) => {
    a.addEventListener('pointerenter', (e) => { if (hovering(e)) light(a); });
    a.addEventListener('focus', () => light(a));
  });
  s.inner.addEventListener('pointerleave', () => light(null));
  s.inner.addEventListener('focusout', (e) => { if (!s.inner.contains(e.relatedTarget)) light(null); });
});

// ---- keyboard: the arrows walk the triggers and the links; Escape always returns to the trigger ----
function onTriggerKey(e, s) {
  if (mode === 'compact') return;
  const n = secs.length, go = (i) => { secs[i].tg.focus(); if (active >= 0) show(i); };
  if (e.key === 'ArrowRight') go((s.i + 1) % n);
  else if (e.key === 'ArrowLeft') go((s.i - 1 + n) % n);
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(n - 1);
  else if (e.key === 'ArrowDown') { show(s.i); links(s)[0].focus(); }
  else if (e.key === 'Escape' && active >= 0) hide();
  else return;
  e.preventDefault();
}
const links = (s) => $$('a', s.inner).filter((a) => a.offsetParent);   // the visible links of a section
function onPanelKey(e, s) {
  if (mode === 'compact') return;
  const list = links(s), i = list.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') list[(i + 1) % list.length].focus();
  else if (e.key === 'ArrowUp') (i <= 0 ? s.tg : list[i - 1]).focus();
  else if (e.key === 'Escape') { hide(); s.tg.focus(); }
  else return;
  e.preventDefault();
}
// focus that leaves the nav closes the panel (not trapped on desktop, but managed)
mn.addEventListener('focusout', (e) => { if (mode !== 'compact' && active >= 0 && !mn.contains(e.relatedTarget)) hide(); });

// ================================================================================================================
// STAGE 4 · the morph: the drop, the sliding content, the light on the glass
// ================================================================================================================
const SLIDE = 42, RISE = 14, STAGGER = 0.045;                    // px, px, seconds between blocks

function show(i) {
  if (i === active || mode === 'compact') return;
  const fresh = active < 0, dir = fresh ? 0 : Math.sign(i - active);
  if (!fresh) leave(secs[active], dir);
  active = i;
  enter(secs[i], dir, fresh);
  secs.forEach((s) => s.tg.setAttribute('aria-expanded', String(s.i === i)));
  if (fresh) { openedAt = clock; later(0.05, impact); } else sweep(dir);
  light(null);
  retarget();
  aimMenuLens();
  syncWord(dir || 1);
  wake();
}
function hide() {
  if (active < 0) return;
  const s = secs[active];
  leave(s, 0);
  active = -1;
  s.tg.setAttribute('aria-expanded', 'false');
  light(null);
  retarget();
  aimMenuLens();
  syncWord(-1);
  wake();
}
// a section's blocks slide in from the side you moved towards (or rise, on a fresh open), one after another
function enter(s, dir, fresh) {
  s.el.classList.add('is-on'); s.el.classList.remove('is-out');
  s.el.inert = false;
  s.side = dir; s.rise = fresh ? 1 : 0;
  s.blocks.forEach((b, k) => {
    b.e.set(spring(320, 24));
    if (fresh) { b.e.value = 0; b.e.velocity = 0; }
    b.e.target = 0;
    if (calm) { b.e.value = b.e.target = 1; return; }
    later((fresh ? 0.1 : 0.02) + k * STAGGER, () => { b.e.target = 1; });
  });
}
// …and the old ones leave the other way, all together and fast
function leave(s, dir) {
  s.el.classList.remove('is-on'); s.el.classList.add('is-out');
  s.el.inert = true;
  s.side = -dir; s.rise = dir ? 0 : -0.5;
  s.blocks.forEach((b) => { b.e.set(critical(700)); b.e.target = 0; if (calm) b.e.value = 0; });
}

// where the drop is heading: the capsule; the capsule poured down into the open section; or, on a phone, the sheet
function retarget() {
  let box = cap;
  if (mode === 'compact' && sheetOpen) box = { x: 8, y: 8, w: W - 16, h: pageH - 16 };
  else if (mode !== 'compact' && active >= 0) {
    const s = secs[active], w = mode === 'full' ? Math.max(cap.w, s.w) : W - 24;
    box = { x: clamp(cap.x + cap.w / 2 - w / 2, 12, W - 12 - w), y: cap.y, w, h: cap.h + s.h };
    const t = boxOf(s.tg);
    lean.target = (t.x + t.w / 2) / W - 0.5;
  }
  const was = { y: glass.t.target, h: glass.b.target - glass.t.target };
  opened.target = box === cap ? 0 : 1;
  if (FEEL.staged && !calm && Math.abs(box.h - was.h) > 30) {           // island: one stroke at a time, like a solid thing
    const growing = box.h > was.h, first = growing ? { ...box, y: was.y, h: was.h } : { x: glass.l.target, w: glass.r.target - glass.l.target, y: box.y, h: box.h };
    glass.to(first);
    const at = ++stroke;
    later(0.09, () => { if (at === stroke) glass.to(box); });
  } else { stroke++; glass.to(box); }
  if (calm) glass.springs().forEach(snap);
}
let stroke = 0;                                                    // the newest two-stroke move (an older one must not finish)

// ---- the sheen: a band of light that crosses the drop the way you moved ----
let sheenAge = 9, sheenDir = 1;
function sweep(dir) { if (!calm) { sheenAge = 0; sheenDir = dir; } }

function renderGlass() {
  const { x, y, w } = glass.box, h = Math.max(0, glass.box.h + pull.value);
  const speed = Math.abs(glass.l.velocity) + Math.abs(glass.r.velocity);
  const r = Math.min(RADIUS + Math.min(14, speed * FEEL.soft), w / 2, h / 2);   // the drop softens while it travels
  promote(glassEl, !glass.springs().every((s) => s.resting(0.05)));
  put(glassEl, 'transform', `translate(${px(x)}, ${px(y)})`);
  put(glassEl, 'width', px(Math.max(0, w))); put(glassEl, 'height', px(h)); put(glassEl, 'borderRadius', px(Math.max(0, r)));
  glassEl.style.setProperty('--mx', px(spotX.value - x)); glassEl.style.setProperty('--my', px(spotY.value - y));
  put(rule, 'opacity', (clamp(opened.value, 0, 1) * clamp((h - cap.h) / 40, 0, 1)).toFixed(3));
  const sw = clamp(sheenAge / 0.65, 0, 1), from = sheenDir > 0 ? -0.5 : 1.05, to = sheenDir > 0 ? 1.05 : -0.5;
  put(sheen, 'opacity', sheenAge < 0.65 ? Math.sin(Math.PI * sw).toFixed(3) : '0');
  put(sheen, 'transform', `translateX(${px(w * (from + (to - from) * (1 - (1 - sw) ** 2)))}) skewX(-14deg)`);
  if (mode === 'compact') return;
  // the sections: under their own trigger, inside the drop, clipped to it — they slide inside one piece of glass
  for (const s of secs) {
    if (s.el.classList.contains('is-out') && s.blocks.every((b) => b.e.value < 0.01)) s.el.classList.remove('is-out');
    if (!s.el.classList.contains('is-on') && !s.el.classList.contains('is-out')) continue;
    const t = boxOf(s.tg);
    s.x = clamp(t.x + t.w / 2 - s.w / 2, x, Math.max(x, x + w - s.w)); s.y = y + cap.h;
    const inset = [0, s.x + s.w - (x + w), s.y + s.h - (y + h), x - s.x].map((v) => px(Math.max(0, v)));
    put(s.el, 'transform', `translate(${px(s.x)}, ${px(s.y)})`);
    put(s.el, 'clipPath', `inset(${inset.join(' ')} round 0 0 ${px(r)} ${px(r)})`);
    renderBlocks(s);
  }
}
// the link lens follows its link while the section slides, and only shows in the open panel
function renderLenses() {
  const s = lit && secs.find((x) => x.el.contains(lit));
  if (s && s.i === active && mode !== 'compact') { const b = boxOf(lit); linkLens.to({ x: b.x + s.x, y: b.y + s.y, w: b.w, h: b.h }); }
  else linkLens.hide();
  menuLens.render(); linkLens.render();
}
function renderBlocks(s) {
  for (const b of s.blocks) {
    const e = clamp(b.e.value, 0, 1.2), moving = !b.e.resting(0.004);
    promote(b.el, moving);
    put(b.el, 'opacity', clamp(b.e.value, 0, 1).toFixed(3));
    put(b.el, 'transform', moving ? `translate3d(${px(s.side * (1 - e) * SLIDE)}, ${px(s.rise * (1 - e) * RISE)}, 0)` : '');
    if (FEEL.focus) put(b.el, 'filter', moving ? `blur(${(Math.max(0, 1 - e) * 8).toFixed(2)}px)` : '');   // island: it focuses in
  }
}

// ================================================================================================================
// STAGE 5 · mobile: the sheet, the burger, the accordion, the swipe
// ================================================================================================================
// On a phone the drop swells from the capsule into a full-height sheet; the menu lives inside it, under the bar.
const pull = new Spring(0, critical(400)), cross = new Spring(0, spring(380, 20));
let sheetOpen = false, acc = -1;
const outside = [site, brand, cta];                              // inert while the modal sheet is open

function openSheet() {
  if (sheetOpen) return;
  sheetOpen = true;
  burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Close menu');
  outside.forEach((el) => { el.inert = true; });
  mn.classList.add('is-sheet');
  cross.target = 1;
  retarget();
  secs.forEach((s, k) => { s.pop.value = calm ? 1 : 0; s.pop.target = 0; later(0.08 + k * 0.05, () => { s.pop.target = 1; }); });
  later(0.06, () => { if (sheetOpen) secs[0].tg.focus({ preventScroll: true }); });   // once the sheet is visible
  syncWord(1);
  wake();
}
function closeSheet({ instant = false } = {}) {
  if (!sheetOpen) return;
  sheetOpen = false;
  burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu');
  outside.forEach((el) => { el.inert = false; });
  mn.classList.remove('is-sheet');
  cross.target = 0; pull.target = 0;
  if (sheet.contains(document.activeElement) && !instant) burger.focus({ preventScroll: true });
  retarget();
  if (instant) [cross, pull, ...glass.springs()].forEach(snap);
  syncWord(-1);
  wake();
}
burger.addEventListener('click', () => (sheetOpen ? closeSheet() : openSheet()));

// the accordion: one section open at a time; its height springs to the content's
function toggleAccordion(i) {
  const next = acc === i ? -1 : i;
  if (acc >= 0) { secs[acc].acc.target = 0; secs[acc].el.inert = true; secs[acc].tg.setAttribute('aria-expanded', 'false'); }
  acc = next;
  if (acc >= 0) {
    const s = secs[acc];
    s.acc.target = s.h; s.el.inert = false; s.tg.setAttribute('aria-expanded', 'true');
    s.side = 0; s.rise = 1;
    s.blocks.forEach((b, k) => { b.e.value = calm ? 1 : 0; b.e.target = 0; later(0.05 + k * STAGGER, () => { b.e.target = 1; }); });
  }
  syncWord(1);
  wake();
}

// the trap: Tab cycles through the burger and the sheet; Escape closes and returns to the burger
addEventListener('keydown', (e) => {
  if (!sheetOpen) return;
  if (e.key === 'Escape') { closeSheet(); return; }
  if (e.key !== 'Tab') return;
  const stops = [burger, ...$$('button, a', sheet).filter((el) => el.offsetParent && !el.closest('[inert]'))];
  const i = stops.indexOf(document.activeElement), n = stops.length;
  e.preventDefault();
  stops[(i + (e.shiftKey ? -1 : 1) + n) % n].focus();
});

// swipe the sheet up to put it away (it came down out of the capsule, so it goes back up)
let drag = null;
sheet.addEventListener('pointerdown', (e) => { if (sheetOpen) drag = { y: toPage(e).y, t: performance.now(), v: 0, moved: false }; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dy = toPage(e).y - drag.y, now = performance.now();
  if (!drag.moved && Math.abs(dy) < 8) return;
  if (!drag.moved) { drag.moved = true; sheet.setPointerCapture(e.pointerId); }
  drag.v = (dy - pull.value) / Math.max(1, now - drag.t); drag.t = now;
  pull.value = pull.target = dy < 0 ? dy : dy * 0.25; pull.velocity = 0;   // a little give downwards
  wake();
});
addEventListener('pointerup', () => {
  if (!drag) return;
  const flick = drag.moved && (pull.value < -90 || drag.v < -0.6);
  if (drag.moved) sheet.addEventListener('click', (e) => e.stopPropagation(), { capture: true, once: true });
  drag = null;
  if (flick) closeSheet(); else pull.target = 0;
});

function renderSheet() {
  const compact = mode === 'compact';
  sheet.toggleAttribute('aria-modal', compact);
  compact ? sheet.setAttribute('role', 'dialog') : sheet.removeAttribute('role');
  compact ? sheet.setAttribute('aria-label', 'Menu') : sheet.removeAttribute('aria-label');
  const c = clamp(cross.value, -0.1, 1.1), bars = burger.children;    // the burger: bars → a cross
  put(bars[0], 'transform', `translateY(${px(-7 * (1 - c))}) rotate(${(45 * c).toFixed(2)}deg)`);
  put(bars[1], 'transform', `scaleX(${clamp(1 - c * 1.4, 0, 1).toFixed(3)})`);
  put(bars[2], 'transform', `translateY(${px(7 * (1 - c))}) rotate(${(-45 * c).toFixed(2)}deg)`);
  if (!compact) {
    ['left', 'top', 'width', 'height'].forEach((p) => put(sheet, p, ''));
    sheet.classList.remove('is-on');
    for (const s of secs) { put(s.el, 'height', ''); put(s.li, 'transform', ''); put(s.li, 'opacity', ''); }
    return;
  }
  // the sheet: the part of the drop under the capsule
  const { x, y, w } = glass.box, h = Math.max(0, glass.box.h + pull.value), top = cap.y + cap.h;
  put(sheet, 'left', px(x)); put(sheet, 'top', px(top)); put(sheet, 'width', px(Math.max(0, w)));
  put(sheet, 'height', px(Math.max(0, y + h - top)));
  sheet.classList.toggle('is-on', y + h - top > 2);
  for (const s of secs) {
    put(s.el, 'transform', ''); put(s.el, 'clipPath', '');
    const a = Math.max(0, s.acc.value);
    put(s.el, 'height', px(a));
    put(s.el, 'visibility', a > 0.5 ? 'visible' : 'hidden');
    const p = clamp(s.pop.value, 0, 1.1);
    put(s.li, 'opacity', clamp(p, 0, 1).toFixed(3));
    put(s.li, 'transform', p < 0.999 ? `translateY(${px((1 - p) * -16)})` : '');
    if (a > 0.5) renderBlocks(s);
  }
}

// ================================================================================================================
// STAGE 6 · the re-flow, the impact, the giant word, the loop
// ================================================================================================================
// ---- the re-flow: when the mode changes, the pieces that stay glide from their old boxes to the new ones (FLIP);
// pieces that are new pop in; the drop simply pours into the new capsule. Boxes are remembered after every resize,
// so the "before" is one frame old.
const flips = [brand, cta, burger, ...secs.map((s) => s.tg)].map((el) => ({
  el, x: new Spring(0, spring(260, 22)), y: new Spring(0, spring(260, 22)), k: new Spring(1, spring(260, 22)), pop: new Spring(1, spring(320, 20)), was: null,
}));
const shown = (el) => el.offsetParent !== null && !(mode === 'compact' && sheet.contains(el));
function remember() { for (const f of flips) f.was = shown(f.el) ? boxOf(f.el) : null; }

function changeMode(from, to) {
  mode = to;
  if (!from) return;
  if (to === 'compact' && active >= 0) hide();
  if (to !== 'compact') { closeSheet({ instant: true }); if (acc >= 0) toggleAccordion(acc); }
  let k = 0;
  for (const f of flips) {
    if (!shown(f.el) || calm) continue;
    const now = boxOf(f.el), was = f.was;
    if (was && Math.abs(was.w / now.w - was.h / now.h) < 0.25) {   // the same shape: start where it was drawn, spring home
      f.x.value += was.x - now.x; f.y.value += was.y - now.y; f.k.value *= was.h / now.h;
    } else {                                                      // new here (or a different shape): pop in
      f.pop.value = 0; f.pop.target = 0;
      later(0.03 + k++ * 0.04, () => { f.pop.target = 1; });
    }
  }
  modeWord = MODE_NAME[to];
  syncWord(ORDER.indexOf(to) > ORDER.indexOf(from) ? 1 : -1);
  say(`${MODE_NAME[to]} layout`);
}
function renderFlips() {
  for (const f of flips) {
    const moving = ![f.x, f.y, f.k, f.pop].every((s) => s.resting(0.002));
    promote(f.el, moving);
    if (!moving) { put(f.el, 'transform', ''); put(f.el, 'opacity', ''); continue; }
    const p = clamp(f.pop.value, 0, 1.2), b = f.was || { w: 0, h: 0 };
    put(f.el, 'transformOrigin', '0 0');
    put(f.el, 'transform', `translate(${px(f.x.value + (1 - p) * b.w / 2)}, ${px(f.y.value + (1 - p) * b.h / 2)}) scale(${(f.k.value * p).toFixed(4)})`);
    put(f.el, 'opacity', clamp(p, 0, 1).toFixed(3));
  }
}

// ---- the impact when the drop first pours: a bloom of light and a ripple through the glass, and a small bump ----
const fx = $('.fx'), fxRings = $$('.fx-ring'), fxBloom = $('.fx-bloom');
const bump = new Spring(0, spring(320, 12));
let impAge = 9, impX = 0, impY = 0;
function impact() {
  if (calm || mode === 'compact' || active < 0) return;
  const t = boxOf(secs[active].tg);
  impAge = 0; impX = t.x + t.w / 2; impY = cap.y + cap.h;
  bump.velocity += 4;
}
function renderFx(dt) {
  impAge += dt;
  const on = impAge < 1.1;
  put(fx, 'visibility', on ? 'visible' : 'hidden');
  if (!on) return;
  const b = clamp(impAge / 0.9, 0, 1), eb = 1 - (1 - b) ** 3;
  put(fxBloom, 'opacity', (Math.sin(Math.PI * Math.sqrt(b)) * 0.8).toFixed(3));
  put(fxBloom, 'transform', `translate(${px(impX)}, ${px(impY)}) scale(${(0.3 + 1.7 * eb).toFixed(3)}, ${(0.3 + 0.9 * eb).toFixed(3)})`);
  fxRings.forEach((el, i) => {
    const a = clamp((impAge - i * 0.12) / 0.75, 0, 1), e = 1 - (1 - a) ** 3;
    put(el, 'opacity', a > 0 ? ((1 - a) * 0.8).toFixed(3) : '0');
    put(el, 'transform', `translate(${px(impX)}, ${px(impY)}) scale(${(0.2 + e * (3.2 + i * 1.6)).toFixed(3)}, ${(0.2 + e * (1.2 + i * 0.5)).toFixed(3)})`);
  });
}

// ---- the giant word: the section the panel shows, or the layout you resized into; it rolls the way you moved ----
const words = [$('.wa'), $('.wb')], wq = new Spring(0, spring(520, 34));
let modeWord = '', wordShown = 'Explore', wordNext = 'Explore', wDir = 1;
const wFit = [1, 1];
function wordWanted() {
  if (mode === 'compact') return acc >= 0 ? secs[acc].name : sheetOpen ? 'Menu' : modeWord || 'Explore';
  return active >= 0 ? secs[active].name : modeWord || 'Explore';
}
function fitOf(el) {                                               // shrink a long word to the frame (measured)
  const keep = el.style.transform;
  el.style.transform = 'none';
  const r = document.createRange();
  r.selectNodeContents(el);
  const w = r.getBoundingClientRect().width / (frameEl.getBoundingClientRect().width / FORMAT.fw);
  el.style.transform = keep;
  return w > FORMAT.word ? FORMAT.word / w : 1;
}
function syncWord(dir) {
  const want = wordWanted();
  if (want === wordNext) return;
  if (wq.target === 1) finishWord();                               // a roll still running: land it first
  wordNext = want; wDir = dir >= 0 ? 1 : -1;
  words[1].textContent = want; wFit[1] = fitOf(words[1]);
  if (calm) { finishWord(); return; }
  wq.value = 0; wq.velocity = 0; wq.target = 1;
}
function finishWord() {
  wordShown = wordNext; words[0].textContent = wordShown; wFit[0] = fitOf(words[0]);
  words[1].textContent = ''; wq.value = 0; wq.velocity = 0; wq.target = 0;
}
function renderWord() {
  const q = clamp(wq.value, 0, 1.05), [a, b] = words;
  if (wq.target !== 1) { put(a, 'opacity', '1'); put(a, 'transform', `scale(${wFit[0].toFixed(4)})`); put(a, 'filter', ''); put(b, 'opacity', '0'); return; }
  const d = wDir * 70;                                             // the old word leaves the way you moved, blurring; the new one follows
  put(a, 'opacity', clamp(1 - q * 1.6, 0, 1).toFixed(3));
  put(a, 'transform', `translateX(${px(-d * q)}) scale(${(wFit[0] * (1 - 0.1 * q)).toFixed(4)})`);
  put(a, 'filter', `blur(${(q * 10).toFixed(2)}px)`);
  put(b, 'opacity', clamp(q * 1.6, 0, 1).toFixed(3));
  put(b, 'transform', `translateX(${px(d * (1 - q))}) scale(${(wFit[1] * (0.9 + 0.1 * q)).toFixed(4)})`);
  put(b, 'filter', `blur(${((1 - clamp(q, 0, 1)) * 10).toFixed(2)}px)`);
}

// ---- the demo window's handle: drag it (or use the arrow keys) to resize the window ----
let resizing = null;
handle.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  resizing = { x: e.clientX, w: win.target };
});
handle.addEventListener('pointermove', (e) => {
  if (!resizing) return;
  // the window is centred, so its right edge moves half as far as its width grows
  const k = frameEl.getBoundingClientRect().width / FORMAT.fw, dFw = 2 * (e.clientX - resizing.x) / k;
  win.target = clamp(resizing.w + dFw * (W_MAX - W_MIN) / (FW_MAX - FW_MIN), W_MIN, W_MAX);
  wake();
});
handle.addEventListener('pointerup', () => { resizing = null; });
handle.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 40, ArrowUp: 40, ArrowLeft: -40, ArrowDown: -40, PageUp: 160, PageDown: -160 }[e.key];
  if (step) win.target = clamp(win.target + step, W_MIN, W_MAX);
  else if (e.key === 'Home') win.target = W_MIN;
  else if (e.key === 'End') win.target = W_MAX;
  else return;
  e.preventDefault();
  wake();
});

// ---- the light: soft glows in the room, and the light behind the glass, drifting on the studio clock ----
const glows = $$('.amb .glow'), lights = $$('.lights i');
const LIGHTS = [[0.22, 300, 0.9], [0.62, 200, -0.6], [0.9, 520, 0.5]];   // x (of W), y, how hard it leans
function renderLight(t) {
  glows.forEach((g, i) => put(g, 'transform', `translate(${px(Math.sin(t * (0.13 + i * 0.05) + i * 2) * 26)}, ${px(Math.cos(t * (0.11 + i * 0.04) + i) * 18)})`));
  lights.forEach((el, i) => {
    const [fx_, y, k] = LIGHTS[i];
    const x = W * fx_ + lean.value * W * 0.5 * k + Math.sin(t * (0.21 + i * 0.07) + i * 2) * 50;
    put(el, 'transform', `translate(${px(x)}, ${px(y + Math.cos(t * (0.17 + i * 0.05) + i) * 34)})`);
  });
}

// the touch circle, for the video
const touch = $('.touch');
let down = false;
const showTouch = (e) => { touch.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; touch.classList.add('is-on'); };
addEventListener('pointerdown', (e) => { down = true; showTouch(e); });
addEventListener('pointermove', (e) => { if (down) showTouch(e); });
addEventListener('pointerup', () => { down = false; touch.classList.remove('is-on'); });

// ---- the loop: with ambient life it runs every frame; with reduced motion only while something moves ----
const springs = () => [win, ...glass.springs(), ...menuLens.springs(), ...linkLens.springs(), opened, spotX, spotY, lean, pull, cross, wq, bump,
  ...secs.flatMap((s) => [s.acc, s.pop, ...s.blocks.map((b) => b.e)]), ...flips.flatMap((f) => [f.x, f.y, f.k, f.pop])];
let running = false, last = 0;
function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
// frame times, for measuring: __perf.start() … __perf.stop() → { frames, p50, p95, max, over20 }
const perf = (window.__perf = {
  on: false, gaps: [],
  start() { this.on = true; this.gaps = []; this.prev = 0; },
  stop() {
    this.on = false;
    const s = [...this.gaps].sort((a, b) => a - b), q = (p) => +(s[Math.min(s.length - 1, Math.floor(p * s.length))] || 0).toFixed(2);
    return { frames: s.length, p50: q(0.5), p95: q(0.95), max: q(1), over20: s.filter((g) => g > 20).length };
  },
});
function frame(now) {
  if (perf.on) { if (perf.prev) perf.gaps.push(now - perf.prev); perf.prev = now; }
  const dt = Math.min(0.032, Math.max(0, (now - last) / 1000));
  last = now;
  clock += dt;
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].at <= clock) queue.splice(i, 1)[0].fn();
  if (wq.target === 1 && wq.resting(0.004)) finishWord();
  const all = springs();
  all.forEach((s) => s.step(dt));
  sheenAge += dt;
  sizeWindow();
  draw(dt);
  const still = all.every((s) => s.resting(0.002)) && !queue.length && impAge > 1.2 && sheenAge > 0.7;
  if (!calm || !still) requestAnimationFrame(frame); else running = false;
}
function draw(dt = 0) {
  if (!FULL) html.style.setProperty('--bump', (1 + 0.008 * bump.value).toFixed(4));
  put(vscrim, 'opacity', clamp(opened.value, 0, 1).toFixed(3));
  renderGlass(); renderLenses(); renderSheet(); renderFlips(); renderWord();
  const t = calm ? 0 : studio.now() / 1000;
  if (!pointerIn) { spotX.target = cap.x + cap.w * (0.5 + 0.45 * Math.sin(t * 0.55)); spotY.target = cap.y + cap.h * 0.3; }
  renderLight(t);
  if (!calm) renderFx(dt);
}

// first paint: lay out, place the drop on the capsule without motion, then run
new ResizeObserver(onResize).observe(vp);
words[0].textContent = wordShown;
document.fonts.ready.then(() => { wFit[0] = fitOf(words[0]); measure(); glass.place(cap); retarget(); aimMenuLens(); wake(); });
wake();

// the starting state: ?open=product opens a section at once (stills and links)
requestAnimationFrame(() => { if (params.get('open')) window.__nav.open(params.get('open')); });

// for scripts and the tutorial's console
window.__nav = {
  open: (id) => { const i = secs.findIndex((s) => s.li.dataset.sec === id); mode === 'compact' ? (openSheet(), toggleAccordion(i)) : show(i); },
  close: () => (mode === 'compact' ? closeSheet() : hide()),
  width: (w, instant = false) => { win.target = clamp(w, W_MIN, W_MAX); if (instant) snap(win); wake(); },
  state: () => ({ look: LOOK, mode, W, active: active >= 0 ? secs[active].li.dataset.sec : null, sheetOpen, acc: acc >= 0 ? secs[acc].li.dataset.sec : null,
    word: wordWanted(), expanded: secs.map((s) => s.tg.getAttribute('aria-expanded')), focus: document.activeElement && (document.activeElement.className || document.activeElement.tagName) }),
  box: (sel) => { const r = $(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
};
