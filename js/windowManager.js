class WindowManager {
  constructor(desktopEl, taskbarAppsEl){
    this.desktopEl = desktopEl;
    this.taskbarAppsEl = taskbarAppsEl;
    this.windows = new Map();
    this.zTop = 10;
    this.counter = 0;
  }

  open(opts){
    const {
      title, icon = '&#128421;', width = 560, height = 400,
      x, y, content, onClose, resizable = true, minWidth = 300, minHeight = 200,
    } = opts;

    this.counter++;
    const id = 'win-' + this.counter;
    const cascade = (this.counter % 8) * 26;

    const el = document.createElement('div');
    el.className = 'window';
    el.style.width = width + 'px';
    el.style.height = height + 'px';
    el.style.left = (x != null ? x : 70 + cascade) + 'px';
    el.style.top = (y != null ? y : 40 + cascade) + 'px';

    el.innerHTML =
      '<div class="win-titlebar">' +
        '<div class="win-title"><span class="win-icon">' + icon + '</span><span class="win-title-text"></span></div>' +
        '<div class="win-controls">' +
          '<button class="win-btn win-min" title="Minimize">&#8722;</button>' +
          '<button class="win-btn win-max" title="Maximize">&#9633;</button>' +
          '<button class="win-btn win-close" title="Close">&#10005;</button>' +
        '</div>' +
      '</div>' +
      '<div class="win-body"></div>' +
      (resizable ? '<div class="win-resize"></div>' : '');

    el.querySelector('.win-title-text').textContent = title;

    const body = el.querySelector('.win-body');
    if (typeof content === 'string') body.innerHTML = content;
    else if (content instanceof Node) body.appendChild(content);

    this.desktopEl.appendChild(el);

    const winObj = { id, el, title, icon, minimized: false, maximized: false, onClose, prevRect: null };
    this.windows.set(id, winObj);

    this._makeDraggable(el, winObj);
    if (resizable) this._makeResizable(el, minWidth, minHeight);

    el.addEventListener('mousedown', () => this.focus(id));
    el.querySelector('.win-close').addEventListener('click', () => this.close(id));
    el.querySelector('.win-min').addEventListener('click', () => this.minimize(id));
    el.querySelector('.win-max').addEventListener('click', () => this.toggleMaximize(id));
    el.querySelector('.win-titlebar').addEventListener('dblclick', (e) => {
      if (!e.target.closest('.win-btn')) this.toggleMaximize(id);
    });

    this._addTaskbarEntry(winObj);
    this.focus(id);

    return {
      id, body,
      close: () => this.close(id),
      setTitle: (t) => { winObj.title = t; el.querySelector('.win-title-text').textContent = t; this._syncTaskbarTitle(id); },
    };
  }

  focus(id){
    const w = this.windows.get(id);
    if (!w) return;
    w.el.style.zIndex = ++this.zTop;
    this.desktopEl.querySelectorAll('.window').forEach(node => node.classList.remove('focused'));
    w.el.classList.add('focused');
    this._refreshTaskbarState(id);
  }

  minimize(id){
    const w = this.windows.get(id);
    if (!w) return;
    w.el.classList.add('minimized');
    w.minimized = true;
    this._refreshTaskbarState(null);
  }

  restore(id){
    const w = this.windows.get(id);
    if (!w) return;
    w.el.classList.remove('minimized');
    w.minimized = false;
    this.focus(id);
  }

  toggleMinimizeOrFocus(id){
    const w = this.windows.get(id);
    if (!w) return;
    const isFocused = w.el.classList.contains('focused') && !w.minimized;
    if (w.minimized) this.restore(id);
    else if (isFocused) this.minimize(id);
    else this.focus(id);
  }

  toggleMaximize(id){
    const w = this.windows.get(id);
    if (!w) return;
    if (!w.maximized){
      w.prevRect = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
      w.el.classList.add('maximized');
      w.maximized = true;
    } else {
      w.el.classList.remove('maximized');
      Object.assign(w.el.style, w.prevRect);
      w.maximized = false;
    }
  }

  close(id){
    const w = this.windows.get(id);
    if (!w) return;
    w.el.remove();
    this.windows.delete(id);
    const btn = this.taskbarAppsEl.querySelector('[data-id="' + id + '"]');
    if (btn) btn.remove();
    if (w.onClose) w.onClose();
  }

  _makeDraggable(el, winObj){
    const bar = el.querySelector('.win-titlebar');
    let sx, sy, ox, oy, dragging = false;
    bar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win-btn') || winObj.maximized) return;
      dragging = true; sx = e.clientX; sy = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      document.body.classList.add('no-select');
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      el.style.left = Math.max(0, ox + (e.clientX - sx)) + 'px';
      el.style.top = Math.max(0, oy + (e.clientY - sy)) + 'px';
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      document.body.classList.remove('no-select');
    });
  }

  _makeResizable(el, minWidth, minHeight){
    const handle = el.querySelector('.win-resize');
    if (!handle) return;
    let sx, sy, sw, sh, resizing = false;
    handle.addEventListener('mousedown', (e) => {
      resizing = true; sx = e.clientX; sy = e.clientY;
      sw = el.offsetWidth; sh = el.offsetHeight;
      e.stopPropagation();
      document.body.classList.add('no-select');
    });
    window.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      el.style.width = Math.max(minWidth, sw + (e.clientX - sx)) + 'px';
      el.style.height = Math.max(minHeight, sh + (e.clientY - sy)) + 'px';
    });
    window.addEventListener('mouseup', () => {
      resizing = false;
      document.body.classList.remove('no-select');
    });
  }

  _addTaskbarEntry(w){
    const btn = document.createElement('button');
    btn.className = 'taskbar-app active';
    btn.dataset.id = w.id;
    btn.title = w.title;
    btn.innerHTML = '<span class="taskbar-app-icon">' + w.icon + '</span>';
    btn.addEventListener('click', () => this.toggleMinimizeOrFocus(w.id));
    this.taskbarAppsEl.appendChild(btn);
  }

  _syncTaskbarTitle(id){
    const w = this.windows.get(id);
    const btn = this.taskbarAppsEl.querySelector('[data-id="' + id + '"]');
    if (w && btn) btn.title = w.title;
  }

  _refreshTaskbarState(activeId){
    this.windows.forEach((w) => {
      const btn = this.taskbarAppsEl.querySelector('[data-id="' + w.id + '"]');
      if (!btn) return;
      btn.classList.toggle('active', !w.minimized);
      btn.classList.toggle('current', w.id === activeId && !w.minimized);
    });
  }
}
