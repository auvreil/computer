registerApp({
  id: 'explorer',
  name: 'File Explorer',
  icon: '&#128193;',
  showOnDesktop: true,
  launch(ctx, args){
    const { wm, fs } = ctx;
    let path = (args && args.path) || '/';

    const root = document.createElement('div');
    root.className = 'app-explorer';
    root.innerHTML =
      '<div class="explorer-toolbar">' +
        '<button class="expl-up" title="Up">&#8593;</button>' +
        '<input class="expl-path" type="text" />' +
        '<button class="expl-new-folder">New Folder</button>' +
        '<button class="expl-new-file">New File</button>' +
      '</div>' +
      '<div class="explorer-body"></div>';

    const pathInput = root.querySelector('.expl-path');
    const body = root.querySelector('.explorer-body');

    const win = wm.open({ title: 'File Explorer', icon: '&#128193;', width: 620, height: 420, content: root });

    function render(){
      pathInput.value = path;
      win.setTitle(path === '/' ? 'File Explorer' : (path.split('/').pop() + ' — File Explorer'));
      const items = fs.list(path);
      body.innerHTML = '';
      if (!items){
        body.innerHTML = '<div class="explorer-empty">Folder not found.</div>';
        return;
      }
      if (items.length === 0){
        body.innerHTML = '<div class="explorer-empty">This folder is empty.</div>';
        return;
      }
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'explorer-item';
        row.innerHTML =
          '<span class="explorer-item-icon">' + (item.type === 'dir' ? '&#128193;' : '&#128196;') + '</span>' +
          '<span class="explorer-item-name"></span>' +
          '<button class="explorer-item-del" title="Delete">&#10005;</button>';
        row.querySelector('.explorer-item-name').textContent = item.name;
        row.addEventListener('dblclick', () => {
          const next = (path === '/' ? '' : path) + '/' + item.name;
          if (item.type === 'dir'){ path = next; render(); }
          else {
            const notepad = getApp('notepad');
            if (notepad) notepad.launch(ctx, { path: next });
          }
        });
        row.querySelector('.explorer-item-del').addEventListener('click', (e) => {
          e.stopPropagation();
          const next = (path === '/' ? '' : path) + '/' + item.name;
          if (confirm('Delete "' + item.name + '"?')){
            fs.remove(next);
            render();
          }
        });
        body.appendChild(row);
      });
    }

    root.querySelector('.expl-up').addEventListener('click', () => {
      if (path === '/') return;
      const parts = path.split('/').filter(Boolean);
      parts.pop();
      path = '/' + parts.join('/');
      render();
    });
    pathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter'){
        const target = pathInput.value.trim() || '/';
        if (fs.isDir(target)){ path = target; render(); }
        else alert('No such folder: ' + target);
      }
    });
    root.querySelector('.expl-new-folder').addEventListener('click', () => {
      const name = prompt('New folder name:');
      if (name) { fs.mkdir((path === '/' ? '' : path) + '/' + name); render(); }
    });
    root.querySelector('.expl-new-file').addEventListener('click', () => {
      const name = prompt('New file name:');
      if (name) { fs.write((path === '/' ? '' : path) + '/' + name, ''); render(); }
    });

    render();
  }
});
