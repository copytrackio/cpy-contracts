'use strict';
const TOTAL_SUPPLY = 100 * 10 ** 6;
const EXP          = 10 ** 18;

const Token     = artifacts.require('Token.sol'),
      TokenMock = artifacts.require('TokenMock.sol'),
      TokenSale = artifacts.require('TokenSale.sol'),
      expect    = require('chai').expect;

const helper = require('./util/helper');

contract('Token', (accounts) => {
    const ACCOUNT0 = accounts[0],
          BUYER1   = accounts[2],
          BUYER2   = accounts[3],
          SOMEONE  = accounts[3];

    describe('initialization', () => {
        it('should throw an error if address is incorrect ', async () => {
            try {
                await Token.new();
            } catch (e) {
                expect(e.message).match(/revert/);
                return true;
            }
            expect.fail('The function executed when it should not have.');
        });

        it('should allocate supply to given address', async () => {
            const TokenInstance = await Token.new(ACCOUNT0),
                  tokens        = await TokenInstance.balanceOf(ACCOUNT0);

            assert.equal(tokens.valueOf(), TOTAL_SUPPLY * EXP, 'Tokens not transferred to the tokenSale');
        });

        it('should have the right defaults set', async () => {
            const instance    = await Token.new(ACCOUNT0),
                  totalSupply = await instance.totalSupply();

            //chai cant deal with these big numbers
            expect(totalSupply).to.be.bignumber.equal(TOTAL_SUPPLY * EXP);
            expect(await instance.name()).to.be.equal('COPYTRACK Token');
            expect(await instance.symbol(), 'Symobol should be ok').to.be.equal('CPY');
        })
    });

    describe('transfer', async () => {
        let token;
        beforeEach(async () => {
            token = await TokenMock.new(ACCOUNT0);

        });

        it('should allow transfers when finalized', async () => {
            await token.setFinalized(true);

            await token.transfer(BUYER1, web3.toWei(100), {from: ACCOUNT0});

            helper.expectTokenBalance(token, BUYER1, 100);

            await token.transfer(BUYER2, web3.toWei(25), {from: BUYER1});

            helper.expectTokenBalance(token, BUYER1, 75);
            helper.expectTokenBalance(token, BUYER2, 25);
        });


        it('should allow transfers only from owner before finalized', async () => {
            await token.transfer(BUYER1, web3.toWei(100), {from: ACCOUNT0});

            helper.expectTokenBalance(token, BUYER1, 100);


            //expect revert
            helper.expectRevert(async () => await token.transfer(BUYER2, web3.toWei(25), {from: BUYER1}));
        })
    });


    describe('transferFrom', async () => {
        let token;
        beforeEach(async () => {
            token = await TokenMock.new(ACCOUNT0);

            //give away some tokens
            await token.transfer(BUYER1, web3.toWei(100), {from: ACCOUNT0});
        });

        it('should allow transfers when finalized', async () => {
            helper.expectTokenBalance(token, BUYER1, 100);

            await token.setFinalized(true);
            await token.approve(SOMEONE, web3.toWei(100), {from: BUYER1});

            await token.transferFrom(BUYER1, BUYER2, web3.toWei(25), {from: SOMEONE});

            helper.expectTokenBalance(token, BUYER1, 75);
            helper.expectTokenBalance(token, BUYER2, 25);
        });


        it('should allow transfers only from owner before finalized', async () => {
            helper.expectTokenBalance(token, BUYER1, 100);

            await token.approve(SOMEONE, web3.toWei(100), {from: BUYER1});

            await helper.expectRevert(async () => await token.transferFrom(BUYER1, BUYER2, web3.toWei(25), {from: SOMEONE}));

            helper.expectTokenBalance(token, BUYER1, 100);
            helper.expectTokenBalance(token, BUYER2, 0);
        })
    });

    describe('#finalize', async () => {
        let token;
        beforeEach(async () => {
            token = await Token.new(ACCOUNT0);
        });

        it('should only be callable by the "tokeSaleContract" address', async () => {
            await token.finalize({from: ACCOUNT0});
            await helper.expectRevert(async () => await token.finalize({from: SOMEONE}));
        });
    });

    describe('#burn', async () => {
        let token;
        beforeEach(async () => {
            token = await TokenMock.new(ACCOUNT0);
        });

        it('should only be callable be callable after finalized', async () => {

            await helper.expectRevert(async () => await token.burn(web3.toWei(1000), {from: ACCOUNT0}));

            await token.setFinalized(true);

            await token.burn(web3.toWei(1000), {from: ACCOUNT0});
        });


        it('should reduce token balance and the total supply', async () => {
            await token.setFinalized(true);

            let balance = await helper.getBalanceInToken(token, ACCOUNT0),
                totalSupply = web3.fromWei(await token.totalSupply());

            await token.burn(web3.toWei(1000), {from: ACCOUNT0});


            await helper.expectTokenBalance(token, ACCOUNT0, balance.sub(1000));

            const newTotalSupply = web3.fromWei(await token.totalSupply());
            expect(newTotalSupply).to.be.bignumber.to.be.equal(totalSupply.sub(1000));
        });
    });
});