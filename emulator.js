
export class ScratchComputer {
    constructor(outputCallback) {
        this.outputCallback = outputCallback;
        
        this.ram = new Uint8Array(1024 * 1024);

        this.registers = {
            AX: 0x0000, BX: 0x0000, CX: 0x0000, DX: 0x0000,
            SI: 0x0000, DI: 0x0000, BP: 0x0000, SP: 0xFFF0,
            IP: 0x0000, CS: 0x0000, DS: 0x0000, ES: 0x0000
        };
        
        this.halted = false;
    }
    loadBios(binaryUint8Array, address) {
        for (let i = 0; i < binaryUint8Array.length; i++) {
            this.ram[address + i] = binaryUint8Array[i];
        }
    }

    sendKey(charString) {
        for(let i=0; i<charString.length; i++) {
            this.uartReceive(charString.charCodeAt(i));
        }
    }

    uartWrite(byte) {
  
        const char = String.fromCharCode(byte);
        this.outputCallback(char);
    }

    uartReceive(byte) {

        this.ram[0x0400] = byte; 
    }

    step() {
        if (this.halted) return;

        let physicalAddress = (this.registers.CS << 4) + this.registers.IP;
        let opcode = this.ram[physicalAddress];
        this.registers.IP++;


        switch (opcode) {
            case 0x90:
                break;

            case 0xB8: 
                let low = this.ram[(this.registers.CS << 4) + this.registers.IP++];
                let high = this.ram[(this.registers.CS << 4) + this.registers.IP++];
                this.registers.AX = (high << 8) | low;
                break;

            case 0xEE: 
                if (this.registers.DX === 0x3F8) { 
                    this.uartWrite(this.registers.AX & 0xFF);
                }
                break;

            case 0xEC: 
                if (this.registers.DX === 0x3F8) {
                    this.registers.AX = (this.registers.AX & 0xFF00) | this.ram[0x0400];
                    this.ram[0x0400] = 0; 
                }
                break;

            case 0xF4: 
                this.halted = true;
                console.log("cpu entered halted state.");
                break;

            default:
                break;
        }
    }

    run() {
        const loop = () => {
            if (!this.halted) {
                for (let i = 0; i < 10000; i++) {
                    this.step();
                }
                requestAnimationFrame(loop);
            }
        };
        requestAnimationFrame(loop);
    }
}
