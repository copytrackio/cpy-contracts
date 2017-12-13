module.exports = {
    port: 8500,
    testCommand: 'node --max-old-space-size=4096  ../node_modules/.bin/truffle test --network coverage',
    copyPackages: ['zeppelin-solidity'],
    norpc: true,
};