registerApp({
  id: 'calculator',
  name: 'Calculator',
  icon: '&#128290;',
  showOnDesktop: true,
  launch(ctx){
    const { wm } = ctx;

    const root = document.createElement('div');
    root.className = 'app-calculator';

    const BUTTONS = [
      'C', '&#177;', '%', '&#247;',
      '7', '8', '9', '&#215;',
      '4', '5', '6', '&#8722;',
      '1', '2', '3', '+',
      '0', '.', '&#8592;', '=',
    ];

    root.innerHTML =
      '<div class="calc-display"><div class="calc-expr"></div><div class="calc-value">0</div></div>' +
      '<div class="calc-grid">' +
      BUTTONS.map(b => '<button class="calc-btn" data-key="' + b + '">' + b + '</button>').join('') +
      '</div>';

    wm.open({ title: 'Calculator', icon: '&#128290;', width: 300, height: 420, resizable: false, content: root });

    const valueEl = root.querySelector('.calc-value');
    const exprEl = root.querySelector('.calc-expr');

    let acc = null;       // accumulated value
    let op = null;        // pending operator
    let current = '0';    // string being typed
    let justEvaluated = false;

    function fmt(n){
      if (!isFinite(n)) return 'Error';
      const r = Math.round(n * 1e10) / 1e10;
      return String(r);
    }
    function render(){
      valueEl.textContent = current;
      exprEl.textContent = (acc !== null ? fmt(acc) + ' ' + (op || '') : '');
    }
    function applyOp(a, b, o){
      switch(o){
        case '+': return a + b;
        case '&#8722;': return a - b;
        case '&#215;': return a * b;
        case '&#247;': return b === 0 ? NaN : a / b;
        default: return b;
      }
    }

    root.querySelector('.calc-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-btn');
      if (!btn) return;
      const key = btn.dataset.key;

      if (key === 'C'){ acc = null; op = null; current = '0'; justEvaluated = false; return render(); }
      if (key === '&#8592;'){ current = current.length > 1 ? current.slice(0,-1) : '0'; return render(); }
      if (key === '&#177;'){ current = String(parseFloat(current || '0') * -1); return render(); }
      if (key === '%'){ current = String(parseFloat(current || '0') / 100); return render(); }
      if (key === '.'){ if (!current.includes('.')) current += '.'; return render(); }

      if (['+','&#8722;','&#215;','&#247;'].includes(key)){
        if (acc !== null && op && !justEvaluated){
          acc = applyOp(acc, parseFloat(current), op);
        } else {
          acc = parseFloat(current);
        }
        op = key; current = '0'; justEvaluated = false;
        return render();
      }

      if (key === '='){
        if (op !== null){
          acc = applyOp(acc, parseFloat(current), op);
          current = fmt(acc);
          op = null; justEvaluated = true;
        }
        return render();
      }

      // digit
      if (justEvaluated){ current = key; justEvaluated = false; }
      else current = (current === '0') ? key : (current + key);
      render();
    });

    render();
  }
});
