//TAKEN from "https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/truffle-config.js"
const HDWalletProvider = require('truffle-hdwallet-provider');

const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
    new HDWalletProvider(mnemonic, rpcEndpoint);

const infuraProvider = network => {
    return providerWithMnemonic(
        process.env.MNEMONIC || '',
        `https://${network}.infura.io/${process.env.INFURA_API_KEY}`
    );
};

const ropstenProvider = process.env.SOLIDITY_COVERAGE
    ? undefined
    : infuraProvider('ropsten');

module.exports = {
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    networks: {
        development: {
            host:       'localhost',
            port:       8500,
            network_id: '*', // Match any network id

        },

        coverage:    {
            host:       'localhost',
            port:       8500,
            network_id: '*', // Match any network id
            gas:        0xfffffffffff,
            gasPrice:   0x01

        },
        ropsten:     {
            provider:   ropstenProvider,
            network_id: 3,
            gas: 500000
        }
    },
    mocha:    {
        useColors: true
    }
};