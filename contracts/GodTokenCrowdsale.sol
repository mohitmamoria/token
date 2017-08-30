pragma solidity ^0.4.11;

import './GodToken.sol';
import './Crowdsale.sol';


contract GodTokenCrowdsale is Crowdsale {

  function GodTokenCrowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _rate, address _portfolioWallet, address _adminWallet) Crowdsale(_startBlock, _endBlock, _rate, _portfolioWallet, _adminWallet) {
  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific MintableToken token.
  function createTokenContract() internal returns (MintableToken) {
    return new GodToken();
  }

}
