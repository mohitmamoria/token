pragma solidity ^0.4.11;

import "./AuthenticationManager.sol";
import "./GODToken.sol";
import "./SafeMath.sol";

contract GODTokenCrowdsale {
    using SafeMath for uint256;
    
    /* Defines whether or not ICO phase is finalized */
    bool public isFinalized = false;

    /* Defines whether or not the GOD Token Contract address has yet been set.  */
    bool godTokenContractDefined = false;
    
    /* Defines the sale price during ICO */
    uint256 rate = 2;

    /* Defines the sale price during ICO */
    uint256 minimumAmountToInvest = 3.5 ether;

    /* Defines our interface to the GOD Token contract. */
    GODToken godToken;

    /* Defines the admin contract we interface with for credentails. */
    AuthenticationManager authenticationManager;

    /* Defines the time that the ICO starts. */
    uint256 constant icoStartTime = 1501545600; // August 1st 2017 at 00:00:00 UTC

    /* Ensures that once the ICO is over this contract cannot be used until the point it is destructed. */
    modifier onlyDuringIco {
        bool contractValid = godTokenContractDefined && !godToken.isClosed();
        if (!contractValid || isFinalized) throw;
        _;
    }

    /* This modifier allows a method to only be called by current admins */
    modifier adminOnly {
        if (!authenticationManager.isCurrentAdmin(msg.sender)) throw;
        _;
    }

    /* Create the GOD token crowdsale and define the address of the main authentication Manager address. */
    function GODTokenCrowdsale(address _authenticationManagerAddress) {        
                
        if (now < icoStartTime)
            throw;

        /* Setup access to our other contracts and validate their versions */
        authenticationManager = AuthenticationManager(_authenticationManagerAddress);
        if (authenticationManager.contractVersion() != 100201707171503)
            throw;
    }

    /* Set the GODToken contract address as a one-time operation.  This happens after all the contracts are created and no
       other functionality can be used until this is set. */
    function setGodTokenContractAddress(address _godTokenContractAddress) adminOnly {
        /* This can only happen once in the lifetime of this contract */
        if (godTokenContractDefined)
            throw;

        /* Setup access to our other contracts and validate their versions */
        godToken = GODToken(_godTokenContractAddress);
        if (godToken.contractVersion() != 500201707171440)
            throw;
        godTokenContractDefined = true;
    }

    /* Gets the contract version for validation */
    function contractVersion() constant returns(uint256) {
        /* ICO contract identifies as 300YYYYMMDDHHMM */
        return 300201707171440;
    }

    /* Redeem the ethers by admin */
    function withdrawEthers() adminOnly onlyDuringIco {        
       
        // Withdraw funds to the caller
        if (!msg.sender.send(this.balance))
            throw;
    }
        
     // fallback function can be used to buy tokens
      function () onlyDuringIco payable {
        buyTokens(msg.sender);
      }



    /* Handle receiving ether in ICO phase - we work out how much the user has bought, allocate a suitable balance and send their change */
    function buyTokens(address beneficiary) onlyDuringIco payable {
        // Forbid funding outside of ICO
        if (now < icoStartTime) throw;
        if (isFinalized) throw;
        require(beneficiary != 0x0);
        require(msg.value >= minimumAmountToInvest);
        require(validPurchase());

        uint256 weiAmount = msg.value;

        uint256 tokensPurchased = weiAmount.mul(rate);

        uint256 purchaseTotalPrice = tokensPurchased.div(rate);
        uint256 change = weiAmount.sub(purchaseTotalPrice);
        
        /* Increase their new balance if they actually purchased any */
        if (tokensPurchased > 0)
            godToken.mintTokens(beneficiary, tokensPurchased);

        /* Send change back to recipient */
        if (change > 0 && !beneficiary.send(change))
            throw;
    }

    function refund(address beneficiary, uint256 tokenCount) adminOnly {
        godToken.destroyTokens(beneficiary, tokenCount);
    }

    // @return true if the transaction can buy tokens
    function validPurchase() internal constant returns (bool) {

        bool nonZeroPurchase = msg.value != 0;
        return nonZeroPurchase;
    }

    /* Finalizes the ico : make ico to unoperational state */
    function finalize() external adminOnly onlyDuringIco {
        isFinalized = true;
    }

    /* Unfinalizes the ico : make ico in operational state */
    function unfinalize() external adminOnly {
        isFinalized = false;
    } 
    
    /* Updated minimum amount to invest */
    function updateMinimumAmountToInvest(uint256 amount) external adminOnly onlyDuringIco {
        minimumAmountToInvest = amount;
    }

    /* Sets the rate of god token */
    function setRate(uint256 _rate) external adminOnly onlyDuringIco {
        rate = _rate;
    }
}