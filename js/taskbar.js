class Taskbar {
  constructor({ startButton, startMenu, startMenuApps, startSearch, clockEl, wm, fs }){
    this.startButton = startButton;
    this.startMenu = startMenu;
    this.startMenuApps = startMenuApps;
    this.startSearch = startSearch;
    this.clockEl = clockEl;
    this.ctx = { wm, fs };

    this._renderApps();
    this._wire();
    this._tickClock();
    setInterval(() => this._tickClock(), 1000 * 15);
  }

  _renderApps(filter){
    this.startMenuApps.innerHTML = '';
    const q = (filter || '').toLowerCase();
    window.AppRegistry
      .filter(a => a.name.toLowerCase().includes(q))
      .forEach(app => {
        const tile = document.createElement('button');
        tile.className = 'start-tile';
        tile.innerHTML = '<span class="start-tile-icon">' + app.icon + '</span><span class="start-tile-name"></span>';
        tile.querySelector('.start-tile-name').textContent = app.name;
        tile.addEventListener('click', () => {
          app.launch(this.ctx);
          this.close();
        });
        this.startMenuApps.appendChild(tile);
      });
  }

  _wire(){
    this.startButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.startMenu.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => this.close());
    this.startSearch.addEventListener('input', () => this._renderApps(this.startSearch.value));
    this.startSearch.addEventListener('click', (e) => e.stopPropagation());
  }

  toggle(){ this.startMenu.classList.toggle('open'); if (this.startMenu.classList.contains('open')) this.startSearch.focus(); }
  close(){ this.startMenu.classList.remove('open'); }

  _tickClock(){
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
    this.clockEl.innerHTML = '<div>' + time + '</div><div class="clock-date">' + date + '</div>';
  }
}
