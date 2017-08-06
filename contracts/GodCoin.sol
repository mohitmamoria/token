pragma solidity ^0.4.11;

import './token/MintableToken.sol';

contract GodCoin is MintableToken {
  string public name = "GOD COIN";
  string public symbol = "GOD";
  uint256 public decimals = 18;
}