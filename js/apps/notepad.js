registerApp({
  id: 'notepad',
  name: 'Notepad',
  icon: '&#128221;',
  showOnDesktop: true,
  launch(ctx, args){
    const { wm, fs } = ctx;
    let path = (args && args.path) || null;
    let dirty = false;

    const root = document.createElement('div');
    root.className = 'app-notepad';
    root.innerHTML =
      '<div class="notepad-toolbar">' +
        '<button class="np-new">New</button>' +
        '<button class="np-save">Save</button>' +
        '<button class="np-saveas">Save As&hellip;</button>' +
        '<span class="np-status"></span>' +
      '</div>' +
      '<textarea class="np-text" spellcheck="false"></textarea>';

    const textarea = root.querySelector('.np-text');
    const statusEl = root.querySelector('.np-status');

    const win = wm.open({ title: 'Notepad', icon: '&#128221;', width: 560, height: 420, content: root });

    function titleFor(){
      const name = path ? path.split('/').pop() : 'Untitled';
      return name + (dirty ? ' *' : '') + ' — Notepad';
    }
    function refreshTitle(){ win.setTitle(titleFor()); }

    function load(p){
      const content = fs.read(p);
      if (content === null){ statusEl.textContent = 'Could not open ' + p; return; }
      path = p;
      textarea.value = content;
      dirty = false;
      statusEl.textContent = 'Opened ' + p;
      refreshTitle();
    }

    function save(targetPath){
      const p = targetPath || path;
      if (!p) return saveAs();
      fs.write(p, textarea.value);
      path = p;
      dirty = false;
      statusEl.textContent = 'Saved ' + p;
      refreshTitle();
    }

    function saveAs(){
      const suggestion = path || '/Documents/Untitled.txt';
      const p = prompt('Save as (full path):', suggestion);
      if (p) save(p);
    }

    textarea.addEventListener('input', () => { dirty = true; refreshTitle(); });
    root.querySelector('.np-new').addEventListener('click', () => {
      if (dirty && !confirm('Discard unsaved changes?')) return;
      path = null; textarea.value = ''; dirty = false; statusEl.textContent = '';
      refreshTitle();
    });
    root.querySelector('.np-save').addEventListener('click', () => save());
    root.querySelector('.np-saveas').addEventListener('click', () => saveAs());

    if (path) load(path);
    else refreshTitle();
  }
});
