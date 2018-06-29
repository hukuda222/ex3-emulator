//整数を16桁2進数形式(str)で出力
const str_binary = (num) => ("000000000000000" + (num & ((1 << 16) - 1)).toString(2)).slice(-16);

//整数を2進数表記にした際の、min桁からmax桁までの部分を出力
const part_binary = (num, min, max) => {
  if (max === undefined) max = min;
  return (((1 << (max + 1)) - (1 << min)) & num) >> min;
}

//整数のindex桁目をiにする
const edit_binary = (num, index, i) => {
  return num | (i << index);
}

//整数をワンホット形式にする
const one_hot = (num) => 1 << num;

function* count() {
  let n = 0;
  while (true)
    if (yield n++) n = -1;
};

class Buri {
  constructor() {
    this.init();
  }

  init() {
    this.AR = 0; //アドレスレジスタ
    this.PC = 2; //0; //プログラムカウンタ
    this.DR = 0; //データレジスタ
    this.AC = 0; //アキュムレータ
    this.IR = 0; //命令レジスタ
    this.E = 0; //プログラムレジスタ
    this.I = 0; //命令フラグレジスタ
    this.SC = count(); //タイミング生成機
    this.INPR = 0; //入力レジスタ
    this.OUTR = 0; //出力レジスタ
    this.FGI = 0; //入力フラグレジスタ
    this.FGO = 1; //出力フラグレジスタ
    this.IEN = 0; //割り込み制御レジスタ{0:割り込み不可,1:割り込み許可}
    this.IMSK = parseInt("11", 2); //割り込みマスクレジスタ 0:{0:入力割り込み不可,1:入力割り込み許可},
    // 1:{0:出力割り込み不可,1:出力割り込み許可}
    this.R = 0; //割り込み状態レジスタ {0:割り込み非検知,1:割り込み検知}
    this.T = 0; //タイミング情報
    this.BS = 0; //バスにどれを流すか
    this.BD = 0; //バスデータ
    this.OP1 = 0; //111なら非メモリ参照命令,それ以外ならメモリ参照命令
    this.D = 0; //OP1をワンホットにしたやつ
    this.OP2 = 0; //レジスタ参照命令の引数
    this.M = []; //メモリ、こればっかりは面倒いので配列
    this.labels = {}; // {label名:メモリのindex}
    this.END = false;
    this.ERR = "";
    this.counter = 0;
  }
  // 書き込む
  request_input(num) {
    this.FGI = 1;
    this.INPR = parseInt(num);
  }
  // 出力させる
  request_output() {
    this.FGO = 0;
  }
  read(str) {
    this.init()
    //配列のからの要素を除く
    const remove_null = (e) => e !== "";
    let orders;
    try {
      orders = str.split("\n").filter(remove_null);
    } catch (e) {
      this.ERR = "end";
      throw new Error("最初の段階でパースできないエラー");
    }
    //先にラベルの処理だけやる
    orders.forEach((order, index) => {
      const label_parse = order.split("#")[0].split(",").filter(remove_null);
      if (label_parse.length === 2) this.labels[label_parse[0].replace(/ /g, '')] = index;

    });
    orders.forEach((order, index) => {
      try {
        const label_parse = order.split("#")[0].split(",").filter(remove_null);
        let order_parse = order.split("#")[0].split(" ").filter(remove_null);
        // ラベルがあった時に調整
        if (label_parse.length === 2) order_parse[0] = order_parse[0].split(",")[1].replace(/ /g, '');
        // 命令のパース
        //第2命令デコード
        if (order_parse.length === 1) {
          //レジスタ参照命令
          if (order_parse[0] === "CLA") this.M.push(parseInt("0111" + "1000" + "0000" + "0000", 2));
          if (order_parse[0] === "CLE") this.M.push(parseInt("0111" + "0100" + "0000" + "0000", 2));
          if (order_parse[0] === "CMA") this.M.push(parseInt("0111" + "0010" + "0000" + "0000", 2));
          if (order_parse[0] === "CME") this.M.push(parseInt("0111" + "0001" + "0000" + "0000", 2));
          if (order_parse[0] === "CIR") this.M.push(parseInt("0111" + "0000" + "1000" + "0000", 2));
          if (order_parse[0] === "CIL") this.M.push(parseInt("0111" + "0000" + "0100" + "0000", 2));
          if (order_parse[0] === "INC") this.M.push(parseInt("0111" + "0000" + "0010" + "0000", 2));
          if (order_parse[0] === "SPA") this.M.push(parseInt("0111" + "0000" + "0001" + "0000", 2));
          if (order_parse[0] === "SNA") this.M.push(parseInt("0111" + "0000" + "0000" + "1000", 2));
          if (order_parse[0] === "SZA") this.M.push(parseInt("0111" + "0000" + "0000" + "0100", 2));
          if (order_parse[0] === "SZE") this.M.push(parseInt("0111" + "0000" + "0000" + "0010", 2));
          if (order_parse[0] === "HLT") this.M.push(parseInt("0111" + "0000" + "0000" + "0001", 2));

          //入出力命令
          if (order_parse[0] === "INP") this.M.push(parseInt("1111" + "1000" + "0000" + "0000", 2));
          if (order_parse[0] === "OUT") this.M.push(parseInt("1111" + "0100" + "0000" + "0000", 2));
          if (order_parse[0] === "SKI") this.M.push(parseInt("1111" + "0010" + "0000" + "0000", 2));
          if (order_parse[0] === "SKO") this.M.push(parseInt("1111" + "0001" + "0000" + "0000", 2));
          if (order_parse[0] === "ION") this.M.push(parseInt("1111" + "0000" + "1000" + "0000", 2));
          if (order_parse[0] === "IOF") this.M.push(parseInt("1111" + "0000" + "0100" + "0000", 2));
          if (order_parse[0] === "IMK") this.M.push(parseInt("1111" + "0000" + "0010" + "0000", 2));

        } else if (order_parse.length === 2 || (order_parse.length === 3 && order_parse[2] === "I")) {
          let I = "0";
          if (order_parse[0] === "DEC") {
            this.M.push(parseInt(order_parse[1]));
          } else if (order_parse[0] === "HEX") {
            this.M.push(parseInt(order_parse[1], 16));
          } else {
            order_parse[1] = this.labels[order_parse[1]];
          }
          if (order_parse[2] === "I") I = "1";
          if (order_parse[0] === "AND") this.M.push(parseInt(I + "000" + "000000000000", 2) + order_parse[1]);
          if (order_parse[0] === "ADD") this.M.push(parseInt(I + "001" + "000000000000", 2) + order_parse[1]);
          if (order_parse[0] === "LDA") this.M.push(parseInt(I + "010" + "000000000000", 2) + order_parse[1]);
          if (order_parse[0] === "STA") this.M.push(parseInt(I + "011" + "000000000000", 2) + order_parse[1]);
          if (order_parse[0] === "BUN") this.M.push(parseInt(I + "100" + "000000000000", 2) + order_parse[1]);
          if (order_parse[0] === "BSA") this.M.push(parseInt(I + "101" + "000000000000", 2) + order_parse[1]);
          if (order_parse[0] === "ISZ") this.M.push(parseInt(I + "110" + "000000000000", 2) + order_parse[1]);

        } else {
          throw new Error();
        }
      } catch (e) {
        this.ERR = "end";
        throw new Error("多分" + (index + 1) + "行目でエラー\n");
      }
    });

  }

