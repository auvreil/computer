registerApp({
  id: 'settings',
  name: 'Settings',
  icon: '&#9881;',
  showOnDesktop: true,
  launch(ctx){
    const { wm, fs } = ctx;
    const WALLPAPERS = [
      { id: 'azure',   name: 'Azure' },
      { id: 'sunset',  name: 'Sunset' },
      { id: 'forest',  name: 'Forest' },
      { id: 'grape',   name: 'Grape' },
      { id: 'slate',   name: 'Slate' },
    ];

    const state = ThemeStore.load();

    const root = document.createElement('div');
    root.className = 'app-settings';
    root.innerHTML =
      '<h2>Appearance</h2>' +
      '<div class="settings-row">' +
        '<label>App theme</label>' +
        '<div class="settings-toggle">' +
          '<button class="theme-btn" data-mode="light">Light</button>' +
          '<button class="theme-btn" data-mode="dark">Dark</button>' +
        '</div>' +
      '</div>' +
      '<div class="settings-row">' +
        '<label>Background</label>' +
        '<div class="wallpaper-grid"></div>' +
      '</div>' +
      '<h2>Storage</h2>' +
      '<div class="settings-row"><label>Virtual disk usage</label><div class="settings-value" id="diskUsage"></div></div>' +
      '<button class="settings-danger">Reset file system to defaults</button>';

    wm.open({ title: 'Settings', icon: '&#9881;', width: 460, height: 460, content: root });

    const wallpaperGrid = root.querySelector('.wallpaper-grid');
    WALLPAPERS.forEach(w => {
      const sw = document.createElement('button');
      sw.className = 'wallpaper-swatch wallpaper-' + w.id;
      sw.title = w.name;
      sw.dataset.id = w.id;
      wallpaperGrid.appendChild(sw);
    });

    function refresh(){
      root.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
      root.querySelectorAll('.wallpaper-swatch').forEach(b => b.classList.toggle('active', b.dataset.id === state.wallpaper));
      const usedBytes = new Blob([localStorage.getItem('webos_fs_v1') || '']).size;
      root.querySelector('#diskUsage').textContent = usedBytes < 1024 ? (usedBytes + ' B') : ((usedBytes/1024).toFixed(1) + ' KB');
    }

    root.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        ThemeStore.save(state); ThemeStore.apply(state); refresh();
      });
    });
    wallpaperGrid.addEventListener('click', (e) => {
      const sw = e.target.closest('.wallpaper-swatch');
      if (!sw) return;
      state.wallpaper = sw.dataset.id;
      ThemeStore.save(state); ThemeStore.apply(state); refresh();
    });
    root.querySelector('.settings-danger').addEventListener('click', () => {
      if (confirm('This deletes every file you have created. Continue?')){
        fs.reset();
        alert('File system reset. Open File Explorer to see the defaults restored.');
        refresh();
      }
    });

    refresh();
  }
});
