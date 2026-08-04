class VFS {
  constructor(storageKey){
    this.key = storageKey || 'webos_fs_v1';
    this.root = this._load() || this._seed();
    this._save();
  }

  _now(){ return new Date().toISOString(); }

  _seed(){
    const now = this._now();
    const dir = (children) => ({ type: 'dir', children, modified: now });
    const file = (content) => ({ type: 'file', content, modified: now });

    return dir({
      'Desktop': dir({
        'Read Me.txt': file(
          'Welcome to WebOS.\n\n' +
          'This whole computer - the desktop, the windows, the file system, ' +
          'the apps - is a static website. Nothing is sent to a server; ' +
          'everything you create is saved to your browser\'s local storage.\n\n' +
          'Try:\n' +
          ' - Double-click an icon to open it\n' +
          ' - Right-click the desktop for options\n' +
          ' - Open Terminal and type "help"\n' +
          ' - Open SC-16 Emulator to program a tiny 16-bit CPU\n'
        ),
      }),
      'Documents': dir({
        'Notes.txt': file('Type here. Files you save persist after a refresh.'),
      }),
      'Programs': dir({
        'hello.asm': file(
          '; A program for the SC-16 Emulator app.\n' +
          '        MOVI R0, MSG\n' +
          'LOOP:   LOADR R1, R0\n' +
          '        JZR R1, DONE\n' +
          '        OUT R1\n' +
          '        ADDI R0, 1\n' +
          '        JMP LOOP\n' +
          'DONE:   HALT\n' +
          'MSG:    STR "Hello from inside WebOS!"\n'
        ),
      }),
      'Pictures': dir({}),
    });
  }

  _load(){
    try{
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch(e){ return null; }
  }

  _save(){
    try{ localStorage.setItem(this.key, JSON.stringify(this.root)); }
    catch(e){ console.warn('WebOS: could not persist file system', e); }
  }

  _normalize(path){
    const parts = String(path).split('/').filter(p => p.length && p !== '.');
    const out = [];
    for (const p of parts){
      if (p === '..') out.pop();
      else out.push(p);
    }
    return out;
  }

  _walk(path, createDirs){
    const parts = this._normalize(path);
    let node = this.root;
    for (const p of parts){
      if (!node || node.type !== 'dir') return null;
      if (!node.children[p]){
        if (createDirs) node.children[p] = { type:'dir', children:{}, modified:this._now() };
        else return null;
      }
      node = node.children[p];
    }
    return node;
  }

  exists(path){ return path === '/' ? true : !!this._walk(path); }

  isDir(path){
    const n = path === '/' ? this.root : this._walk(path);
    return !!n && n.type === 'dir';
  }

  list(path){
    const n = path === '/' ? this.root : this._walk(path);
    if (!n || n.type !== 'dir') return null;
    return Object.keys(n.children)
      .sort((a,b)=> a.localeCompare(b))
      .map(name => ({ name, ...n.children[name] }))
      .sort((a,b)=> (a.type===b.type ? 0 : (a.type==='dir' ? -1 : 1)));
  }

  read(path){
    const n = this._walk(path);
    return (n && n.type === 'file') ? n.content : null;
  }

  write(path, content){
    const parts = this._normalize(path);
    const name = parts.pop();
    if (!name) return false;
    const parent = parts.length ? this._walk('/' + parts.join('/'), true) : this.root;
    if (!parent || parent.type !== 'dir') return false;
    parent.children[name] = { type:'file', content, modified: this._now() };
    this._save();
    return true;
  }

  mkdir(path){
    const parts = this._normalize(path);
    const name = parts.pop();
    if (!name) return false;
    const parent = parts.length ? this._walk('/' + parts.join('/'), true) : this.root;
    if (!parent || parent.type !== 'dir') return false;
    if (!parent.children[name]) parent.children[name] = { type:'dir', children:{}, modified:this._now() };
    this._save();
    return true;
  }

  remove(path){
    const parts = this._normalize(path);
    const name = parts.pop();
    if (!name) return false;
    const parent = parts.length ? this._walk('/' + parts.join('/')) : this.root;
    if (!parent || !parent.children[name]) return false;
    delete parent.children[name];
    this._save();
    return true;
  }

  reset(){ this.root = this._seed(); this._save(); }
}