  exe() {
    // カウント
    this.T = one_hot(this.SC.next().value);
    this.interruptCheck() //割り込みがあるかチェック
    this.interrupt(); //割り込みが発生すればする
    this.orderFetch(); //命令フェッチ
    this.registerReference(); //レジスタ参照命令を実行する
    this.memoryReference(); //メモリ参照命令を実行する
    //console.log(this.PC, this.T)
    if (this.counter++ > 100000) {
      this.ERR = "ループ長すぎエラー";
    }
    if (!this.END && this.ERR === "") {
      setTimeout(_ => {
        this.exe();
      }, 1 / 10000);
    } else {
      this.M.forEach(e => {
        //console.log(this.END, this.ERR);
      });
    }
  }
  //割り込みチェック
  interruptCheck() {
    this.INTR = this.IEN &
      ((part_binary(this.IMSK, 0) & this.FGI) |
        (part_binary(this.IMSK, 1) & this.FGO));
    if (!this.R) {
      this.R = this.INTR & !part_binary(this.T, 0) & !part_binary(this.T, 1) &
        !part_binary(this.T, 2);
    }
  }

  //割り込み
  interrupt() {
    if (this.R & part_binary(this.T, 0)) this.AR = 0;
    else if (this.R & part_binary(this.T, 1)) {
      this.M[this.AR] = this.PC;
      this.PC = 0;
    } else if (this.R & part_binary(this.T, 2)) {
      this.PC += 1;
      this.IEN = 0;
      this.R = 0;
      this.SC.next(true); //カウントリセット SC = 0
    }
  }
  //命令フェッチ
  orderFetch() {
    if (!this.R & part_binary(this.T, 0)) this.AR = this.PC;
    else if (!this.R & part_binary(this.T, 1)) {
      this.IR = this.M[this.AR];
      this.PC += 1;
    } else if (!this.R & part_binary(this.T, 2)) {
      this.I = part_binary(this.IR, 15);
      this.AR = part_binary(this.IR, 0, 11);
      this.OP1 = part_binary(this.IR, 12, 14);
      this.D = one_hot(this.OP1);
      this.OP2 = part_binary(this.IR, 0, 11); //ARと一緒
    }
  }
  //メモリ参照命令
  memoryReference() {
    const t = i => part_binary(this.T, i);
    const bi = str => this.OP1 === parseInt(str, 2);
    if (t(3) & this.I) this.AR = this.M[this.AR];
    else if (bi("000")) { //AND
      if (t(4)) this.DR = this.M[this.AR];
      if (t(5)) {
        this.AC = this.AC & this.DR;
        this.SC.next(true); //カウントリセット}
      }
    } else if (bi("001")) { //ADD
      if (t(4)) this.DR = this.M[this.AR];
      if (t(5)) {
        const tmp = this.AC + this.DR;
        this.AC = part_binary(tmp, 0, 15);
        this.E = part_binary(tmp, 16);
        this.SC.next(true); //カウントリセット
      }
    } else if (bi("010")) { //LDA
      if (t(4)) this.DR = this.M[this.AR];
      if (t(5)) {
        this.AC = this.DR;
        this.SC.next(true); //カウントリセット
      }
    } else if (bi("011")) { //STA
      if (t(4)) {
        this.M[this.AR] = this.AC;
        this.SC.next(true); //カウントリセット
      }
    } else if (bi("100")) { //BUN
      if (t(4)) {
        this.PC = this.AR;
        this.SC.next(true); //カウントリセット
      }
    } else if (bi("101")) { //BSA
      if (t(4)) {
        this.M[this.AR] = this.AC;
        this.AR += 1;
      }
      if (t(5)) {
        this.PC = this.AR;
        this.SC.next(true); //カウントリセット
      }
    } else if (bi("111")) { //ISZ
      if (t(4)) this.DR = this.M[this.AR];
      if (t(5)) this.DR += 1;
      if (t(6)) {
        this.M[this.AR] = this.DR;
        if (this.DR === 0) this.PC += 1;
        this.SC.next(true); //カウントリセット
      }
    }
  }

