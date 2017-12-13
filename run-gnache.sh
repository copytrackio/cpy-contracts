#!/usr/bin/env bash
set -e;

EXP=$(echo "10^18"|bc);


docker run -it --rm --name eth-test-net -p 8500:8545 trufflesuite/ganache-cli:latest \
    --debug \
    --account="0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3,$(echo "1000*$EXP"|bc)" \
    --account="0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f,$(echo "1000000*$EXP"|bc)" \
    --account="0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1,$(echo "1000000*$EXP"|bc)" \
    --account="0xc88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c,$(echo "1000000*$EXP"|bc)" \
    --account="0x82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8,$(echo "1000000*$EXP"|bc)" \
    --account="0x0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4,$(echo "1000000*$EXP"|bc)"\
    --account="0x388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418,$(echo "1000000*$EXP"|bc)"