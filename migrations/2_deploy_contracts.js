var GodTokenCrowdsale = artifacts.require("./GodTokenCrowdsale.sol")

module.exports = function(deployer, network, accounts) {
  const startBlock = web3.eth.blockNumber + 2
  const endBlock = startBlock + 300
  // const rate = new web3.BigNumber(1000)
  const rate = 2
  const portfolioWallet = web3.eth.accounts[0]
  const adminWallet = web3.eth.accounts[1]

  deployer.deploy(GodTokenCrowdsale, startBlock, endBlock, rate, portfolioWallet, adminWallet)
};