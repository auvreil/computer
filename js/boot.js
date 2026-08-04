/*
 * boot brings the "machine" up: boot screen, then fs / window manager /
 * desktop / taskbar, in that order.
 */
(function(){
  const bootScreen = document.getElementById('bootScreen');
  const bootStatus = document.getElementById('bootStatus');
  const desktopWrap = document.getElementById('desktopWrap');
  const taskbar = document.getElementById('taskbar');

  const messages = [
    'Loading kernel modules&hellip;',
    'Mounting virtual file system&hellip;',
    'Starting window manager&hellip;',
    'Loading applications&hellip;',
    'Welcome',
  ];

  let i = 0;
  const stepDelay = 340;

  function nextMessage(){
    if (i < messages.length){
      bootStatus.innerHTML = messages[i];
      i++;
      setTimeout(nextMessage, stepDelay);
    } else {
      startOS();
    }
  }

  function startOS(){
    // 1. appearance
    const theme = ThemeStore.load();
    ThemeStore.apply(theme);

    // 2. file system
    const fs = new VFS();

    // 3. window manager (windows render into #windowsLayer, taskbar entries into #taskbarApps)
    const wm = new WindowManager(document.getElementById('windowsLayer'), document.getElementById('taskbarApps'));

    // 4. desktop icons + context menu
    const desktop = new Desktop(
      document.getElementById('desktopIcons'),
      desktopWrap,
      document.getElementById('desktopContextMenu'),
      wm, fs
    );

    // 5. taskbar (start menu + clock)
    const taskbarCtrl = new Taskbar({
      startButton: document.getElementById('startButton'),
      startMenu: document.getElementById('startMenu'),
      startMenuApps: document.getElementById('startMenuApps'),
      startSearch: document.getElementById('startSearch'),
      clockEl: document.getElementById('clock'),
      wm, fs,
    });

    // expose for debugging / the "About" app
    window.webos = { fs, wm, desktop, taskbarCtrl };

    // 6. reveal
    bootScreen.classList.add('boot-done');
    desktopWrap.style.display = '';
    taskbar.style.display = '';
    setTimeout(() => bootScreen.remove(), 500);
  }

  nextMessage();
})();
