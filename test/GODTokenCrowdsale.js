var AuthenticationManager = artifacts.require("./AuthenticationManager.sol");
var GODTokenCrowdsale = artifacts.require("./GODTokenCrowdsale.sol");
var GODToken = artifacts.require("./GODToken.sol");
var DividendManager = artifacts.require("./DividendManager.sol");
var TransparencyRelayer = artifacts.require("./TransparencyRelayer.sol");

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('AuthenticationManager', function ([adminWallet, guestWallet1, guestWallet2, guestWallet3, guestWallet4, guestWallet5, guestWallet6, guestWallet7, guestWallet8]) {
  
  const value = new BigNumber(web3.toWei(4, 'ether'));
  const EVMThrow = 'invalid opcode';

  beforeEach(async function () {
    this.rate = 2;
    this.minimumCap = new web3.BigNumber(web3.toWei(3.5, "ether"));
    this.authenticationManager = await AuthenticationManager.new();

    this.godTokenCrowdsale = await GODTokenCrowdsale.new(this.authenticationManager.address);
    this.godToken = await GODToken.new(this.godTokenCrowdsale.address, this.authenticationManager.address);
    this.dividentManager = await DividendManager.new(this.godToken.address);
    this.transparencyRelayer = await TransparencyRelayer.new(this.authenticationManager.address);

    await this.godTokenCrowdsale.setGodTokenContractAddress(this.godToken.address);
    await this.authenticationManager.addAccountReader(this.dividentManager.address);
    await this.authenticationManager.addAccountReader(this.godTokenCrowdsale.address);
  });
  	describe('authentication manager', function () {
		it('check if curent admin is the one who created it', async function () {
			var isCurrentAdmin = await this.authenticationManager.isCurrentAdmin(adminWallet);
			isCurrentAdmin.should.be.equal(true);
     	})

     	it('check if curent admin is not any guest', async function () {
			var isCurrentAdmin = await this.authenticationManager.isCurrentAdmin(guestWallet2);
			isCurrentAdmin.should.be.equal(false);
     	})
		
		it('check if dividentManager is the account reader bcoz we have defined it in constructor', async function () {
			var isCurrentAccountReader = await this.authenticationManager.isCurrentAccountReader(this.dividentManager.address);
			isCurrentAccountReader.should.be.equal(true);
     	})

		it('check if accountreader is not any guest', async function () {
			var isCurrentAccountReader = await this.authenticationManager.isCurrentAccountReader(guestWallet2);
			isCurrentAccountReader.should.be.equal(false);
     	})

		it('add an admin and it is done by admin and now this new admin is verified by isCurrentAdmin', async function () {
			await this.authenticationManager.addAdmin(guestWallet2, {from:adminWallet});
			var isCurrentAdmin = await this.authenticationManager.isCurrentAdmin(guestWallet2);
			isCurrentAdmin.should.be.equal(true);
     	})

		it('admin cannot be removed as admin', async function () {
			await this.authenticationManager.removeAdmin(adminWallet, {from:adminWallet}).should.be.rejectedWith(EVMThrow);
     	})

     	it('add an admin and it is done by guest - it failed', async function () {
			await this.authenticationManager.addAdmin(guestWallet2, {from:guestWallet3}).should.be.rejectedWith(EVMThrow);
			var isCurrentAdmin = await this.authenticationManager.isCurrentAdmin(guestWallet2);
			isCurrentAdmin.should.be.equal(false);
     	})

     	it('if already admin cannot add as admin again', async function () {
			await this.authenticationManager.addAdmin(guestWallet2, {from:adminWallet});
			var isCurrentAdmin = await this.authenticationManager.isCurrentAdmin(guestWallet2);
			isCurrentAdmin.should.be.equal(true);
			await this.authenticationManager.addAdmin(guestWallet2, {from:adminWallet}).should.be.rejectedWith(EVMThrow)
     	})

     	it('owner cannot be added as an admin again', async function () {
			await this.authenticationManager.addAdmin(adminWallet, {from:adminWallet}).should.be.rejectedWith(EVMThrow);
     	})

     	it('add an admin and now this new admin is verified by isCurrentAdmin and then remove it and now its not a current admin anymore but is in current and past admin', async function () {
			var isGuestAnAdmin = await this.authenticationManager.isCurrentAdmin(guestWallet2);
			isGuestAnAdmin.should.be.equal(false);

			await this.authenticationManager.addAdmin(guestWallet2, {from:adminWallet});
			
			var isGuestAnAdminNow = await this.authenticationManager.isCurrentAdmin(guestWallet2);
			isGuestAnAdminNow.should.be.equal(true);

			await this.authenticationManager.removeAdmin(guestWallet2, {from:adminWallet});
			
			var isGuestAnAdminNowAfterRemovedAsAdmin = await this.authenticationManager.isCurrentAdmin(guestWallet2);
			isGuestAnAdminNowAfterRemovedAsAdmin.should.be.equal(false);

			var isGuestACurrentOrPastAdmin = await this.authenticationManager.isCurrentOrPastAdmin(guestWallet2);
			isGuestACurrentOrPastAdmin.should.be.equal(true);
     	})

     	it('add an account reader and now this new account reader is verified by isCurrentAccountReader and then remove it and now its not a current accountreader anymore but is in current and past AccountReader', async function () {
			var isGuestAnAccountReader = await this.authenticationManager.isCurrentAccountReader(guestWallet2);
			isGuestAnAccountReader.should.be.equal(false);

			await this.authenticationManager.addAccountReader(guestWallet2, {from:adminWallet});
			
			var isGuestAnAccountReaderNow = await this.authenticationManager.isCurrentAccountReader(guestWallet2);
			isGuestAnAccountReaderNow.should.be.equal(true);

			await this.authenticationManager.removeAccountReader(guestWallet2, {from:adminWallet});
			
			var isGuestAnAccountReaderNowAfterRemovedAsAccountReader = await this.authenticationManager.isCurrentAccountReader(guestWallet2);
			isGuestAnAccountReaderNowAfterRemovedAsAccountReader.should.be.equal(false);

			var isGuestACurrentOrPastAccountReader = await this.authenticationManager.isCurrentOrPastAccountReader(guestWallet2);
			isGuestACurrentOrPastAccountReader.should.be.equal(true);
     	})
	})
describe('God Token Crowdsale', function () {
   it('transferring ethers at the time of presale', async function () {
      await this.godTokenCrowdsale.buyTokens(guestWallet1, {value:value, from: adminWallet});
      var tokensIssued = await this.godToken.balanceOf(guestWallet1);
      tokensIssued.should.be.bignumber.equal(value.mul(this.rate));
    })

	it('setGodTokenContractAddress cannot be set again it already set, in our case we have set it in constructor', async function () {
		 await this.godTokenCrowdsale.setGodTokenContractAddress(guestWallet3).should.be.rejectedWith(EVMThrow)
    })	


	it('at the time of payment investor\'money is transferred to godtokencrowdsale contract', async function(){
       const preContractBalance = web3.eth.getBalance(this.godTokenCrowdsale.address)
       await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet1})
       const postContractBalance = web3.eth.getBalance(this.godTokenCrowdsale.address)
      
		postContractBalance.minus(preContractBalance).should.be.bignumber.equal(value);
	})

	it('after payment investors are issued godtokens as per current rate', async function(){

      var tokensIssuedBefore = await this.godToken.balanceOf(guestWallet1);
		tokensIssuedBefore.should.be.bignumber.equal(0);	
		 await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet1})
		var tokensIssuedAfter = await this.godToken.balanceOf(guestWallet1);

		 tokensIssuedAfter.should.be.bignumber.equal(value.mul(this.rate));
	})

	it('admin can withdraw ethers', async function () {
        await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet1})
        await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2})
        await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet3})

        const preWithdrawlBalanceOfAdmin = web3.eth.getBalance(adminWallet)
		const preWithdrawlBalanceOfContract = web3.eth.getBalance(this.godTokenCrowdsale.address)

		
		await this.godTokenCrowdsale.withdrawEthers({from:adminWallet})
		const postWithdrawlBalanceOfAdmin = web3.eth.getBalance(adminWallet)
		const postWithdrawlBalanceOfContract = web3.eth.getBalance(this.godTokenCrowdsale.address)
				
		postWithdrawlBalanceOfContract.toNumber().should.be.equal(0)
    })

	it('failed when guest try to withdraw ethers from the contract', async function () {
        await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet1})
        await this.godTokenCrowdsale.withdrawEthers({from:guestWallet1}).should.be.rejectedWith(EVMThrow);
     })

	it('crowdsale finalize is done by admin', async function () {
		await this.godTokenCrowdsale.finalize({from: adminWallet})
     })

	it('crowdsale finalize cannot be done by guest', async function () {
        await this.godTokenCrowdsale.finalize({from:guestWallet1}).should.be.rejectedWith(EVMThrow);
    })

	it('when finalized payment cannot be done ', async function () {
		await this.godTokenCrowdsale.finalize({from: adminWallet})
        await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2}).should.be.rejectedWith(EVMThrow);
     })

	it('when finalized minimumCap cannot be changed ', async function () {
		await this.godTokenCrowdsale.finalize({from: adminWallet})
		var newCap = new web3.BigNumber(web3.toWei(5, "ether"));
		await this.godTokenCrowdsale.updateMinimumAmountToInvest(newCap, {from: adminWallet}).should.be.rejectedWith(EVMThrow);
     })

	it('when finalized rate cannot be updated', async function () {
		await this.godTokenCrowdsale.finalize({from: adminWallet})
		var newRate = 3;
		await this.godTokenCrowdsale.setRate(newRate, {from: adminWallet}).should.be.rejectedWith(EVMThrow);
     })

	it('when unfinalized payment can be done again', async function () {
		await this.godTokenCrowdsale.finalize({from: adminWallet})
		await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2}).should.be.rejectedWith(EVMThrow);
		await this.godTokenCrowdsale.unfinalize({from: adminWallet})
		await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2})
     })

	it('setting new rate is done by admin', async function () {
		var newRate = 3;
		await this.godTokenCrowdsale.setRate(newRate, {from: adminWallet})
     })

	it('setting new rate generated tokens as per new rate', async function () {
		var newRate = 3;
		await this.godTokenCrowdsale.setRate(newRate, {from: adminWallet})
		await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet1})
		var tokensIssuedAfter = await this.godToken.balanceOf(guestWallet1);
		tokensIssuedAfter.should.be.bignumber.equal(value.mul(newRate));
     })

	it('update of minimumCap can only be done by admin and minimum ethers to send is increased', async function () {
		var newCap = new web3.BigNumber(web3.toWei(5, "ether"));
		await this.godTokenCrowdsale.updateMinimumAmountToInvest(newCap, {from: guestWallet1}).should.be.rejectedWith(EVMThrow);
		await this.godTokenCrowdsale.updateMinimumAmountToInvest(newCap, {from: adminWallet})
		await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2}).should.be.rejectedWith(EVMThrow);
		await this.godTokenCrowdsale.sendTransaction({value: newCap, from: guestWallet2});

     })

	it('refund decreases no of tokens issued', async function () {
		await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2});
		const godtokenBefore = await this.godToken.balanceOf(guestWallet2);
		await this.godTokenCrowdsale.refund(guestWallet2, 5, {from:adminWallet});
		const godTokenAfter = await this.godToken.balanceOf(guestWallet2);
    })
})
  
   describe('god token', function () {
    it('destroyToken when refund is called will decrease the totalSupply', async function () {      
      	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2});
      	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet3});
		const totalSupplyBeforeRefund = await this.godToken.totalSupply();
		const tokenOFWallet2 = await this.godToken.balanceOf(guestWallet2);
		const tokenOFWallet3 = await this.godToken.balanceOf(guestWallet3);
		
		var totalSupplyBefore = totalSupplyBeforeRefund.toNumber()
		var SumBefore = tokenOFWallet2.plus(tokenOFWallet3).toNumber()
		totalSupplyBefore.should.be.equal(SumBefore)
		
		await this.godTokenCrowdsale.refund(guestWallet2, web3.toWei(1, "ether"), {from:adminWallet});
		await this.godTokenCrowdsale.refund(guestWallet3, web3.toWei(2, "ether"), {from:adminWallet});
		const tokenOFWallet2AfterRefund = await this.godToken.balanceOf(guestWallet2);
		const tokenOFWallet3AfterRefund = await this.godToken.balanceOf(guestWallet3);

		tokenOFWallet3.minus(tokenOFWallet3AfterRefund).should.be.bignumber.equal(web3.toWei(2, "ether"))
		tokenOFWallet2.minus(tokenOFWallet2AfterRefund).should.be.bignumber.equal(web3.toWei(1, "ether"))
		const totalSupplyAfterRefund = await this.godToken.totalSupply();
		
		var totalSupplyAfter = totalSupplyAfterRefund.toNumber()
		var SumAfter = tokenOFWallet3AfterRefund.plus(tokenOFWallet2AfterRefund).toNumber()
		totalSupplyAfter.should.be.equal(SumAfter)
     })

    it('by minting tokens, total supply increases, token holder is added and balance of token holder is increased', async function () {      

		const totalSupplyBefore = await this.godToken.totalSupply();
      	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2});
		const totalSupplyAfter = await this.godToken.totalSupply();

		var tokensGenerated = value.mul(this.rate)
		var supplyDiff = totalSupplyAfter.minus(totalSupplyBefore).toNumber()
		supplyDiff.should.be.equal(tokensGenerated.toNumber())

		const tokenOFGuest = await this.godToken.balanceOf(guestWallet2);
		tokensGenerated.toNumber().should.be.equal(tokenOFGuest.toNumber())
     })

    it('account reader can see count and list of token holders ', async function () {      

    	await this.authenticationManager.addAccountReader(guestWallet2, {from:adminWallet});
    	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2});
    	var tokenHolderCount = await this.godToken.tokenHolderCount({from:guestWallet2});
    	var count = tokenHolderCount.toNumber();
    	count.should.be.equal(1)

    	var tokenHolder = await this.godToken.tokenHolder(0, {from:guestWallet2});

    	tokenHolder.should.be.equal(guestWallet2);
     })


  	it('test to transfer tokens one to another account', async function () {

    	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2});
    	var balanceOfGuest2 = await this.godToken.balanceOf(guestWallet2);
    	var balanceOfGuest3 = await this.godToken.balanceOf(guestWallet3);

    	await this.godToken.transfer(guestWallet3, value, {from : guestWallet2});

    	var balanceOfGuest2AfterTransfer = await this.godToken.balanceOf(guestWallet2);
    	var balanceOfGuest3AfterTransfer = await this.godToken.balanceOf(guestWallet3);
    	var guest3BalanceInNumber = balanceOfGuest3AfterTransfer.toNumber()
    	guest3BalanceInNumber.should.be.equal(value.toNumber());
     })


    it('add allowance and transfer tokens from one account to another', async function () {
    	var balanceOfGuest3 = await this.godToken.balanceOf(guestWallet3);
    	var balanceOfGuest3InNumber = balanceOfGuest3.toNumber();
    	balanceOfGuest3InNumber.should.be.equal(0);

    	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2});
    	var balanceOfGuest2 = await this.godToken.balanceOf(guestWallet2);
    	var balanceOfGuest2InNumber = balanceOfGuest2.toNumber();
    	balanceOfGuest2InNumber.should.be.equal(value.mul(this.rate).toNumber())

    	this.godToken.approve(guestWallet3, value, {from: guestWallet2});

    	// transfering allowance of wallet 3 to wallet 4
    	await this.godToken.transferFrom(guestWallet2, guestWallet4, value, {from: guestWallet3});

    	// getting balance of guest 3
		var balanceOfGuest3 = await this.godToken.balanceOf(guestWallet3);
    	var balanceOfGuest3InNumber = balanceOfGuest3.toNumber();
    	// balance of guest 3 is still 0
    	balanceOfGuest3InNumber.should.be.equal(0);


    	// getting balance of guest 4
		var balanceOfGuest4 = await this.godToken.balanceOf(guestWallet4);
    	var balanceOfGuest4InNumber = balanceOfGuest4.toNumber();

    	// balance of guest 4 has been increased
    	balanceOfGuest4InNumber.should.be.equal(value.toNumber());
     })
   })

   describe('divident manager', function () {

		it('divident is paid to proportionally to all token holders', async function () {
	    	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet2});
	    	await this.godTokenCrowdsale.sendTransaction({value: value, from: guestWallet3});
	    	await this.dividentManager.sendTransaction({value: value.mul(10), from : guestWallet8})
	    	dividentOfGuestWallet2 = await this.dividentManager.dividends(guestWallet2)
	    	await this.dividentManager.withdrawDividend({from: guestWallet2});
	    	dividentOfGuestWallet2AfterWithdrawl = await this.dividentManager.dividends(guestWallet2)
	    	dividentOfGuestWallet2AfterWithdrawlInNumber = dividentOfGuestWallet2AfterWithdrawl.toNumber()
	    	dividentOfGuestWallet2AfterWithdrawlInNumber.should.be.equal(0)
     	})
	})

});

/*

// area of impovement
1. should we add LogFinalize and LogUnfinalize in TransparencyRelay ?
2. Check again documentation of ERC20 tokens

*/