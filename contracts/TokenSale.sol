pragma solidity ^0.4.18;


import './Token.sol';
import './TokenSaleConfig.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract TokenSale is TokenSaleConfig, Ownable {
    using SafeMath for uint;

    Token  public  tokenContract;

    // We keep track of whether the sale has been finalized, at which point
    // no additional contributions will be permitted.
    bool public finalized = false;

    // lookup for max wei amount per user allowed
    mapping (address => uint256) public contributors;

    // the total amount of wei raised
    uint256 public totalWeiRaised = 0;

    // the total amount of token raised
    uint256 public totalTokenSold = 0;

    // address where funds are collected
    address public fundingWalletAddress;

    // address which manages the whitelist (KYC)
    mapping (address => bool) public whitelistOperators;

    // lookup addresses for whitelist
    mapping (address => bool) public whitelist;


    // early bird investments
    address[] public earlyBirds;

    mapping (address => uint256) public earlyBirdInvestments;


    //
    // MODIFIERS
    //

    // Throws if purchase would exceed the min max contribution.
    // @param _contribute address
    // @param _weiAmount the amount intended to spend
    modifier withinContributionLimits(address _contributorAddress, uint256 _weiAmount) {
        uint256 totalContributionAmount = contributors[_contributorAddress].add(_weiAmount);
        require(_weiAmount >= CONTRIBUTION_MIN);
        require(totalContributionAmount <= CONTRIBUTION_MAX);
        _;
    }

    // Throws if called by any account not on the whitelist.
    // @param _address Address which should execute the function
    modifier onlyWhitelisted(address _address) {
        require(whitelist[_address] == true);
        _;
    }

    // Throws if called by any account not on the whitelistOperators list
    modifier onlyWhitelistOperator()
    {
        require(whitelistOperators[msg.sender] == true);
        _;
    }

    //Throws if sale is finalized or token sale end time has been reached
    modifier onlyDuringSale() {
        require(finalized == false);
        require(currentTime() <= END_TIME);
        _;
    }

    //Throws if sale is finalized
    modifier onlyAfterFinalized() {
        require(finalized);
        _;
    }



    //
    // EVENTS
    //
    event LogWhitelistUpdated(address indexed _account);

    event LogTokensPurchased(address indexed _account, uint256 _cost, uint256 _tokens, uint256 _totalTokenSold);

    event UnsoldTokensBurnt(uint256 _amount);

    event Finalized();

    // Initialize a new TokenSale contract
    // @param _fundingWalletAddress Address which all ether will be forwarded to
    function TokenSale(address _fundingWalletAddress)
        public
    {
        //make sure _fundingWalletAddress is set
        require(_fundingWalletAddress != 0);

        fundingWalletAddress = _fundingWalletAddress;
    }

    // Connect a token to the tokenSale
    // @param _fundingWalletAddress Address which all ether will be forwarded to
    function connectToken(Token _tokenContract)
        external
        onlyOwner
    {
        require(totalTokenSold == 0);
        require(tokenContract == address(0));

        //make sure token is untouched
        require(_tokenContract.balanceOf(address(this)) == _tokenContract.totalSupply());

        tokenContract = _tokenContract;

        // sent tokens to company vault
        tokenContract.transfer(fundingWalletAddress, COMPANY_ALLOCATION);
        processEarlyBirds();
    }

    function()
        external
        payable
    {
        uint256 cost = buyTokens(msg.sender, msg.value);

        // forward contribution to the fundingWalletAddress
        fundingWalletAddress.transfer(cost);
    }

    // execution of the actual token purchase
    function buyTokens(address contributorAddress, uint256 weiAmount)
        onlyDuringSale
        onlyWhitelisted(contributorAddress)
        withinContributionLimits(contributorAddress, weiAmount)
        private
    returns (uint256 costs)
    {
        assert(tokenContract != address(0));

        uint256 tokensLeft = getTokensLeft();

        // make sure we still have tokens left for sale
        require(tokensLeft > 0);

        uint256 tokenAmount = calculateTokenAmount(weiAmount);
        uint256 cost = weiAmount;
        uint256 refund = 0;

        // we sell till we dont have anything left
        if (tokenAmount > tokensLeft) {
            tokenAmount = tokensLeft;

            // calculate actual cost for partial amount of tokens.
            cost = tokenAmount / getCurrentTokensPerEther();

            // calculate refund for contributor.
            refund = weiAmount.sub(cost);
        }

        // transfer the tokens to the contributor address
        tokenContract.transfer(contributorAddress, tokenAmount);

        // keep track of the amount bought by the contributor
        contributors[contributorAddress] = contributors[contributorAddress].add(cost);


        //if we got a refund process it now
        if (refund > 0) {
            // transfer back everything that exceeded the amount of tokens left
            contributorAddress.transfer(refund);
        }

        // increase stats
        totalWeiRaised += cost;
        totalTokenSold += tokenAmount;

        LogTokensPurchased(contributorAddress, cost, tokenAmount, totalTokenSold);

        // If all tokens available for sale have been sold out, finalize the sale automatically.
        if (tokensLeft.sub(tokenAmount) == 0) {
            finalizeInternal();
        }


        //return the actual cost of the sale
        return cost;
    }

    // ask the connected token how many tokens we have left 
    function getTokensLeft()
        public
        view
    returns (uint256 tokensLeft)
    {
        return tokenContract.balanceOf(this);
    }

    // calculate the current tokens per ether
    function getCurrentTokensPerEther()
        public
        view
    returns (uint256 tokensPerEther)
    {
        uint i;
        uint defaultTokensPerEther = tranches[tranches.length - 1].tokensPerEther;

        if (currentTime() >= PUBLIC_START_TIME) {
            return defaultTokensPerEther;
        }

        for (i = 0; i < tranches.length; i++) {
            if (totalTokenSold >= tranches[i].untilToken) {
                continue;
            }

            //sell until the contract has nor more tokens
            return tranches[i].tokensPerEther;
        }

        return defaultTokensPerEther;
    }

    // calculate the token amount for a give weiAmount
    function calculateTokenAmount(uint256 weiAmount)
        public
        view
    returns (uint256 tokens)
    {
        return weiAmount * getCurrentTokensPerEther();
    }

    //
    // WHITELIST
    //

    // add a new whitelistOperator
    function addWhitelistOperator(address _address)
        public
        onlyOwner
    {
        whitelistOperators[_address] = true;
    }

    // remove a whitelistOperator
    function removeWhitelistOperator(address _address)
        public
        onlyOwner
    {
        require(whitelistOperators[_address]);

        delete whitelistOperators[_address];
    }


    // Allows whitelistOperators to add an account to the whitelist.
    // Only those accounts will be allowed to contribute during the sale.
    function addToWhitelist(address _address)
        public
        onlyWhitelistOperator
    {
        require(_address != address(0));

        whitelist[_address] = true;
        LogWhitelistUpdated(_address);
    }

    // Allows whitelistOperators to remove an account from the whitelist.
    function removeFromWhitelist(address _address)
        public
        onlyWhitelistOperator
    {
        require(_address != address(0));

        delete whitelist[_address];
    }

    //returns the current time, needed for tests
    function currentTime()
        public
        view
        returns (uint256 _currentTime)
    {
        return now;
    }


    // Allows the owner to finalize the sale.
    function finalize()
        external
        onlyOwner
        returns (bool)
    {
        //allow only after the defined end_time
        require(currentTime() > END_TIME);

        return finalizeInternal();
    }


    // The internal one will be called if tokens are sold out or
    // the end time for the sale is reached, in addition to being called
    // from the public version of finalize().
    function finalizeInternal() private returns (bool) {
        require(!finalized);

        finalized = true;

        Finalized();

        //also finalize the token contract
        tokenContract.finalize();

        return true;
    }

    // register an early bird investment
    function addEarlyBird(address _address, uint256 weiAmount)
        onlyOwner
        withinContributionLimits(_address, weiAmount)
        external
    {
        // only allowed as long as we dont have a connected token
        require(tokenContract == address(0));

        earlyBirds.push(_address);
        earlyBirdInvestments[_address] = weiAmount;

        // auto whitelist early bird;
        whitelist[_address] = true;
    }

    // transfer the tokens bought by the early birds before contract creation
    function processEarlyBirds()
        private
    {
        for (uint256 i = 0; i < earlyBirds.length; i++)
        {
            address earlyBirdAddress = earlyBirds[i];
            uint256 weiAmount = earlyBirdInvestments[earlyBirdAddress];

            buyTokens(earlyBirdAddress, weiAmount);
        }
    }


    // allows everyone to burn all unsold tokens in the sale contract after finalized.
    function burnUnsoldTokens()
        external
        onlyAfterFinalized
        returns (bool)
    {
        uint256 leftTokens = getTokensLeft();

        require(leftTokens > 0);

        // let'em burn
        require(tokenContract.burn(leftTokens));

        UnsoldTokensBurnt(leftTokens);

        return true;
    }
}
