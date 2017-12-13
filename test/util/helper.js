const expect = require('chai')
    .use(require('chai-bignumber')(web3.BigNumber))
    .expect;

async function getBalanceInEther(address) {
    return await web3.fromWei(web3.eth.getBalance(address), 'ether');
}


async function buyTokens(tokenSaleInstance, buyer, etherAmount) {
    return await web3.eth.sendTransaction({
        from:  buyer,
        to:    tokenSaleInstance.address,
        value: web3.toWei(etherAmount, 'ether'),
        gas:   150000
    });
}


async function getBalanceInToken(tokenInstance, address) {
    return web3.fromWei(await tokenInstance.balanceOf(address), 'ether');
}

async function expectTokenBalance(tokenInstance, address, expectedBalance, message) {
    let balance = await getBalanceInToken(tokenInstance, address);

    expect(balance, message).to.be.bignumber.equal(expectedBalance);
}

async function expectZeroTokenBalance(tokenInstance, address) {
    let balance = await tokenInstance.balanceOf(address);

    expect(balance).to.be.bignumber.to.be.equal(0);
}


async function expectRevert(fn, message = 'Expected call to be reverted') {
    try {
        await fn();
        expect.fail('The function executed when it should not have.');
    } catch (e) {
        if (e.actual !== undefined) {
            expect(e.actual, message).match(/revert/);
        } else {
            expect(e.message, message).match(/revert/);
        }
    }
}


module.exports = {
    getBalanceInToken: getBalanceInToken,
    getBalanceInEther: getBalanceInEther,
    buyTokens:         buyTokens,
    expectRevert:      expectRevert,


    expectZeroTokenBalance: expectZeroTokenBalance,
    expectTokenBalance:     expectTokenBalance
};