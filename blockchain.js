const crypto = require("crypto"),
  SHA256 = (message) =>
    crypto.createHash("sha256").update(message).digest("hex");
const EC = require("elliptic").ec,
  ec = new EC("secp256k1");
const MINT_KEY_PAIR = ec.genKeyPair();
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");
const holderKeyPair = ec.genKeyPair();

class Block {
  constructor(timestamp = "", data = []) {
    this.timestamp = timestamp;
    this.data = data;
    this.hash = this.getHash();
    this.prevHash = "";
    this.nonce = 0;
  }
  getHash() {
    return SHA256(
      this.prevHash + this.timestamp + JSON.stringify(this.data) + this.nonce
    );
  }
  mine(difficulty) {
    while (!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
      this.nonce++;
      this.hash = this.getHash();
    }
  }
  hasValidTransactions(chain) {
    let gas = 0,
      reward = 0;
    this.data.forEach((transaction) => {
      if (transaction.from !== MINT_PUBLIC_ADDRESS) {
        gas += transaction.gas;
      } else {
        reward = transaction.amount;
      }
    });
    return (
      reward - gas === chain.reward &&
      this.data.every((transaction) =>
        transaction.isValid(transaction, chain)
      ) &&
      this.data.filter(
        (transaction) => transaction.from === MINT_PUBLIC_ADDRESS
      ).length === 1
    );
  }
}
class Transaction {
  constructor(from, to, amount, gas = 0) {
    this.from = from;
    this.to = to;
    this.gas = gas;
    this.amount = amount;
  }
  sign(keyPair) {
    if (keyPair.getPublic("hex") === this.from) {
      this.signature = keyPair
        .sign(SHA256(this.from + this.to + this.amount + this.gas), "base64")
        .toDER("hex");
    }
  }
  getBalance(address) {
    let balance = 0;
    this.chain.forEach((block) => {
      block.data.forEach((transaction) => {
        if (transaction.from === address) {
          balance -= transaction.amount;
          balance -= transaction.gas;
        }
        if (transaction.to === address) {
          balance += transaction.amount;
        }
      });
    });
    return balance;
  }
  isValid(tx, chain) {
    return (
      tx.from &&
      tx.to &&
      tx.amount &&
      chain.getBalance(
        tx.from >= tx.amount + tx.gas ||
          (tx.from === MINT_PUBLIC_ADDRESS &&
            ec
              .keyFromPublic(tx.from, "hex")
              .verify(
                SHA256(tx.from + tx.to + tx.amount + tx.gas),
                tx.signature
              ))
      )
    );
  }
}

class BlockChain {
  constructor() {
    const initalCoinRelease = new Transaction(
      MINT_PUBLIC_ADDRESS,
      holderKeyPair.getPublic("hex"),
      100000
    );
    this.chain = [new Block(Date.now().toString(), [initalCoinRelease])];
    this.difficulty = 1;
    this.blockTime = 30000;
    this.transactions = [];
    this.reward = 298;
  }
  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }
  addTransaction(transaction) {
    if (transaction.isValid(transaction, this)) {
      this.transactions.push(transaction);
    }
  }
  mineTransactions(rewardAddress) {
    let gas = 0;
    this.transactions.forEach((transaction) => {
      gas += transaction.gas;
    });
    const rewardTransaction = new Transaction(
      MINT_PUBLIC_ADDRESS,
      rewardAddress,
      this.reward + gas
    );
    rewardTransaction.sign(MINT_KEY_PAIR);

    if (this.transactions.length !== 0)
      this.addBlock(
        new Block(date.now().toString(), [
          rewardTransaction,
          ...this.transactions,
        ])
      );
    this.transactions = [];
  }

  addBlock(block) {
    block.prevHash = this.getLastBlock().hash;
    block.hash = block.getHash();
    block.mine(this.difficulty);
    this.chain.push(Object.freeze(block));
    this.difficulty +=
      Date.now() - parseInt(this.getLastBlock().timestamp) < this.blockTime
        ? 1
        : -1;
  }
  isValid(blockchain = this) {
    for (let i = 1; i < blockchain.chain.length; i++) {
      const currentBlock = blockchain.chain[i];
      const prevBlock = blockchain.chain[i - 1];
      if (
        currentBlock.hash !== currentBlock.getHash() ||
        prevBlock.hash !== currentBlock.prevHash ||
        !currentBlock.hasValidTransactions(blockchain)
      ) {
        return false;
      }
    }
    return true;
  }
}
module.exports = { Block, BlockChain };
