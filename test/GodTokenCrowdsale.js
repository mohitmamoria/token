const GodTokenCrowdsale = artifacts.require("./GodTokenCrowdsale.sol");
const GodToken = artifacts.require("./GodToken.sol");

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('GodTokenCrowdsale', function ([portfolioWallet, adminWallet, investor1Wallet, investor2Wallet, investor3Wallet, investor4Wallet]) {
  
  const value = new BigNumber(web3.toWei(10, 'ether'));
  const EVMThrow = 'invalid opcode';

  beforeEach(async function () {
    this.startBlock = web3.eth.blockNumber + 2;
    this.endBlock =   this.startBlock + 300;
    this.rate = 2;
    this.minimumCap = new web3.BigNumber(web3.toWei(3.5, "ether"));
    this.crowdsale = await GodTokenCrowdsale.new(this.startBlock, this.endBlock, this.rate, portfolioWallet, adminWallet, this.minimumCap);
    this.token = GodToken.at(await this.crowdsale.token());
  });


  it('should be token owner', async function () {

    const owner = await this.token.owner();
    owner.should.equal(this.crowdsale.address);
  });
  
  describe('accepting payments', function () {

    it('should reject payments when passing value incorrectly', async function () {
      await this.crowdsale.buyTokens(investor3Wallet, value, {from: investor3Wallet}).should.be.rejectedWith(EVMThrow)
    });

    it('should accept payments when passing value correctly', async function () {
      await this.crowdsale.send(value).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor2Wallet, {value: value, from: investor2Wallet}).should.be.fulfilled;
    })

   it('invested value is distributed between portfolio and admin wallets', async function () {
      const prePortfolioBalance = web3.eth.getBalance(portfolioWallet)
      const preAdminBalance = web3.eth.getBalance(adminWallet)
      await this.crowdsale.buyTokens(investor1Wallet, {value: value, from: investor1Wallet})
      const postPortfolioBalance = web3.eth.getBalance(portfolioWallet)
      const postAdminBalance = web3.eth.getBalance(adminWallet)
      
      postPortfolioBalance.minus(prePortfolioBalance).plus(postAdminBalance).minus(preAdminBalance).should.be.bignumber.equal(value);
    })

   it('admin balance get increased by 5% of invested value', async function () {
      const preAdmin = web3.eth.getBalance(adminWallet)
      await this.crowdsale.buyTokens(investor1Wallet, {value: value, from: investor1Wallet})
      const postAdmin = web3.eth.getBalance(adminWallet)

      var adminBalanceDifference = postAdmin - preAdmin;

      adminBalanceDifference.should.be.bignumber.equal(value.mul(0.05))
    })  

   it('portfolio balance gets increased by 95% of invested value', async function () {
      const preBalance = web3.eth.getBalance(portfolioWallet)
      await this.crowdsale.buyTokens(investor1Wallet, {value: value, from: investor1Wallet})
      const postBalance = web3.eth.getBalance(portfolioWallet)

      var portfolioBalanceDifference = postBalance - preBalance;

      portfolioBalanceDifference.should.be.bignumber.equal(value.mul(0.95))
    })
  })  

  describe('issuing tokens', function () {

   it('token should be zero if havent invested', async function () {

      var tokensIssued = await this.token.balanceOf(investor4Wallet);
      tokensIssued.should.be.bignumber.equal(0);
    })

  it('token issued should be ethers invested * rate', async function () {
      
      await this.crowdsale.buyTokens(investor2Wallet, {value: value, from: investor2Wallet})
      var tokensIssued = await this.token.balanceOf(investor2Wallet);
      console.log(tokensIssued);
      tokensIssued.should.be.bignumber.equal(value.minus(value.mul(0.05)).mul(this.rate));
    })
  })

  describe('refunding ethers to investors', function () {
   
   it('refund cannot be done other than portfolio wallet but done by portfolio wallet', async function () {

      await this.crowdsale.buyTokens(investor4Wallet, {value: value, from: investor4Wallet})

      await this.crowdsale.refund(investor4Wallet, {value: value, from: adminWallet}).should.be.rejectedWith(EVMThrow)

      await this.crowdsale.refund(investor4Wallet, {value: value, from: portfolioWallet})

    })

   it('successfully refund ethers to investor by portfolio wallet 5% is added up to admin and 95% is refunded to investor', async function () {

      await this.crowdsale.buyTokens(investor4Wallet, {value: value, from: investor4Wallet})
      var tokensIssued = await this.token.balanceOf(investor4Wallet);

      const portfolioBalanceBeforeRefund = web3.eth.getBalance(portfolioWallet);
      const adminBalanceBeforeRefund = web3.eth.getBalance(adminWallet);
      const investorBalanceBeforeRefund = web3.eth.getBalance(investor4Wallet);
      
      var ethersToReturn  = tokensIssued.div(this.rate);

      await this.crowdsale.refund(investor4Wallet, {value: ethersToReturn, from: portfolioWallet})

      var tokensIssuedAfterRefund = await this.token.balanceOf(investor4Wallet);
      const portfolioBalanceAfterRefund = web3.eth.getBalance(portfolioWallet);
      const adminBalanceAfterRefund = web3.eth.getBalance(adminWallet);
      const investorBalanceAfterRefund = web3.eth.getBalance(investor4Wallet);

      tokensIssuedAfterRefund.should.be.bignumber.equal(0);
      adminBalanceAfterRefund.minus(adminBalanceBeforeRefund).should.be.bignumber.equal(ethersToReturn.mul(0.05))
      investorBalanceAfterRefund.minus(investorBalanceBeforeRefund).should.be.bignumber.equal(ethersToReturn.mul(0.95))

    })
  })


  describe('changing rate by admin', function () {
   

   it('noone can change rate other than admin', async function () {
      
      var newRate = 3;
      await this.crowdsale.setRate(newRate, {from : portfolioWallet}).should.be.rejectedWith(EVMThrow);
    })

  it('verify issued tokens as per changed rate', async function () {

      await this.crowdsale.buyTokens(investor4Wallet, {value: value, from: investor4Wallet})
      var tokensIssued = await this.token.balanceOf(investor4Wallet);

      tokensIssued.should.be.bignumber.equal(value.minus(value.mul(0.05)).mul(this.rate));

      var newRate = 3;

      await this.crowdsale.setRate(newRate, {from : adminWallet});

      await this.crowdsale.buyTokens(investor3Wallet, {value: value, from: investor3Wallet})
      var newTokensIssued = await this.token.balanceOf(investor3Wallet);

      newTokensIssued.should.be.bignumber.equal(value.minus(value.mul(0.05)).mul(newRate));
    })
  })  
  describe('changing min cap by admin', function () {
   

   it('noone can change cap other than admin', async function () {
      
      var newCap = web3.toWei(5, "ether");
      await this.crowdsale.updateMinimumAmountToInvest(newCap, {from : portfolioWallet}).should.be.rejectedWith(EVMThrow);
    })

  it('transaction failed if investment is less than min cap', async function () {

      await this.crowdsale.buyTokens(investor4Wallet, {value: web3.toWei(3, "ether"), from: investor4Wallet}).should.be.rejectedWith(EVMThrow);
    })

  it('transaction passed if investment is equal to  min cap', async function () {

      await this.crowdsale.buyTokens(investor4Wallet, {value: web3.toWei(3.5, "ether"), from: investor4Wallet});
    })

  it('transaction passed if investment is greater than min cap', async function () {

      await this.crowdsale.buyTokens(investor4Wallet, {value: web3.toWei(4, "ether"), from: investor4Wallet});
    })  

  it('changing min cap by admin', async function () {

      await this.crowdsale.buyTokens(investor4Wallet, {value: web3.toWei(4, "ether"), from: investor4Wallet});
      var newCap = web3.toWei(5, "ether");
      await this.crowdsale.updateMinimumAmountToInvest(newCap, {from : adminWallet});
      await this.crowdsale.buyTokens(investor4Wallet, {value: web3.toWei(4, "ether"), from: investor4Wallet}).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor4Wallet, {value: web3.toWei(5, "ether"), from: investor4Wallet});

    })
  })   

  describe('finalizing a crowsale', function () {
   
   it('no one can finalize other than admin', async function () {      
      await this.crowdsale.finalize({from : portfolioWallet}).should.be.rejectedWith(EVMThrow);
    })   

   it('only admin can finalize the crowdsale', async function () {      
      await this.crowdsale.finalize({from : adminWallet});
    })   

   it('rate cannot be changed if crowdsale is finalized', async function () {      
      await this.crowdsale.finalize({from : adminWallet});
      await this.crowdsale.setRate(3, {from : adminWallet}).should.be.rejectedWith(EVMThrow);
    })   

   it('mincap cannot be changed if crowdsale is finalized', async function () {      
      await this.crowdsale.finalize({from : adminWallet});
      await this.crowdsale.updateMinimumAmountToInvest(web3.toWei(5, "ether"), {from : adminWallet}).should.be.rejectedWith(EVMThrow);
    })   

   it('transaction cannot be done if crowdsale is finalized', async function () {      
      await this.crowdsale.finalize({from : adminWallet});
      await this.crowdsale.buyTokens(investor3Wallet, {value:value, from: investor3Wallet}).should.be.rejectedWith(EVMThrow);
    })   

   it('transaction cannot be done if crowdsale is finalized but can do if unfinalized', async function () {      
      await this.crowdsale.finalize({from : adminWallet});
      await this.crowdsale.buyTokens(investor3Wallet, {value:value, from: investor3Wallet}).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.unfinalize({from : adminWallet});
      await this.crowdsale.buyTokens(investor3Wallet, {value:value, from: investor3Wallet});
    })
  })  

  
  describe('admin issuing god token in pre crowsale', function () {
    
   it('portfolio can issue tokens by sending ethers from ', async function () {      
      
      await this.crowdsale.buyTokens(investor3Wallet, {value:value, from: adminWallet});
      var tokensIssued = await this.token.balanceOf(investor3Wallet);
      tokensIssued.should.be.bignumber.equal(value.minus(value.mul(0.05)).mul(this.rate));
    })
  })
});