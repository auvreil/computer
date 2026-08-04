registerApp({
  id: 'about',
  name: 'About This PC',
  icon: '&#8505;',
  showOnDesktop: false,
  launch(ctx){
    const { wm } = ctx;
    const root = document.createElement('div');
    root.className = 'app-about';
    root.innerHTML =
      '<div class="about-hero">&#128421;</div>' +
      '<h2>WebOS</h2>' +
      '<p>A small desktop operating system built entirely out of static files &mdash; ' +
      'HTML, CSS, and plain JavaScript.</p>' +
      '<table class="about-table">' +
        '<tr><td>Window manager</td><td>Custom (js/windowManager.js)</td></tr>' +
        '<tr><td>File system</td><td>Virtual, persisted to localStorage</td></tr>' +
        '<tr><td>Included apps</td><td>Explorer, Notepad, Terminal, Calculator, SC-16 Emulator, Settings</td></tr>' +
        '<tr><td>Hosting</td><td>Any static host I want.</td></tr>' +
      '</table>' +
      '<p class="about-dim">Everything you create here lives only in this browser. Clearing site data starts fresh, so be careful. I will eventually make a way to back-up data.</p>';
    wm.open({ title: 'About This PC', icon: '&#8505;', width: 420, height: 380, resizable: false, content: root });
  }
});
