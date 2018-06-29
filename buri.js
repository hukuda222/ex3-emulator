const to_binary = (num) => ("000000000000000" + (num & ((1 << 16) - 1)).toString(2)).slice(-16);

class Buri {
  constructor() {
    this.AC = 0;
    this.E = 0;
    this.PC = 0;
    this.cmds = [];
    this.labels = {}; // {label名:cmdsのindex}
  }
  read(txt) {
    const remove_null = (e) => e !== "";
    let orders;
    try {
      orders = txt.split("\n").filter(remove_null);
    } catch (e) {
      throw new Error("最初の段階でパースできないエラー");
    }
    orders.forEach((order, index) => {
      try {
        const label_parse = order.split("#")[0].split(",").filter(remove_null);
        let order_parse = order.split("#")[0].split(" ").filter(remove_null);
        // ラベルの処理
        if (label_parse.length === 2) {
          this.labels[label_parse[0]] = index;
          order_parse[0] = order_parse[0].split(",")[1];
        }
        order_parse = order_parse.filter(remove_null);
        // 命令のパース
        if (order_parse.length === 1) {
          this.cmds.push({
            func: order_parse[0]
          });
        } else if (order_parse.length === 2) {
          if (order_parse[0] === "DEC") {
            order_parse[1] = parseInt(order_parse[1]);
          } else if (order_parse[0] === "HEX") {
            order_parse[1] = parseInt(order_parse[1], 16);
          }
          this.cmds.push({
            func: order_parse[0],
            arg: order_parse[1]
          });
        } else if (order_parse.length === 3 && order_parse[2] === "I") {
          this.cmds.push({
            func: order_parse[0],
            arg: order_parse[1],
            I: true
          });
        } else {
          throw new Error();
        }
      } catch (e) {
        throw new Error("多分" + (index + 1) + "行目でエラー\n");
      }
    });
  }
  exe() {
    let counter = 0;
    let now_line = 0;
    while (this.PC >= 0) {
      if (counter > 100000) {
        throw new Error("ループしすぎエラー");
      }
      counter++;
      try {
        now_line = this.PC;
        const cmd = this.cmds[this.PC];
        this.PC += 1;
        if (cmd.hasOwnProperty("func")) {
          if (cmd.hasOwnProperty("arg")) {
            if (cmd.hasOwnProperty("I")) {
              this[cmd.func](this.cmds[this.labels[cmd.arg]].arg);
            } else {
              this[cmd.func](this.labels[cmd.arg]);
            }
          } else {
            this[cmd.func]();
          }
        } else {
          throw new Error();
        }
        this.AC &= (1 << 16) - 1;
      } catch (e) {
        throw new Error("多分" + (now_line + 1) + "行目でエラー\n最後の行ならHLT忘れかも");
      }
    }
    return this.get_all_label();
  }
  DEC(num) {} // 何もしないけどないとエラー出るので
  HEX(num) {} // 何もしないけどないとエラー出るので
  AND(adi) {
    this.AC &= this.cmds[adi].arg;
  }
  ORR(adi) {
    this.AC |= this.cmds[adi].arg;
  }
  ADD(adi) {
    this.AC += this.cmds[adi].arg;
    this.E = this.AC >> 16;
  }
  LDA(adi) {
    this.AC = this.cmds[adi].arg;
  }
  STA(adi) {
    this.cmds[adi].arg = this.AC;
  }
  BUN(adi) {
    this.PC = adi;
  }
  BSA(adi) {
    this.cmds[adi].arg = this.PC;
    this.PC = adi + 1;
  }
  ISZ(adi) {
    this.cmds[adi].arg += 1;
    if (this.cmds[adi].arg === 0) {
      this.PC += 1;
    }
  }
  CLA() {
    this.AC = 0;
  }
  CLE() {
    this.E = 0;
  }
  CMA() {
    this.AC = ~this.AC;
  }
  CME() {
    this.E = ~this.E;
  }
  CIR() {
    this.E = this.AC & 1;
    this.AC >>= 1;
    this.AC = this.AC | (this.E << 15);
  }
  CIL() {
    this.E = (this.AC & (1 << 15)) >> 15;
    this.AC <<= 1;
    this.AC = this.AC | this.E;
  }
  INC() {
    this.AC += 1;
  }
  SPA() {
    if ((this.AC & (1 << 15)) === 0) {
      this.PC += 1;
    }
  }
  SNA() {
    if ((this.AC & (1 << 15)) === 1) {
      this.PC += 1;
    }
  }
  SZA() {
    if (this.AC === 0) {
      this.PC += 1;
    }
  }
  SZE() {
    if (this.E === 0) {
      this.PC += 1;
    }
  }
  HLT() {
    this.PC = -1;
  }
  get_all_label() {
    let return_txt = "AC : " + to_binary(this.AC) + " (" + this.AC + ")\n";
    return_txt += "E : " + this.E + "\n";
    return_txt += "--------------------------------\n";
    Object.keys(this.labels).forEach((e) => {
      if (this.cmds[this.labels[e]].func === "DEC" || this.cmds[this.labels[e]].func === "HEX") {
        return_txt += e + " : " + to_binary(this.cmds[this.labels[e]].arg) + " (" + this.cmds[this.labels[e]].arg + ")\n";
      }
    });
    return return_txt;
  }
}
// const txt = "LDA AL\nADD BL\nSTA CL\nCLA\nCIL\nADD AH\nADD BH\nSTA CH\nAL,DEC 1\nAH,DEC 1\nBH,DEC 1\nBL,DEC 1\nCH,DEC 1\nCL,DEC 1\nSHW CH\nSHW CL\nHLT";
const compile = (txt) => {
  const buri = new Buri();
  try {
    buri.read(txt);
  } catch (e) {
    return e;
  }
  try {
    return buri.exe();
  } catch (e) {
    return e;
  }
};
