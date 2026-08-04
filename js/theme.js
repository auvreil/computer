const ThemeStore = {
  key: 'webos_theme_v1',
  defaults: { mode: 'light', wallpaper: 'azure' },

  load(){
    try{
      const raw = localStorage.getItem(this.key);
      return raw ? Object.assign({}, this.defaults, JSON.parse(raw)) : Object.assign({}, this.defaults);
    } catch(e){ return Object.assign({}, this.defaults); }
  },
  save(state){
    try{ localStorage.setItem(this.key, JSON.stringify(state)); } catch(e){}
  },
  apply(state){
    document.body.classList.toggle('theme-dark', state.mode === 'dark');
    document.body.setAttribute('data-wallpaper', state.wallpaper);
  },
};
