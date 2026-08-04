registerApp({
  id: 'terminal',
  name: 'Terminal',
  icon: '&#128187;',
  showOnDesktop: true,
  launch(ctx){
    const { wm, fs } = ctx;
    let cwd = '/';
    const history = [];
    let histIndex = -1;

    const root = document.createElement('div');
    root.className = 'app-terminal';
    root.innerHTML =
      '<div class="term-output"></div>' +
      '<div class="term-inputline">' +
        '<span class="term-prompt"></span>' +
        '<input class="term-input" type="text" spellcheck="false" autocomplete="off" />' +
      '</div>';

    const output = root.querySelector('.term-output');
    const input = root.querySelector('.term-input');
    const promptEl = root.querySelector('.term-prompt');

    const win = wm.open({ title: 'Terminal', icon: '&#128187;', width: 620, height: 400, content: root });

    function print(text, cls){
      const line = document.createElement('div');
      line.className = 'term-line' + (cls ? ' ' + cls : '');
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }
    function printHTML(html, cls){
      const line = document.createElement('div');
      line.className = 'term-line' + (cls ? ' ' + cls : '');
      line.innerHTML = html;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }
    function updatePrompt(){ promptEl.textContent = 'webos:' + cwd + '$'; }

    function resolvePath(p){
      if (!p) return cwd;
      if (p.startsWith('/')) return p;
      return (cwd === '/' ? '' : cwd) + '/' + p;
    }

    const COMMANDS = {
      help(){
        print('Available commands:');
        [
          'help                 show this list',
          'ls [path]            list a directory',
          'cd <path>            change directory',
          'pwd                  print working directory',
          'cat <file>           print a file\'s contents',
          'echo <text>          print text',
          'echo <text> > file   write text to a file',
          'mkdir <name>         create a directory',
          'touch <name>         create an empty file',
          'rm <name>            delete a file or empty directory',
          'open <app>           launch an app (explorer, notepad, calculator, sc16, settings)',
          'whoami               show the current user',
          'date                 show the current date and time',
          'clear                clear the screen',
          'reset-fs             reset the file system to its default state',
        ].forEach(l => print('  ' + l));
      },
      ls(args){
        const p = resolvePath(args[0]);
        const items = fs.list(p);
        if (!items){ print('ls: no such directory: ' + p, 'term-error'); return; }
        if (items.length === 0){ print('(empty)'); return; }
        items.forEach(it => print((it.type === 'dir' ? '[DIR]  ' : '       ') + it.name));
      },
      cd(args){
        const p = resolvePath(args[0] || '/');
        if (!fs.isDir(p)){ print('cd: no such directory: ' + p, 'term-error'); return; }
        const parts = p.split('/').filter(Boolean);
        cwd = '/' + parts.join('/');
        updatePrompt();
      },
      pwd(){ print(cwd); },
      cat(args){
        if (!args[0]){ print('cat: missing file name', 'term-error'); return; }
        const p = resolvePath(args[0]);
        const c = fs.read(p);
        if (c === null){ print('cat: no such file: ' + p, 'term-error'); return; }
        c.split('\n').forEach(l => print(l));
      },
      echo(args){
        const raw = args.join(' ');
        const gtIndex = raw.indexOf('>');
        if (gtIndex !== -1){
          const text = raw.slice(0, gtIndex).trim();
          const target = raw.slice(gtIndex + 1).trim();
          if (!target){ print('echo: missing target file', 'term-error'); return; }
          fs.write(resolvePath(target), text);
          print('Wrote ' + text.length + ' characters to ' + resolvePath(target));
        } else {
          print(raw);
        }
      },
      mkdir(args){
        if (!args[0]){ print('mkdir: missing name', 'term-error'); return; }
        fs.mkdir(resolvePath(args[0]));
      },
      touch(args){
        if (!args[0]){ print('touch: missing name', 'term-error'); return; }
        const p = resolvePath(args[0]);
        if (fs.read(p) === null) fs.write(p, '');
      },
      rm(args){
        if (!args[0]){ print('rm: missing name', 'term-error'); return; }
        const p = resolvePath(args[0]);
        if (!fs.remove(p)) print('rm: no such file or directory: ' + p, 'term-error');
      },
      whoami(){ print('guest'); },
      date(){ print(new Date().toString()); },
      clear(){ output.innerHTML = ''; },
      'reset-fs'(){
        if (confirm('Reset the entire file system to its default state?')){
          fs.reset(); print('File system reset.');
        }
      },
      open(args){
        const id = args[0];
        const app = id && getApp(id);
        if (!app){ print('open: unknown app "' + id + '". Try: ' + window.AppRegistry.map(a=>a.id).join(', '), 'term-error'); return; }
        app.launch(ctx);
        print('Launched ' + app.name + '.');
      },
    };

    function runCommand(line){
      printHTML('<span class="term-echo-prompt">' + promptEl.textContent + '</span> ' + escapeHtml(line));
      const trimmed = line.trim();
      if (!trimmed) return;
      const [cmd, ...args] = trimmed.split(/\s+/);
      const argsRaw = trimmed.slice(cmd.length).trim();
      const fn = COMMANDS[cmd];
      if (!fn){ print(cmd + ': command not found (try "help")', 'term-error'); return; }
      // give echo the raw remainder so ">" redirection with spaces works
      if (cmd === 'echo') fn(argsRaw.split(/\s+/));
      else fn(args);
    }

    function escapeHtml(s){
      return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter'){
        const line = input.value;
        history.push(line);
        histIndex = history.length;
        input.value = '';
        runCommand(line);
      } else if (e.key === 'ArrowUp'){
        if (histIndex > 0){ histIndex--; input.value = history[histIndex] || ''; }
        e.preventDefault();
      } else if (e.key === 'ArrowDown'){
        if (histIndex < history.length){ histIndex++; input.value = history[histIndex] || ''; }
        e.preventDefault();
      }
    });
    root.addEventListener('click', () => input.focus());

    print('WebOS Terminal  —  type "help" to get started.');
    updatePrompt();
    setTimeout(() => input.focus(), 50);
  }
});
