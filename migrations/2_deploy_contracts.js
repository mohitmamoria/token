var GodCoinCrowdsale = artifacts.require("./GodCoinCrowdsale.sol")

module.exports = function(deployer, network, accounts) {
  const startBlock = web3.eth.blockNumber + 2
  const endBlock = startBlock + 300
  // const rate = new web3.BigNumber(1000)
  const rate = 1
  const wallet = web3.eth.accounts[0]

  deployer.deploy(GodCoinCrowdsale, startBlock, endBlock, rate, wallet)
};