  //レジスタ参照命令
  registerReference() {
    const r = part_binary(this.D, 7) & !this.I & part_binary(this.T, 3);
    const p = part_binary(this.D, 7) & this.I & part_binary(this.T, 3);
    const bi = i => part_binary(this.OP2, i);
    if (r & bi(11)) this.AC = 0; //CLA
    else if (r & bi(10)) this.E = 0; //CLE
    else if (r & bi(9)) this.AC = !this.AC; //CMA
    else if (r & bi(8)) this.E = !this.E; //CME
    else if (r & bi(7)) { //CIR
      const tmp = part_binary(this.AC, 0)
      this.AC >> 1;
      this.AC = part_binary(this.AC, 0, 15);
      edit_binary(this.AC, 15, this.E);
      this.E = tmp;
    } else if (r & bi(6)) { //CIL
      const tmp = part_binary(this.AC, 15);
      this.AC << 1;
      this.AC = part_binary(this.AC, 0, 15);
      edit_binary(this.AC, 0, this.E);
      this.E = tmp;
    } else if (r & bi(5)) this.AC += 1; //INC
    else if (r & bi(4)) { //SPA
      if (part_binary(this.AC, 15) === 0) this.PC += 1;
    } else if (r & bi(3)) { //SNA
      if (part_binary(this.AC, 15) === 1) this.PC += 1;
    } else if (r & bi(2)) { //SZA
      if (this.AC === 0) this.PC += 1;
    } else if (r & bi(1)) { //SZE
      if (this.E === 0) this.PC += 1;
    } else if (r & bi(0)) {
      this.END = true;
    } //HLT
    else if (p & bi(11)) { //INP
      this.AC = this.INPR + part_binary(this.AC, 8, 15);
      this.FGI = 0;
    } else if (p & bi(10)) { //OUT
      this.OUTR = part_binary(this.AC, 0, 7);
      console.log(this.OUTR);
      this.FGO = 0;
    } else if (p & bi(9)) { //SKI
      if (this.FGI === 1) this.PC += 1;
    } else if (p & bi(8)) { //SKO
      if (this.FGO === 1) this.PC += 1;
    } else if (p & bi(7)) this.IEN = 1; //ION
    else if (p & bi(6)) this.IEN = 0; //IOF
    else if (p & bi(5)) this.IMSK = part_binary(this.AC, 0, 1); //IMK

    if (part_binary(this.D, 7) & part_binary(this.T, 3)) this.SC.next(true);

  }
}
const buri = new Buri();
let txt = "S0,HEX 0\nBUN IHD\nLDA VH1\nIMK\nION\nL0,LDA K2\nSZA"
txt += "\nBUN L0\nHLT\nVH1,HEX 1\nVH2,HEX 2"
txt += "\nIHD,STA BA\nCIL\nSTA BE\nLDA K1"
txt += "\nSZA\nSKI\nBUN CHO\nINP\nSTA P1 I\nISZ P1\nISZ K1\nBUN IRT"
txt += "\nLDA VH2\nIMK\nBUN IRT\nCHO,SKO\nBUN IRT\nLDA P2 I"
txt += "\nOUT\nISZ P2\nISZ K2\nBUN IRT\nCLA\nIMK"
txt += "\nIRT,LDA BE\nCIR\nLDA BA\nION\nBUN SO I"
txt += "\nP1,HEX 300\nP2,HEX 300\nK1,DEC -10\nK2,DEC -10\nBA,HEX 0\nBE,HEX 0"
buri.read(txt)
buri.request_input(10);
buri.exe()
/*
process.stdin.setEncoding('utf-8');
process.stdin.on('data', function (data) {
  console.log(data)
  buri.request_input(data);
});*/
//const txt = "LDA AL\nADD BL\nSTA CL\nCLA\nCIL\nADD AH\nADD BH\nSTA CH\nHLT\nAL,DEC 1\nAH,DEC 1\nBH,DEC 1\nBL,DEC 1\nCH,DEC 1\nCL,DEC 1";
