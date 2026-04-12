# UI Components — Générateurs CSS interactifs

## Color Picker complet (picker + hex + rgb + alpha)

```html
<div class="color-picker-group">
  <input type="color" class="color-swatch" id="cp-color" value="#1FCFC3">
  <div class="color-inputs">
    <div class="input-row">
      <label>hex</label>
      <input type="text" id="cp-hex" value="#1FCFC3" maxlength="7">
    </div>
    <div class="input-row">
      <label>r</label><input type="number" id="cp-r" min="0" max="255" value="31">
      <label>g</label><input type="number" id="cp-g" min="0" max="255" value="207">
      <label>b</label><input type="number" id="cp-b" min="0" max="255" value="195">
    </div>
    <div class="input-row">
      <label>a</label><input type="number" id="cp-a" min="0" max="1" step="0.01" value="1">
    </div>
  </div>
</div>
```

```javascript
// Synchronisation hex → rgb
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return { r, g, b }
}

// Synchronisation rgb → hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v =>
    Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
  ).join('')
}

document.getElementById('cp-color').addEventListener('input', e => {
  const hex = e.target.value
  const { r, g, b } = hexToRgb(hex)
  document.getElementById('cp-hex').value = hex
  document.getElementById('cp-r').value = r
  document.getElementById('cp-g').value = g
  document.getElementById('cp-b').value = b
  update()
})
```

---

## Slider avec valeur live

```html
<div class="slider-group">
  <label>
    Size
    <span class="slider-value">30</span>
  </label>
  <input type="range" class="slider" id="size" min="10" max="100" step="1" value="30">
</div>
```

```javascript
document.getElementById('size').addEventListener('input', e => {
  e.target.previousElementSibling.querySelector('.slider-value').textContent = e.target.value
  update()
})
```

```css
.slider-group { margin: 12px 0; }
.slider-group label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}
.slider-value { color: #3498db; font-weight: 700; }
input[type="range"] {
  width: 100%;
  accent-color: #3498db;
  cursor: pointer;
}
```

---

## Toggle switch

```html
<label class="toggle-label">
  <span>Reversed</span>
  <div class="toggle-switch">
    <input type="checkbox" id="reversed">
    <span class="toggle-track"></span>
  </div>
</label>
```

```css
.toggle-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  padding: 8px 0;
}
.toggle-switch { position: relative; }
.toggle-switch input { display: none; }
.toggle-track {
  display: block;
  width: 44px; height: 24px;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
}
.toggle-track::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 20px; height: 20px;
  background: white;
  border-radius: 50%;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-switch input:checked ~ .toggle-track { background: #3498db; }
.toggle-switch input:checked ~ .toggle-track::after { left: 22px; }
```

---

## Copy button avec feedback

```html
<div class="copy-area">
  <button class="copy-btn" id="copyBtn">Copy Code</button>
  <span class="copied-badge" id="copiedBadge">✓ copied</span>
</div>
```

```css
.copy-area { display: flex; align-items: center; gap: 12px; }
.copy-btn {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}
.copy-btn:hover { opacity: 0.85; }
.copied-badge {
  display: none;
  color: #27ae60;
  font-weight: 700;
  font-size: 14px;
}
```

```javascript
async function copyCode(codeElementId) {
  const text = document.getElementById(codeElementId).textContent
  await navigator.clipboard.writeText(text)
  document.getElementById('copyBtn').style.display = 'none'
  document.getElementById('copiedBadge').style.display = 'inline'
  setTimeout(() => {
    document.getElementById('copyBtn').style.display = 'inline-block'
    document.getElementById('copiedBadge').style.display = 'none'
  }, 2000)
}
```

---

## Liste dynamique (ajouter/supprimer items)

```html
<div class="dynamic-list" id="menuItems">
  <div class="list-item">
    <input type="text" placeholder="Caption" value="Home">
    <input type="text" placeholder="Link" value="#home">
    <label><input type="checkbox"> New tab</label>
    <button class="remove-btn" onclick="removeItem(this)">✕</button>
  </div>
</div>
<button class="add-btn" onclick="addItem()">+ Add Item</button>
```

```javascript
function addItem() {
  const container = document.getElementById('menuItems')
  const item = document.createElement('div')
  item.className = 'list-item'
  item.innerHTML = `
    <input type="text" placeholder="Caption" value="">
    <input type="text" placeholder="Link" value="#">
    <label><input type="checkbox"> New tab</label>
    <button class="remove-btn" onclick="removeItem(this)">✕</button>
  `
  item.querySelectorAll('input').forEach(i => i.addEventListener('input', update))
  container.appendChild(item)
  update()
}

function removeItem(btn) {
  btn.parentElement.remove()
  update()
}

function getItems() {
  return [...document.querySelectorAll('#menuItems .list-item')].map(item => ({
    caption: item.querySelector('input[placeholder="Caption"]').value,
    link: item.querySelector('input[placeholder="Link"]').value,
    newTab: item.querySelector('input[type="checkbox"]').checked,
  }))
}
```

---

## Layout générateur 2 colonnes (controls + preview + code)

```css
.generator-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.generator-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

@media (max-width: 768px) {
  .generator-layout { grid-template-columns: 1fr; }
}

.controls-panel {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 20px;
}

.controls-panel h3 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin: 0 0 16px;
}

.preview-area {
  border-radius: 12px;
  overflow: hidden;
  min-height: 300px;
  position: relative;
  background: #eee;
}

.code-section {
  margin-top: 24px;
}

.code-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.code-tab {
  padding: 6px 16px;
  border-radius: 6px 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #e0e0e0;
  color: #666;
  border: none;
}
.code-tab.active { background: #1e1e1e; color: white; }

.code-block {
  background: #1e1e1e;
  border-radius: 0 8px 8px 8px;
  padding: 20px;
  overflow-x: auto;
  margin: 0;
}
.code-block code {
  color: #d4d4d4;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
}
```
