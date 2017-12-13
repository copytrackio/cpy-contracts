pragma solidity ^0.4.18;


import 'zeppelin-solidity/contracts/token/StandardToken.sol';

//
// CPYToken is a standard ERC20 token with additional functionality:
// - tokenSaleContract receives the whole balance for distribution
// - Tokens are only transferable by the tokenSaleContract until finalization
// - Token holders can burn their tokens after finalization
//
contract Token is StandardToken {

    string  public constant name   = "COPYTRACK Token";
    string  public constant symbol = "CPY";

    uint8 public constant   decimals = 18;

    uint256 constant EXA       = 10 ** 18;
    uint256 public totalSupply = 100 * 10 ** 6 * EXA;

    bool public finalized = false;

    address public tokenSaleContract;

    //
    // EVENTS
    //
    event Finalized();

    event Burnt(address indexed _from, uint256 _amount);


    // Initialize the token with the tokenSaleContract and transfer the whole balance to it
    function Token(address _tokenSaleContract)
        public
    {
        // Make sure address is set
        require(_tokenSaleContract != 0);

        balances[_tokenSaleContract] = totalSupply;

        tokenSaleContract = _tokenSaleContract;
    }


    // Implementation of the standard transfer method that takes the finalize flag into account
    function transfer(address _to, uint256 _value)
        public
        returns (bool success)
    {
        checkTransferAllowed(msg.sender);

        return super.transfer(_to, _value);
    }


    // Implementation of the standard transferFrom method that takes into account the finalize flag
    function transferFrom(address _from, address _to, uint256 _value)
        public
        returns (bool success)
    {
        checkTransferAllowed(msg.sender);

        return super.transferFrom(_from, _to, _value);
    }


    function checkTransferAllowed(address _sender)
        private
        view
    {
        if (finalized) {
            // Every token holder should be allowed to transfer tokens once token was finalized
            return;
        }

        // Only allow tokenSaleContract to transfer tokens before finalization
        require(_sender == tokenSaleContract);
    }


    // Finalize method marks the point where token transfers are finally allowed for everybody
    function finalize()
        external
        returns (bool success)
    {
        require(!finalized);
        require(msg.sender == tokenSaleContract);

        finalized = true;

        Finalized();

        return true;
    }


    // Implement a burn function to permit msg.sender to reduce its balance which also reduces totalSupply
    function burn(uint256 _value)
        public
        returns (bool success)
    {
        require(finalized);
        require(_value <= balances[msg.sender]);

        balances[msg.sender] = balances[msg.sender].sub(_value);
        totalSupply = totalSupply.sub(_value);

        Burnt(msg.sender, _value);

        return true;
    }
}
