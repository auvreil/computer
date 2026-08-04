class Desktop {
  constructor(iconsEl, wrapEl, contextMenuEl, wm, fs){
    this.iconsEl = iconsEl;
    this.wrapEl = wrapEl;
    this.menuEl = contextMenuEl;
    this.wm = wm;
    this.fs = fs;
    this.ctx = { wm, fs };
    this.render();
    this._initContextMenu();
  }

  render(){
    this.iconsEl.innerHTML = '';

    // 1. pinned apps
    window.AppRegistry.filter(a => a.showOnDesktop).forEach(app => {
      this._addIcon(app.icon, app.name, () => app.launch(this.ctx));
    });

    // 2. live contents of the virtual /Desktop folder
    const items = this.fs.list('/Desktop') || [];
    items.forEach(item => {
      const path = '/Desktop/' + item.name;
      const glyph = item.type === 'dir' ? '&#128193;' : '&#128196;';
      this._addIcon(glyph, item.name, () => {
        if (item.type === 'dir') getApp('explorer').launch(this.ctx, { path });
        else getApp('notepad').launch(this.ctx, { path });
      });
    });
  }

  _addIcon(glyphHtml, label, onOpen){
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.tabIndex = 0;
    icon.innerHTML =
      '<div class="desktop-icon-glyph">' + glyphHtml + '</div>' +
      '<div class="desktop-icon-label"></div>';
    icon.querySelector('.desktop-icon-label').textContent = label;

    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.iconsEl.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
    });
    icon.addEventListener('dblclick', onOpen);
    icon.addEventListener('keydown', (e) => { if (e.key === 'Enter') onOpen(); });

    this.iconsEl.appendChild(icon);
  }

  _initContextMenu(){
    this.wrapEl.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.window')) return;
      e.preventDefault();
      const menu = this.menuEl;
      menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - 180) + 'px';
      menu.classList.add('show');
    });
    document.addEventListener('click', () => this.menuEl.classList.remove('show'));

    this.menuEl.querySelector('[data-action="refresh"]').addEventListener('click', () => this.render());
    this.menuEl.querySelector('[data-action="newfolder"]').addEventListener('click', () => {
      const name = prompt('New folder name:');
      if (name){ this.fs.mkdir('/Desktop/' + name); this.render(); }
    });
    this.menuEl.querySelector('[data-action="personalize"]').addEventListener('click', () => {
      getApp('settings').launch(this.ctx);
    });

    // deselect icons when clicking empty desktop space
    this.wrapEl.addEventListener('click', (e) => {
      if (e.target === this.wrapEl || e.target === this.iconsEl){
        this.iconsEl.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      }
    });
  }
}
