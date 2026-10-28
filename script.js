const tablist = document.querySelector('[role="tablist"]');
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('.example-panel')];
function selectTab(tab, moveFocus = false) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (moveFocus) tab.focus();
}
if (tablist && tabs.length) {
  tablist.hidden = false;
  selectTab(tabs[0]);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs.at(-1);
      if (next) { event.preventDefault(); selectTab(next, true); }
    });
  });
}
const copyStatus = document.querySelector('.copy-status');
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const text = document.querySelector(`#${button.dataset.copy} .sample-code code`).textContent;
    button.setAttribute('aria-busy', 'true');
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'copied';
      copyStatus.textContent = '';
      setTimeout(() => { button.textContent = 'copy code'; }, 1400);
    } catch {
      copyStatus.textContent = 'copy did not work here. you can select the code instead.';
    } finally { button.removeAttribute('aria-busy'); }
  });
});
const figure = document.querySelector('.glyph-figure');
const canvas = figure?.querySelector('canvas');
const image = figure?.querySelector('img');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (figure && canvas && image) {
  const context = canvas.getContext('2d');
  const source = document.createElement('canvas');
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  const palette = Array.from({ length: 8 }, (_, i) => getComputedStyle(document.documentElement).getPropertyValue(`--glyph-${i}`).trim());
  const characters = 'definefoxashwriteHelloFlamefunctiongive';
  let cells = [];
  let dimensions;
  let animation;
  let mouse = null;
  function prepare() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || !image.naturalWidth) return;
    const columns = width < 400 ? 72 : 96;
    const cellWidth = width / columns;
    const cellHeight = cellWidth * 1.85;
    const rows = Math.floor(height / cellHeight);
    source.width = columns;
    source.height = rows;
    const scale = Math.min(columns / image.naturalWidth, rows / image.naturalHeight) * .95;
    const iw = image.naturalWidth * scale;
    const ih = image.naturalHeight * scale;
    sourceContext.clearRect(0, 0, columns, rows);
    sourceContext.drawImage(image, (columns - iw) / 2, (rows - ih) / 2, iw, ih);
    let data;
    try { data = sourceContext.getImageData(0, 0, columns, rows).data; }
    catch { return; }
    cells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const alpha = data[(y * columns + x) * 4 + 3] / 255;
        if (alpha > .16) {
          const light = Math.min(7, Math.floor(alpha * (3 + 4 * (x / columns))));
          cells.push({ x: x * cellWidth, y: y * cellHeight, light, character: characters[(x + y * columns) % characters.length] });
        }
      }
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    dimensions = { width, height, cellWidth, cellHeight };
    image.hidden = true;
    draw(1);
  }
  function draw(progress) {
    if (!dimensions) return;
    const { width, height, cellWidth, cellHeight } = dimensions;
    context.clearRect(0, 0, width, height);
    context.textBaseline = 'top';
    for (const cell of cells) {
      if (cell.y / height > progress) continue;
      const lit = mouse && Math.hypot(cell.x - mouse.x, cell.y - mouse.y) < 65;
      context.fillStyle = palette[lit ? 7 : cell.light];
      context.font = `${cellWidth * (cell.light < 2 ? .7 : .96)}px "Martian Mono", monospace`;
      context.fillText(cell.character, cell.x, cell.y);
    }
  }
  async function initialize() {
    await document.fonts.ready;
    prepare();
    if (reducedMotion.matches) return;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / 1100);
      draw(progress);
      if (progress < 1) animation = requestAnimationFrame(frame);
    }
    animation = requestAnimationFrame(frame);
  }
  if (image.complete && image.naturalWidth) initialize();
  else image.addEventListener('load', initialize, { once: true });
  figure.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches) return;
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    cancelAnimationFrame(animation);
    animation = requestAnimationFrame(() => draw(1));
  });
  figure.addEventListener('pointerleave', () => { mouse = null; draw(1); });
  new ResizeObserver(() => prepare()).observe(figure);
  reducedMotion.addEventListener('change', () => { cancelAnimationFrame(animation); mouse = null; draw(1); });
}
