pragma solidity ^0.4.18;


contract TokenSaleConfig  {
    uint public constant EXA = 10 ** 18;

    uint256 public constant PUBLIC_START_TIME         = 1515542400; //Wed, 10 Jan 2018 00:00:00 +0000
    uint256 public constant END_TIME                  = 1518220800; //Sat, 10 Feb 2018 00:00:00 +0000
    uint256 public constant CONTRIBUTION_MIN          = 0.1 ether;
    uint256 public constant CONTRIBUTION_MAX          = 2500.0 ether;

    uint256 public constant COMPANY_ALLOCATION        = 40 * 10 ** 6 * EXA; //40 million;

    Tranche[4] public tranches;

    struct Tranche {
        // How long this tranche will be active
        uint untilToken;

        // How many tokens per ether you will get while this tranche is active
        uint tokensPerEther;
    }

    function TokenSaleConfig()
        public
    {
        tranches[0] = Tranche({untilToken : 5000000 * EXA, tokensPerEther : 1554});
        tranches[1] = Tranche({untilToken : 10000000 * EXA, tokensPerEther : 1178});
        tranches[2] = Tranche({untilToken : 20000000 * EXA, tokensPerEther : 1000});
        tranches[3] = Tranche({untilToken : 60000000, tokensPerEther : 740});
    }
}