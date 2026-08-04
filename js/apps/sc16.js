/*
 a tiny 16-bit CPU + assembler, running inside a window of its own.
 */
(function(){

  const OPS = {
    NOP:{code:0,args:[]}, MOV:{code:1,args:['reg','reg']}, MOVI:{code:2,args:['reg','val']},
    LOAD:{code:3,args:['reg','val']}, LOADR:{code:4,args:['reg','reg']}, STORE:{code:5,args:['val','reg']},
    STORER:{code:6,args:['reg','reg']}, ADD:{code:7,args:['reg','reg']}, SUB:{code:8,args:['reg','reg']},
    MUL:{code:9,args:['reg','reg']}, DIV:{code:10,args:['reg','reg']}, AND:{code:11,args:['reg','reg']},
    OR:{code:12,args:['reg','reg']}, XOR:{code:13,args:['reg','reg']}, NOT:{code:14,args:['reg']},
    SHL:{code:15,args:['reg','reg']}, SHR:{code:16,args:['reg','reg']}, CMP:{code:17,args:['reg','reg']},
    JMP:{code:18,args:['val']}, JZ:{code:19,args:['val']}, JNZ:{code:20,args:['val']}, JC:{code:21,args:['val']},
    JN:{code:22,args:['val']}, CALL:{code:23,args:['val']}, RET:{code:24,args:[]}, PUSH:{code:25,args:['reg']},
    POP:{code:26,args:['reg']}, IN:{code:27,args:['reg']}, OUT:{code:28,args:['reg']}, HALT:{code:29,args:[]},
    ADDI:{code:30,args:['reg','val']}, SUBI:{code:31,args:['reg','val']}, CLS:{code:32,args:[]},
    JMPR:{code:33,args:['reg']}, JZR:{code:34,args:['reg','val']}, JNZR:{code:35,args:['reg','val']},
  };
  const REV_OPS = {};
  for (const n in OPS) REV_OPS[OPS[n].code] = {name:n, args:OPS[n].args};

  function stripComment(l){ const i=l.indexOf(';'); return i===-1?l:l.slice(0,i); }
  function parseStr(rest){ const m=rest.match(/"((?:[^"\\]|\\.)*)"/); if(!m) throw new Error('Expected quoted string'); return m[1].replace(/\\n/g,'\n').replace(/\\"/g,'"'); }
  function parseReg(t){ const m=t.trim().match(/^[Rr]([0-7])$/); if(!m) throw new Error('Expected register, got "'+t.trim()+'"'); return parseInt(m[1],10); }
  function parseVal(t,labels){
    t=t.trim();
    if(/^'(\\.|[^'])'$/.test(t)){ const inner=t.slice(1,-1); return inner==='\\n'?10:inner.charCodeAt(0); }
    if(/^0x[0-9a-fA-F]+$/.test(t)) return parseInt(t,16)&0xFFFF;
    if(/^-?\d+$/.test(t)) return parseInt(t,10)&0xFFFF;
    if(Object.prototype.hasOwnProperty.call(labels,t)) return labels[t];
    throw new Error('Unknown value/label "'+t+'"');
  }
  function splitOperands(rest){
    if(!rest.trim()) return [];
    const parts=[]; let cur='',inQ=false;
    for(const ch of rest){ if(ch==='"') inQ=!inQ; if(ch===','&&!inQ){parts.push(cur);cur='';continue;} cur+=ch; }
    parts.push(cur);
    return parts.map(s=>s.trim()).filter(s=>s.length);
  }

  function assemble(source){
    const rawLines = source.split('\n');
    const labels = {}; const prepared = []; let addr = 0;
    for (let li=0; li<rawLines.length; li++){
      let line = stripComment(rawLines[li]).trim();
      if (!line) continue;
      const lm = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
      if (lm){
        if (Object.prototype.hasOwnProperty.call(labels, lm[1])) throw new Error('Line '+(li+1)+': duplicate label "'+lm[1]+'"');
        labels[lm[1]] = addr; line = lm[2].trim();
      }
      if (!line) continue;
      const sp = line.search(/\s/);
      const mnemonic = (sp===-1?line:line.slice(0,sp)).toUpperCase();
      const rest = sp===-1?'':line.slice(sp+1).trim();
      let size, kind;
      if (mnemonic==='DW'){ const vals=splitOperands(rest); if(!vals.length) throw new Error('Line '+(li+1)+': DW needs values'); size=vals.length; kind='DW'; }
      else if (mnemonic==='STR'){ size=parseStr(rest).length+1; kind='STR'; }
      else { if(!OPS[mnemonic]) throw new Error('Line '+(li+1)+': unknown instruction "'+mnemonic+'"'); size=3; kind='INSTR'; }
      prepared.push({addr, mnemonic, rest, size, kind, lineNo:li+1});
      addr += size;
    }
    if (addr > 4096) throw new Error('Program too large ('+addr+' words)');
    const mem = new Uint16Array(4096);
    for (const item of prepared){
      if (item.kind==='DW'){ splitOperands(item.rest).forEach((v,i)=>{ mem[item.addr+i]=parseVal(v,labels); }); }
      else if (item.kind==='STR'){ const s=parseStr(item.rest); for(let i=0;i<s.length;i++) mem[item.addr+i]=s.charCodeAt(i); mem[item.addr+s.length]=0; }
      else {
        const def=OPS[item.mnemonic]; const ops=splitOperands(item.rest);
        if (ops.length!==def.args.length) throw new Error('Line '+item.lineNo+': "'+item.mnemonic+'" expects '+def.args.length+' operand(s)');
        const enc=[0,0];
        def.args.forEach((type,i)=>{ enc[i]= type==='reg'?parseReg(ops[i]):parseVal(ops[i],labels); });
        mem[item.addr]=def.code; mem[item.addr+1]=enc[0]; mem[item.addr+2]=enc[1];
      }
    }
    return {mem, size:addr};
  }

  class CPU{
    constructor(mem){
      this.mem=mem; this.reg=new Uint16Array(8); this.pc=0; this.sp=4095;
      this.flags={Z:false,C:false,N:false}; this.halted=false; this.error=null; this.lastKey=0; this.steps=0;
    }
    setFlags(r,c){ const v=r&0xFFFF; this.flags.Z=v===0; this.flags.N=(v&0x8000)!==0; if(c!==undefined) this.flags.C=!!c; }
    step(onOut){
      if (this.halted) return;
      const mem=this.mem, reg=this.reg;
      const op=mem[this.pc], a1=mem[this.pc+1], a2=mem[this.pc+2];
      this.pc=(this.pc+3)&0xFFF;
      switch(op){
        case 0: break;
        case 1: reg[a1]=reg[a2]; break;
        case 2: reg[a1]=a2; break;
        case 3: reg[a1]=mem[a2]; break;
        case 4: reg[a1]=mem[reg[a2]]; break;
        case 5: mem[a1]=reg[a2]; break;
        case 6: mem[reg[a1]]=reg[a2]; break;
        case 7: { const r=reg[a1]+reg[a2]; this.setFlags(r,r>0xFFFF); reg[a1]=r; break; }
        case 8: { const c=reg[a1]<reg[a2]; const r=reg[a1]-reg[a2]; this.setFlags(r,c); reg[a1]=r; break; }
        case 9: { const r=reg[a1]*reg[a2]; this.setFlags(r,r>0xFFFF); reg[a1]=r; break; }
        case 10: { if(reg[a2]===0){this.halted=true; this.error='Division by zero'; break;} const r=Math.floor(reg[a1]/reg[a2]); this.setFlags(r,false); reg[a1]=r; break; }
        case 11: reg[a1]=reg[a1]&reg[a2]; this.setFlags(reg[a1]); break;
        case 12: reg[a1]=reg[a1]|reg[a2]; this.setFlags(reg[a1]); break;
        case 13: reg[a1]=reg[a1]^reg[a2]; this.setFlags(reg[a1]); break;
        case 14: reg[a1]=(~reg[a1])&0xFFFF; this.setFlags(reg[a1]); break;
        case 15: reg[a1]=(reg[a1]<<reg[a2])&0xFFFF; this.setFlags(reg[a1]); break;
        case 16: reg[a1]=(reg[a1]>>>reg[a2])&0xFFFF; this.setFlags(reg[a1]); break;
        case 17: { const c=reg[a1]<reg[a2]; const r=reg[a1]-reg[a2]; this.setFlags(r,c); break; }
        case 18: this.pc=a1; break;
        case 19: if(this.flags.Z) this.pc=a1; break;
        case 20: if(!this.flags.Z) this.pc=a1; break;
        case 21: if(this.flags.C) this.pc=a1; break;
        case 22: if(this.flags.N) this.pc=a1; break;
        case 23: this.sp=(this.sp-1)&0xFFF; mem[this.sp]=this.pc; this.pc=a1; break;
        case 24: this.pc=mem[this.sp]; this.sp=(this.sp+1)&0xFFF; break;
        case 25: this.sp=(this.sp-1)&0xFFF; mem[this.sp]=reg[a1]; break;
        case 26: reg[a1]=mem[this.sp]; this.sp=(this.sp+1)&0xFFF; break;
        case 27: reg[a1]=this.lastKey; this.lastKey=0; break;
        case 28: if(onOut) onOut(reg[a1]&0xFF); break;
        case 29: this.halted=true; break;
        case 30: { const r=reg[a1]+a2; this.setFlags(r,r>0xFFFF); reg[a1]=r; break; }
        case 31: { const c=reg[a1]<a2; const r=reg[a1]-a2; this.setFlags(r,c); reg[a1]=r; break; }
        case 32: if(onOut) onOut(-1); break;
        case 33: this.pc=reg[a1]; break;
        case 34: if(reg[a1]===0) this.pc=a2; break;
        case 35: if(reg[a1]!==0) this.pc=a2; break;
        default: this.halted=true; this.error='Illegal opcode '+op;
      }
      this.steps++;
    }
  }

  const SAMPLE =
    '; Prints a greeting, character by character.\n' +
    '        MOVI R0, MSG\n' +
    'LOOP:   LOADR R1, R0\n' +
    '        JZR R1, DONE\n' +
    '        OUT R1\n' +
    '        ADDI R0, 1\n' +
    '        JMP LOOP\n' +
    'DONE:   MOVI R3, 10\n' +
    '        OUT R3\n' +
    '        HALT\n' +
    'MSG:    STR "Hello, World!"\n';

  registerApp({
    id: 'sc16',
    name: 'SC-16 Emulator',
    icon: '&#128300;',
    showOnDesktop: true,
    launch(ctx, args){
      const { wm, fs } = ctx;
      const root = document.createElement('div');
      root.className = 'app-sc16';
      root.innerHTML =
        '<div class="sc16-left">' +
          '<textarea class="sc16-code" spellcheck="false"></textarea>' +
          '<div class="sc16-controls">' +
            '<button class="sc16-asm">Assemble</button>' +
            '<button class="sc16-run">Run</button>' +
            '<button class="sc16-step">Step</button>' +
            '<button class="sc16-stop" disabled>Stop</button>' +
          '</div>' +
          '<div class="sc16-status"></div>' +
        '</div>' +
        '<div class="sc16-right">' +
          '<div class="sc16-regs"></div>' +
          '<div class="sc16-console" tabindex="0"></div>' +
        '</div>';

      const win = wm.open({ title: 'SC-16 Emulator', icon: '&#128300;', width: 700, height: 480, content: root });

      const codeEl = root.querySelector('.sc16-code');
      const statusEl = root.querySelector('.sc16-status');
      const consoleEl = root.querySelector('.sc16-console');
      const regsEl = root.querySelector('.sc16-regs');
      const btnAsm = root.querySelector('.sc16-asm');
      const btnRun = root.querySelector('.sc16-run');
      const btnStep = root.querySelector('.sc16-step');
      const btnStop = root.querySelector('.sc16-stop');

      codeEl.value = (args && args.path && fs.read(args.path)) || SAMPLE;

      let cpu = null;
      let timer = null;

      function hex(n,d){ return n.toString(16).toUpperCase().padStart(d||3,'0'); }
      function renderRegs(){
        if (!cpu){ regsEl.innerHTML = '<div class="sc16-dim">Not assembled yet.</div>'; return; }
        const names=['R0','R1','R2','R3','R4','R5','R6','R7'];
        let html = '<div class="sc16-reg-grid">';
        names.forEach((n,i)=> html += '<div>'+n+'=<b>'+hex(cpu.reg[i])+'</b></div>');
        html += '</div><div class="sc16-reg-grid">' +
          '<div>PC=<b>'+hex(cpu.pc)+'</b></div><div>SP=<b>'+hex(cpu.sp)+'</b></div>' +
          '<div>Z=<b>'+(cpu.flags.Z?1:0)+'</b></div><div>C=<b>'+(cpu.flags.C?1:0)+'</b></div><div>N=<b>'+(cpu.flags.N?1:0)+'</b></div>' +
          '</div><div class="sc16-dim">Steps: '+cpu.steps+'</div>';
        regsEl.innerHTML = html;
      }
      function output(code){
        if (code===-1){ consoleEl.textContent=''; return; }
        consoleEl.textContent += (code===10?'\n':String.fromCharCode(code));
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }

      function doAssemble(){
        try{
          const { mem, size } = assemble(codeEl.value);
          cpu = new CPU(mem);
          consoleEl.textContent = '';
          statusEl.textContent = 'Assembled OK — ' + size + ' words.';
          statusEl.className = 'sc16-status ok';
          btnRun.disabled = false; btnStep.disabled = false;
        } catch(e){
          cpu = null;
          statusEl.textContent = 'Error: ' + e.message;
          statusEl.className = 'sc16-status err';
          btnRun.disabled = true; btnStep.disabled = true;
        }
        renderRegs();
      }
      function doStep(){
        if (!cpu || cpu.halted) return;
        cpu.step(output);
        if (cpu.halted) stopRun();
        renderRegs();
      }
      function startRun(){
        if (!cpu || cpu.halted) return;
        btnRun.disabled = true; btnStep.disabled = true; btnStop.disabled = false;
        timer = setInterval(() => {
          for (let i=0;i<50 && cpu && !cpu.halted;i++) cpu.step(output);
          if (!cpu || cpu.halted) stopRun();
          renderRegs();
        }, 16);
      }
      function stopRun(){
        if (timer){ clearInterval(timer); timer=null; }
        btnRun.disabled = !cpu || cpu.halted; btnStep.disabled = !cpu || cpu.halted; btnStop.disabled = true;
      }

      btnAsm.addEventListener('click', doAssemble);
      btnStep.addEventListener('click', doStep);
      btnRun.addEventListener('click', startRun);
      btnStop.addEventListener('click', stopRun);
      consoleEl.addEventListener('keydown', (e) => {
        if (!cpu) return;
        e.preventDefault();
        let code = 0;
        if (e.key === 'Enter') code = 10;
        else if (e.key.length === 1) code = e.key.charCodeAt(0);
        if (code) cpu.lastKey = code;
      });
      consoleEl.addEventListener('click', () => consoleEl.focus());

      renderRegs();
      doAssemble();
    }
  });
})();
