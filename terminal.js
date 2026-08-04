
export class ScratchTerminal {
    constructor(canvas, cols = 80, rows = 24) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = cols;
        this.rows = rows;

        this.charWidth = 9;
        this.charHeight = 16;
        
        this.canvas.width = this.cols * this.charWidth;
        this.canvas.height = this.rows * this.charHeight;

        this.buffer = Array.from({ length: this.rows }, () => 
            Array.from({ length: this.cols }, () => ({ char: ' ', fg: '#00ff00', bg: '#000000' }))
        );
        
        this.cursorX = 0;
        this.cursorY = 0;
        this.currentFg = '#00ff00';
        this.currentBg = '#000000';
        

        this.ansiState = 0; 
        this.ansiBuffer = "";
    }

    write(string) {
        for (let i = 0; i < string.length; i++) {
            const char = string[i];
            
            if (this.ansiState === 0) {
                if (char === '\x1b') {
                    this.ansiState = 1;
                } else if (char === '\r') {
                    this.cursorX = 0;
                } else if (char === '\n') {
                    this.cursorY++;
                    if (this.cursorY >= this.rows) {
                        this.scroll();
                        this.cursorY = this.rows - 1;
                    }
                } else {
                    if (this.cursorX < this.cols && this.cursorY < this.rows) {
                        this.buffer[this.cursorY][this.cursorX] = {
                            char: char,
                            fg: this.currentFg,
                            bg: this.currentBg
                        };
                        this.cursorX++;
                        if (this.cursorX >= this.cols) {
                            this.cursorX = 0;
                            this.cursorY++;
                            if (this.cursorY >= this.rows) {
                                this.scroll();
                                this.cursorY = this.rows - 1;
                            }
                        }
                    }
                }
            } else if (this.ansiState === 1) {
                if (char === '[') {
                    this.ansiState = 2;
                    this.ansiBuffer = "";
                } else {
                    this.ansiState = 0; 
                }
            } else if (this.ansiState === 2) {
              
                if (char >= '0' && char <= '9' || char === ';') {
                    this.ansiBuffer += char;
                } else {

                    this.handleAnsiCommand(char, this.ansiBuffer);
                    this.ansiState = 0;
                }
            }
        }
        this.render();
    }

    handleAnsiCommand(cmd, buffer) {
        const params = buffer.split(';').map(x => parseInt(x, 10));
        
        if (cmd === 'J' && params[0] === 2) {

            this.buffer.forEach(row => row.forEach(cell => {
                cell.char = ' ';
                cell.bg = this.currentBg;
            }));
            this.cursorX = 0;
            this.cursorY = 0;
        } else if (cmd === 'H' || cmd === 'f') {

            this.cursorY = Math.min(Math.max((params[0] || 1) - 1, 0), this.rows - 1);
            this.cursorX = Math.min(Math.max((params[1] || 1) - 1, 0), this.cols - 1);
        } else if (cmd === 'm') {
            
            params.forEach(p => {
                if (p === 0) { this.currentFg = '#00ff00'; this.currentBg = '#000000'; } // Reset
                else if (p === 30) this.currentFg = '#000000';
                else if (p === 31) this.currentFg = '#ff0000'; // Red
                else if (p === 32) this.currentFg = '#00ff00'; // Green
                else if (p === 34) this.currentFg = '#0000ff'; // Blue
                else if (p === 37) this.currentFg = '#ffffff'; // White
            });
        }
    }

    scroll() {
        this.buffer.shift();
        this.buffer.push(Array.from({ length: this.cols }, () => ({ char: ' ', fg: this.currentFg, bg: this.currentBg })));
    }

    render() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = "16px 'Courier New', monospace";
        this.ctx.textBaseline = "top";

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.buffer[y][x];
                const px = x * this.charWidth;
                const py = y * this.charHeight;
                if (cell.bg !== '#000000') {
                    this.ctx.fillStyle = cell.bg;
                    this.ctx.fillRect(px, py, this.charWidth, this.charHeight);
                }

                this.ctx.fillStyle = cell.fg;
                this.ctx.fillText(cell.char, px, py);
            }
        }
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.cursorX * this.charWidth, this.cursorY * this.charHeight + 14, this.charWidth, 2);
    }
}
