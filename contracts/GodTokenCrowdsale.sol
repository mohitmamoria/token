pragma solidity ^0.4.11;

import './GodToken.sol';
import './Crowdsale.sol';
import './oraclizeAPI.sol';


contract GodTokenCrowdsale is Crowdsale, usingOraclize {
	using SafeMath for uint256;
  
  // The token being sold
  MintableToken public token;

  // start and end block where investments are allowed (both inclusive)
  uint256 public startBlock;
  uint256 public endBlock;

  // address where funds are collected
  address public portfolioWallet;
  address public adminWallet;

  // how many token units a buyer gets per wei
  uint256 public rate;
  bool public isFinalized;              // switched to true in operational state

  // amount of raised money in wei
  uint256 public weiRaised;
  uint256 public minimumAmountToInvest;

  // uint256 public constant adminFee =  5/100;
  event newOraclizeQuery(string description);
  event updatedRate(string rate);

  function GodTokenCrowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _rate, address _portfolioWallet, address _adminWallet, uint256 _minInvestmentCap) Crowdsale(_startBlock, _endBlock, _rate, _portfolioWallet) {
    require(_startBlock >= block.number);
    require(_endBlock >= _startBlock);
    require(_rate > 0);
    require(_portfolioWallet != 0x0);
    require(_adminWallet != 0x0);
    
    // oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);    
    
    isFinalized = false;                   //controls pre through crowdsale state
    OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);

    token                 = createTokenContract();
    startBlock            = _startBlock;
    endBlock              = _endBlock;
    rate                  = _rate;
    portfolioWallet       = _portfolioWallet;
    adminWallet           = _adminWallet;
    minimumAmountToInvest = _minInvestmentCap;  	    

  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific MintableToken token.
  function createTokenContract() internal returns (MintableToken) {
    return new GodToken();
  }


  // fallback function can be used to buy tokens
  function () payable {
    buyTokens(msg.sender);
  }

  function fund() payable returns(bool success) {
  }

  function refund(address beneficiary) payable {
    if (msg.sender != portfolioWallet) throw;

    uint256 ethersToRefund = msg.value;
    
    uint256 adminAmount = ethersToRefund.mul(5).div(100);
    uint256 investorAmount = ethersToRefund.sub(adminAmount);

    beneficiary.transfer(investorAmount);
    adminWallet.transfer(adminAmount);

    // when refund module is called
    // ethers are spent from portfoliowallet to adminWallet and beneficiaryWallet
    // ethers are calculated by the formula of no. of tokens/ rate 
    // 95% ethers are transfered to beneficiaryWallet
    // and 5% are transfered to adminWallet
    // finally delete the godtoken for that beneficiary
    token.refundBalance(beneficiary);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) payable {
    if (isFinalized) throw;
    require(beneficiary != 0x0);
    require(msg.value >= minimumAmountToInvest);
    require(validPurchase());

    uint256 weiAmount = msg.value;

    // calculate 5% of token 
    uint256 tokenToBeRemoved = weiAmount.mul(5).div(100);

    // calculate token amount to be created
    uint256 tokens = weiAmount.sub(tokenToBeRemoved);
    uint256 tokensGenerated = tokens.mul(rate);

    // update state
    weiRaised = weiRaised.add(weiAmount).sub(tokenToBeRemoved);

    token.mint(beneficiary, tokensGenerated);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokensGenerated);

    forwardFunds();
  }

  // send ether to the fund collection portfolioWallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    uint256 weiAmount = msg.value;
    uint256 adminAmount = weiAmount.mul(5).div(100);
    uint256 portfolioAmount = weiAmount.sub(adminAmount);

    portfolioWallet.transfer(portfolioAmount);
    adminWallet.transfer(adminAmount);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal constant returns (bool) {
    uint256 current = block.number;
    bool withinPeriod = current >= startBlock && current <= endBlock;
    bool nonZeroPurchase = msg.value != 0;
    return withinPeriod && nonZeroPurchase;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    return block.number > endBlock;
  }
  
  function updateRate() payable {

        if (oraclize_getPrice("URL") > this.balance) {
            newOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
        } else {
            newOraclizeQuery("Oraclize query was sent, standing by for the answer..");
            oraclize_query(60, "URL", "json(http://52.36.17.111/GOD-token-rate).rate");
        }
    }


  function __callback(bytes32 myid, string result, bytes proof) {
      if (msg.sender != oraclize_cbAddress()) throw;
      rate = parseInt(result);

      updateRate();
  }

  /// @dev Ends the funding period and sends the ETH home
  function finalize() external {
    if (isFinalized) throw;
    if (msg.sender != adminWallet) throw; // locks finalize to the ultimate ETH owner

    // move to operational
    isFinalized = true;
  }

  /// @dev Ends the funding period and sends the ETH home
  function unfinalize() external {
    if (!isFinalized) throw;
    if (msg.sender != adminWallet) throw; // locks finalize to the ultimate ETH owner

    // move to un operational
    isFinalized = false;
  }  

  /// @dev update minimum amount to invest
  function updateMinimumAmountToInvest(uint256 amount) external {
    if (isFinalized) throw;
    if (msg.sender != adminWallet) throw; // locks finalize to the ultimate ETH owner

    minimumAmountToInvest = amount;
  }


  function setRate(uint256 _rate) {
    if (isFinalized) throw;
    if (msg.sender != adminWallet) throw;

    rate = _rate;
  }
}
