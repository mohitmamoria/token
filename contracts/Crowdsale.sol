// pragma solidity ^0.4.11;
pragma solidity ^0.4.0;
import './token/MintableToken.sol';
import './math/SafeMath.sol';
import "./oraclizeAPI.sol";
/**
 * @title Crowdsale 
 * @dev Crowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end block, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a portfolioWallet 
 * as they arrive.
 */

contract Crowdsale is usingOraclize {
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

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */ 
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function Crowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _rate, address _portfolioWallet, address _adminWallet) {
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
    minimumAmountToInvest = 10;

    // updateRate();
  }

  // creates the token to be sold. 
  // override this method to have crowdsale of a specific mintable token.
  function createTokenContract() internal returns (MintableToken) {
    return new MintableToken();
  }


  // fallback function can be used to buy tokens
  function () payable {
    if (isFinalized) throw;
    buyTokens(msg.sender);
  }

  function fund() payable returns(bool success) {
  }

  // low level token purchase function
  function buyTokens(address beneficiary) payable {
    require(beneficiary != 0x0);
    require(msg.value > minimumAmountToInvest);
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
    uint256 adminAccount = weiAmount.mul(5).div(100);
    uint256 portfolioAccount = weiAmount.sub(adminAccount);

    portfolioWallet.transfer(portfolioAccount);
    adminWallet.transfer(adminAccount);
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
    if (msg.sender != adminWallet) throw;

    rate = _rate;
  }
}
