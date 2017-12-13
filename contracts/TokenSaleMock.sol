pragma solidity ^0.4.18;


import './TokenSale.sol';


contract TokenSaleMock is TokenSale {

    uint256 public _now;
    bool public _tokensLeftSet;
    uint256 public _tokensLeft;

    function TokenSaleMock(address _fundingWalletAddress)
        public
    TokenSale(_fundingWalletAddress) {
        _now = now;
    }

    function setTokensLeft(uint256 tokens)
        public
    {
        _tokensLeftSet = true;
        _tokensLeft = tokens;
    }

    function getTokensLeft()
        public
        view
    returns (uint256 tokensLeft)
    {
        if (_tokensLeftSet) {
            return _tokensLeft;
        }

        return super.getTokensLeft();
    }


    function setTotalTokenSold(uint256 tokens)
        public
    {
        totalTokenSold = tokens;
    }

    function currentTime()
        public
        view
    returns (uint256)
    {
        return _now;
    }

    function changeTime(uint256 _newTime)
        public
        onlyOwner
    returns (bool)
    {
        _now = _newTime;
    }

    function setFinalized(bool _finalized)
        public
    {
        finalized = _finalized;
    }

}

