const { Block, BlockChain } = require("./blockchain");

const entry = new BlockChain();
entry.addBlock(
  new Block(Date.now().toString(), {
    from: "Necati",
    to: "Mecati",
    amount: 120,
  })
);
console.log(entry.chain);
