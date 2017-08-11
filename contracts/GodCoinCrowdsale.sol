pragma solidity ^0.4.11;

import './GodCoin.sol';
import './Crowdsale.sol';


contract GodCoinCrowdsale is Crowdsale {

  function GodCoinCrowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _rate, address _portfolioWallet, address _adminWallet) Crowdsale(_startBlock, _endBlock, _rate, _portfolioWallet, _adminWallet) {
  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific MintableToken token.
  function createTokenContract() internal returns (MintableToken) {
    return new GodCoin();
  }

}
