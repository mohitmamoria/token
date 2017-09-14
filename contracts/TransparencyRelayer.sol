pragma solidity ^0.4.11;
import "./AuthenticationManager.sol";

/* The transparency relayer contract is responsible for keeping an immutable ledger of account balances that can be audited at a later time .*/
contract TransparencyRelayer {

    /* Represents what GOD Token administration report the fund as being worth at a snapshot moment in time. */
    struct RateValueRepresentation {
        uint256 rate;
        uint256 suppliedTimestamp;
    }

    /* Represents a published balance of a particular account at a moment in time. */
    struct AccountBalanceRepresentation {
        string accountType; 
        string accountBalance;
        string validationUrl; /* Some validation URL - i.e. base64 encoded notary */
        uint256 suppliedTimestamp;
    }

    /* An array defining all the rate values as supplied by GODToken over the time of the contract. */
    RateValueRepresentation[] public rateValues;
    
    /* An array defining the history of account balances over time. */
    AccountBalanceRepresentation[] public accountBalances;

    /* Defines the admin contract we interface with for credentails. */
    AuthenticationManager authenticationManager;

    /* Fired when the rate value is updated by an administrator. */
    event RateValue(uint256 rate, uint256 suppliedTimestamp);

    /* Fired when an account balance is being supplied in some confirmed form for future validation on the blockchain. */
    event AccountBalance(string accountType, string accountBalance, string validationUrl, uint256 timestamp);

    /* This modifier allows a method to only be called by current admins */
    modifier adminOnly {
        if (!authenticationManager.isCurrentAdmin(msg.sender)) throw;
        _;
    }

    /* Create our contract and specify the location of other addresses */
    function TransparencyRelayer(address _authenticationManagerAddress) {
        /* Setup access to our other contracts and validate their versions */
        authenticationManager = AuthenticationManager(_authenticationManagerAddress);
        if (authenticationManager.contractVersion() != 100201707171503)
            throw;
    }

    /* Gets the contract version for validation */
    function contractVersion() constant returns(uint256) {
        /* Transparency contract identifies as 200YYYYMMDDHHMM */
        return 200201707071127;
    }

    /* Returns how many rate values are present in the market. */
    function rateValueCount() constant returns (uint256 _count) {
        _count = rateValues.length;
    }

    /* Returns how account balances are present in the market.*/
    function accountBalanceCount() constant returns (uint256 _count) {
        _count = accountBalances.length;
    }

    /* Defines the current value of the rate */
    function rateValuePublish(uint256 _rate, uint256 _suppliedTimestamp) adminOnly {
        /* Store values */
        rateValues.length++;
        rateValues[rateValues.length - 1] = RateValueRepresentation(_rate, _suppliedTimestamp);

        /* Audit this */
        RateValue(_rate, _suppliedTimestamp);
    }

    function accountBalancePublish(string _accountType, string _accountBalance, string _validationUrl, uint256 _timestamp) adminOnly {

        /* Store values */
        accountBalances.length++;
        accountBalances[accountBalances.length - 1] = AccountBalanceRepresentation(_accountType, _accountBalance, _validationUrl, _timestamp);

        /* Audit this */
        AccountBalance(_accountType, _accountBalance, _validationUrl, _timestamp);
    }
}