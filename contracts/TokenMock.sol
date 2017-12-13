pragma solidity ^0.4.18;


import './Token.sol';


contract TokenMock is Token {

    function TokenMock(address _fundingWalletAddress)
    public
    Token(_fundingWalletAddress) {
    }

    function setFinalized(bool _finalized)
    public
    {
        finalized = _finalized;
    }
}

