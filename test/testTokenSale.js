'use strict';
const EXA  = 10 ** 18;
const MEGA = 10 ** 6;

const zeroAddress   = '0x0000000000000000000000000000000000000000';
const TokenSale     = artifacts.require('TokenSale');
const TokenSaleMock = artifacts.require('TokenSaleMock');
const Token         = artifacts.require('Token');
const TokenMock     = artifacts.require('TokenMock');
const expect        = require('chai')
    .use(require('chai-bignumber')(web3.BigNumber))
    .expect;

const helper = require('./util/helper');

const TRANCHES = {
    PRESALE_1:   1554,
    PRESALE_2:   1178,
    PRESALE_3:   1000,
    PUBLIC_SALE: 740
};

//@TODO test the functions inherited from zeppelin
contract('TokenSale', (accounts) => {
    accounts.forEach(async (address) => {
        let balance = await web3.eth.getBalance(address);
        console.log('Balance', address, web3.fromWei(balance, 'ether').valueOf());
    });
    const TOKEN_SALE_OWNER       = accounts[0],
          FUNDING_WALLET_ADDRESS = accounts[1],
          WHITELIST_OPERATOR     = accounts[2],
          BUYER1                 = accounts[3],
          BUYER2                 = accounts[4],
          EARLY_BIRD1            = accounts[5],
          EARLY_BIRD2            = accounts[6];

    describe('#constructor', () => {
        it('should throw an error if address is incorrect ', async () => {
            try {
                await TokenSale.new();
            } catch (e) {
                expect(e.message).match(/revert/);
                return true;
            }
            expect.fail('The function executed when it should not have.');
        });

        it('should set the fundingWallet correctly', async () => {
            const tokenSaleInstance = await TokenSale.new(FUNDING_WALLET_ADDRESS);

            expect(await tokenSaleInstance.fundingWalletAddress()).to.be.equal(FUNDING_WALLET_ADDRESS);
        });

        it('should not have a token connected', async () => {
            const tokenSaleInstance = await TokenSale.new(FUNDING_WALLET_ADDRESS);

            //expect not yet be linked
            expect(await tokenSaleInstance.tokenContract()).to.be.equal(zeroAddress);
        });
    });


    describe('#connectToken', async () => {
        //@TODO test init from an token that already transferred some tokens
        let tokenSaleInstance, tokenInstance;
        before(async () => {
            tokenSaleInstance = await TokenSale.new(FUNDING_WALLET_ADDRESS);
            tokenInstance     = await Token.new(tokenSaleInstance.address);

            await tokenSaleInstance.connectToken(tokenInstance.address);
        });

        it('should link the sale to the token', async () => {
            //address should be set correctly
            expect(await tokenSaleInstance.tokenContract()).to.be.equal(tokenInstance.address);
        });

        it('should have transferred the tokens to the funding wallet', async () => {
            const companyAllocation = await tokenSaleInstance.COMPANY_ALLOCATION(),
                  totalSupply       = await tokenInstance.totalSupply();

            //expect the funding_wallet_address to have received the correct amount of tokens
            await helper.expectTokenBalance(
                tokenInstance,
                FUNDING_WALLET_ADDRESS,
                companyAllocation.dividedBy(EXA),
                'company allocation token amount correctly transferred'
            );

            //expect the amount of tokens assigned to the tokenSale to be correct
            await helper.expectTokenBalance(
                tokenInstance,
                tokenSaleInstance.address,
                web3.fromWei(totalSupply.sub(companyAllocation), 'ether'),
                'tokenSale token balance is correct'
            );
        });

        it('should prevent further connect calls', async () => {
            await helper.expectRevert(async () => await tokenSaleInstance.connectToken(tokenInstance.address));
        });
    });

    describe('earlybird', () => {
        let tokenSaleInstance;
        beforeEach(async () => {
            tokenSaleInstance = await TokenSale.new(FUNDING_WALLET_ADDRESS);
        });

        describe('#addEarlyBird', () => {
            it('should only be callable by the owner', async () => {
                const earlyBirdAmount = web3.toWei(2, 'ether');

                //expect revert

                await helper.expectRevert(async () => await tokenSaleInstance.addEarlyBird(BUYER1, web3.toWei(2, 'ether'), {from: BUYER1}));
                await tokenSaleInstance.addEarlyBird(EARLY_BIRD1, earlyBirdAmount);

                const earlyBirdReservedAmount = await tokenSaleInstance.earlyBirdInvestments(EARLY_BIRD1);

                expect(earlyBirdReservedAmount).to.be.bignumber.equal(earlyBirdAmount);
            });

            it('should only be callable while no token is assigned', async () => {
                const tokenInstance = await Token.new(tokenSaleInstance.address);

                await tokenSaleInstance.addEarlyBird(EARLY_BIRD1, web3.toWei(2, 'ether'));
                await tokenSaleInstance.connectToken(tokenInstance.address);
                await helper.expectRevert(async () => await tokenSaleInstance.addEarlyBird(BUYER1, web3.toWei(2, 'ether'), {from: BUYER1}));
            });

            it('should transfer the early bird tokens on tokenConnect', async () => {
                const tokenInstance = await Token.new(tokenSaleInstance.address);

                await tokenSaleInstance.addEarlyBird(EARLY_BIRD1, web3.toWei(2, 'ether'));
                await tokenSaleInstance.addEarlyBird(EARLY_BIRD2, web3.toWei(4, 'ether'));

                //connect the token
                await tokenSaleInstance.connectToken(tokenInstance.address);

                await helper.expectTokenBalance(tokenInstance, EARLY_BIRD1, TRANCHES.PRESALE_1 * 2);
                await helper.expectTokenBalance(tokenInstance, EARLY_BIRD2, TRANCHES.PRESALE_1 * 4);
            });
        });

    });
    describe('whitelist', () => {
        let tokenSaleInstance;
        beforeEach(async () => {
            tokenSaleInstance = await TokenSale.new(FUNDING_WALLET_ADDRESS);
            await tokenSaleInstance.addWhitelistOperator(WHITELIST_OPERATOR);
        });

        describe('#addToWhitelist', () => {
            it('should only be callable by whitelistOperator', async () => {
                await helper.expectRevert(async () => await tokenSaleInstance.addToWhitelist(BUYER1));
            });

            it('should add an address to the whitelist', async () => {
                expect(await tokenSaleInstance.whitelist(BUYER1)).to.be.not.ok;
                await tokenSaleInstance.addToWhitelist(BUYER1, {from: WHITELIST_OPERATOR});

                expect(await tokenSaleInstance.whitelist(BUYER1)).to.be.ok;
            });
        });


        describe('#removeFromWhitelist', () => {
            it('should only be callable by whitelistOperator', async () => {
                try {
                    await tokenSaleInstance.removeFromWhitelist(BUYER1);
                    expect.fail('The function executed when it should not have.');
                } catch (e) {
                    expect(e.message).match(/revert/);
                }
            });

            it('should remove an address from the whitelist', async () => {
                expect(await tokenSaleInstance.whitelist(BUYER1)).to.be.not.ok;
                await tokenSaleInstance.addToWhitelist(BUYER1, {from: WHITELIST_OPERATOR});

                expect(await tokenSaleInstance.whitelist(BUYER1)).to.be.ok;

                await tokenSaleInstance.removeFromWhitelist(BUYER1, {from: WHITELIST_OPERATOR});
                expect(await tokenSaleInstance.whitelist(BUYER1)).to.be.not.ok;
            });
        });
    });

    describe('#buyTokens', () => {
        let tokenSaleInstance, tokenInstance;

        beforeEach(async () => {
            tokenSaleInstance = await TokenSaleMock.new(FUNDING_WALLET_ADDRESS);
            tokenInstance     = await Token.new(tokenSaleInstance.address);

            await tokenSaleInstance.connectToken(tokenInstance.address);
            await tokenSaleInstance.addWhitelistOperator(WHITELIST_OPERATOR);
            await tokenSaleInstance.addToWhitelist(BUYER1, {from: WHITELIST_OPERATOR});

            //make sure public sale is not yet started
            let startDate = await tokenSaleInstance.PUBLIC_START_TIME();
            //startDate - 30 mins
            await tokenSaleInstance.changeTime(startDate.sub(60 * 30));
        });

        it('should respect min contribution limits', async () => {
            await helper.expectZeroTokenBalance(tokenInstance, BUYER1);
            await helper.expectRevert(async () => await helper.buyTokens(tokenSaleInstance, BUYER1, 0.099));

            await helper.expectZeroTokenBalance(tokenInstance, BUYER1);

            await helper.buyTokens(tokenSaleInstance, BUYER1, 1);

            expect(await tokenInstance.balanceOf(BUYER1)).to.be.bignumber.to.be.above(1);
            assert.isAbove(
                await tokenInstance.balanceOf(BUYER1).valueOf(),
                1,
                'Tokens not transferred to the buyer'
            );

        });

        it('should respect max contribution limits for single transaction', async () => {
            await helper.expectZeroTokenBalance(tokenInstance, BUYER1);

            await helper.expectRevert(async () => await helper.buyTokens(tokenSaleInstance, BUYER1, 2501));
            await helper.expectZeroTokenBalance(tokenInstance, BUYER1);


            await helper.buyTokens(tokenSaleInstance, BUYER1, 1);

            assert.isAbove(
                await tokenInstance.balanceOf(BUYER1).valueOf(),
                1,
                'Tokens not transferred to the buyer'
            );
        });

        it('should respect max contribution limits for across multiple transaction', async () => {
            await helper.expectZeroTokenBalance(tokenInstance, BUYER1);

            await helper.buyTokens(tokenSaleInstance, BUYER1, 1500);

            //should now fail as we exceed the limit
            await helper.expectRevert(async () => await helper.buyTokens(tokenSaleInstance, BUYER1, 1500));

            assert.isAbove(
                await tokenInstance.balanceOf(BUYER1).valueOf(),
                1,
                'Tokens not transferred to the buyer'
            );
        });

        it('should respect whitelist', async () => {
            await helper.expectZeroTokenBalance(tokenInstance, BUYER2);
            //BUYER2 is not on the whitelist, so expect revert
            await helper.expectRevert(async () => await helper.buyTokens(tokenSaleInstance, BUYER2, 1500));
            await helper.expectZeroTokenBalance(tokenInstance, BUYER2);
        });

        it('should respect END_TIME', async () => {
            let endTime = await tokenSaleInstance.END_TIME();

            await helper.expectZeroTokenBalance(tokenInstance, BUYER1);
            await helper.buyTokens(tokenSaleInstance, BUYER1, 1);
            await helper.expectTokenBalance(tokenInstance, BUYER1, TRANCHES.PRESALE_1);

            //set the END_TIME + 1 seconds to simulate the end of the sale
            await tokenSaleInstance.changeTime(endTime.plus(1));

            //expect next buy attempts to be reverted
            await helper.expectRevert(async () => await helper.buyTokens(tokenSaleInstance, BUYER1, 1));

            //expect balance to still be 740
            await helper.expectTokenBalance(tokenInstance, BUYER1, TRANCHES.PRESALE_1);
        });

        it('should refund partially if we have not enough tokens left', async () => {
            const tokensLeft         = web3.toWei(370),
                  totalSupply        = await tokenInstance.totalSupply(),
                  buyerBalanceBefore = await helper.getBalanceInEther(BUYER1);

            await tokenSaleInstance.setTokensLeft(tokensLeft);
            await tokenSaleInstance.setTotalTokenSold(totalSupply.sub(tokensLeft));

            //expect user has no tokens yet
            await helper.expectZeroTokenBalance(tokenInstance, BUYER1);

            //expect
            await helper.buyTokens(tokenSaleInstance, BUYER1, 2);

            //expect to only get 370 instead of 740
            await helper.expectTokenBalance(tokenInstance, BUYER1, 370);


            const buyerBalanceAfter = await helper.getBalanceInEther(BUYER1);

            const balanceDiff = buyerBalanceBefore.sub(buyerBalanceAfter);
            //expect that the diff be a bit more than 1 as we burned some gas
            expect(balanceDiff).to.be.bignumber.at.most(1.00000000001);
            expect(await helper.getBalanceInEther(tokenInstance.address)).to.be.bignumber.equal(0);
        });

        it('should finalize when all is sold', async () => {
            const tokensLeft  = web3.toWei(TRANCHES.PRESALE_3),
                  totalSupply = await tokenInstance.totalSupply();

            await tokenSaleInstance.setTokensLeft(tokensLeft);
            await tokenSaleInstance.setTotalTokenSold(totalSupply.sub(tokensLeft));

            expect(await tokenSaleInstance.finalized.call(), 'Should not be finalized').to.be.not.ok;

            //expect
            await helper.buyTokens(tokenSaleInstance, BUYER1, 2);

            expect(await tokenSaleInstance.finalized.call(), 'Should be finalized').to.be.ok;
        });


    });


    describe('#calculateTokenAmount', () => {
        let tokenSaleInstance;
        beforeEach(async () => {
            tokenSaleInstance = await TokenSaleMock.new(FUNDING_WALLET_ADDRESS);
        });

        it('should always return the last tranche after PUBLIC_START_TIME', async () => {
            let startDate = await tokenSaleInstance.PUBLIC_START_TIME();
            //startDate - 30 mins
            await tokenSaleInstance.changeTime(startDate.sub(60 * 30));
            let tokenAmount = await tokenSaleInstance.calculateTokenAmount(web3.toWei(2, 'ether'));
            expect(parseInt(web3.fromWei(tokenAmount.valueOf()))).to.be.equal(TRANCHES.PRESALE_1 * 2);

            //startDate + 30 mins
            await tokenSaleInstance.changeTime(startDate.plus(60 * 30));
            tokenAmount = await tokenSaleInstance.calculateTokenAmount(web3.toWei(2, 'ether'));
            expect(parseInt(web3.fromWei(tokenAmount.valueOf()))).to.be.equal(TRANCHES.PUBLIC_SALE * 2);

        });

        it('should calculate the right amount foreach tranche', async () => {

            let dataSets = [
                {etherSpent: 1, exaTokensExpected: TRANCHES.PRESALE_1, tokensSold: 0},
                {etherSpent: 5, exaTokensExpected: TRANCHES.PRESALE_1 * 5, tokensSold: 0},
                {etherSpent: 1, exaTokensExpected: TRANCHES.PRESALE_1, tokensSold: 5 * MEGA - 1},

                {etherSpent: 1, exaTokensExpected: TRANCHES.PRESALE_2, tokensSold: 5 * MEGA},
                {etherSpent: 1, exaTokensExpected: TRANCHES.PRESALE_2, tokensSold: 10 * MEGA - 1},

                {etherSpent: 1, exaTokensExpected: TRANCHES.PRESALE_3, tokensSold: 10 * MEGA},
                {etherSpent: 1, exaTokensExpected: TRANCHES.PRESALE_3, tokensSold: 20 * MEGA - 1},

                {etherSpent: 1, exaTokensExpected: TRANCHES.PUBLIC_SALE, tokensSold: 20 * MEGA},
                {etherSpent: 1, exaTokensExpected: TRANCHES.PUBLIC_SALE, tokensSold: 50 * MEGA},
                {etherSpent: 1, exaTokensExpected: TRANCHES.PUBLIC_SALE, tokensSold: 60 * MEGA},
                //cant happen contract would run out of tokens
                {etherSpent: 5, exaTokensExpected: TRANCHES.PUBLIC_SALE * 5, tokensSold: 110 * MEGA},

            ];

            for (let dataSet of dataSets) {
                await tokenSaleInstance.setTotalTokenSold(web3.toWei(dataSet.tokensSold));

                let tokenAmount = await tokenSaleInstance.calculateTokenAmount(web3.toWei(dataSet.etherSpent, 'ether'));
                expect(parseInt(web3.fromWei(tokenAmount.valueOf())), `Tokens sold: ${dataSet.tokensSold} -> expect to receive ${dataSet.exaTokensExpected} when sending ${dataSet.etherSpent} ether`)
                    .to.be.equal(dataSet.exaTokensExpected);
            }
        });
    });

    describe('#finalize', () => {
        let tokenSaleInstance, token, endTime;
        beforeEach(async () => {
            tokenSaleInstance = await TokenSaleMock.new(FUNDING_WALLET_ADDRESS);
            token             = await Token.new(tokenSaleInstance.address);

            tokenSaleInstance.connectToken(token.address);
            endTime = await tokenSaleInstance.END_TIME();

            //set the END_TIME  seconds to simulate running sale
            await tokenSaleInstance.changeTime(endTime.minus(1));

        });

        it('should only be callable by the owner', async () => {
            await helper.expectRevert(async () => await tokenSaleInstance.finalize({from: BUYER1}));

            await tokenSaleInstance.changeTime(endTime.plus(1));

            await helper.expectRevert(async () => await tokenSaleInstance.finalize({from: BUYER1}));
        });

        it('should respect END_TIME', async () => {
            expect(await tokenSaleInstance.finalized.call(), 'Should not be finalized').to.be.not.ok;


            await helper.expectRevert(async () => await tokenSaleInstance.finalize());

            //set the END_TIME + 1 seconds to simulate the end of the sale
            await tokenSaleInstance.changeTime(endTime.plus(1));

            await tokenSaleInstance.finalize();

            expect(await tokenSaleInstance.finalized(), 'Should be finalized').to.be.ok;
        });


        it('should also finalize the token', async () => {
            const endTime = await tokenSaleInstance.END_TIME();
            await tokenSaleInstance.changeTime(endTime.plus(5));

            await tokenSaleInstance.finalize();

            expect(await tokenSaleInstance.finalized(), 'token sale finalized').to.be.equal(true);
            expect(await token.finalized(), 'token finalized').to.be.equal(true);
        })
    });

    describe('#burnUnsoldTokens', () => {
        let tokenSaleInstance, tokenInstance;

        beforeEach(async () => {
            tokenSaleInstance = await TokenSaleMock.new(FUNDING_WALLET_ADDRESS);
            tokenInstance     = await TokenMock.new(tokenSaleInstance.address);

            await tokenInstance.setFinalized(true);
            await tokenSaleInstance.connectToken(tokenInstance.address);
        });

        it('should only be callable when finalized', async () => {
            await helper.expectRevert(async () => await tokenSaleInstance.burnUnsoldTokens({from: TOKEN_SALE_OWNER}));

            await tokenSaleInstance.setFinalized(true);

            await tokenSaleInstance.burnUnsoldTokens({from: TOKEN_SALE_OWNER});
        });

        it('should be callable by everyone', async () => {
            await tokenSaleInstance.setFinalized(true);

            await tokenSaleInstance.burnUnsoldTokens({from: BUYER1});
        });


        it('should burn left tokens', async () => {
            await tokenSaleInstance.setFinalized(true);


            expect(await tokenSaleInstance.getTokensLeft())
                .to.be.bignumber.to.be.equal(60 * MEGA * EXA);


            await tokenSaleInstance.burnUnsoldTokens({from: TOKEN_SALE_OWNER});

            await helper.expectTokenBalance(
                tokenInstance,
                FUNDING_WALLET_ADDRESS,
                40 * MEGA
            );

            expect(await tokenSaleInstance.getTokensLeft())
                .to.be.bignumber.to.be.equal(0);
        });
    });
});
