# DAO Contracts

Contracts for pay salary to DAO members and vesting token.

## Contract Address

### Mainnet

| Contract             | Address |
| -------------------- | ------- |
| SalaryRegistry       | `TBD`   |
| TokenVestingRegistry | [`TBD`  |

### Testnet

| Contract             | Address                                                      |
| -------------------- | ------------------------------------------------------------ |
| SalaryRegistry       | [`0x5c2B7C589F23a9167E411E68708ee4eC7D7455E4`](http://extdev-blockexplorer.dappchains.com/address/0x5c2b7c589f23a9167e411e68708ee4ec7d7455e4/transactions) |
| TokenVestingRegistry | [`0x8D9BC3930C3aE9a7F55325c29c15380A16001394`](http://extdev-blockexplorer.dappchains.com/address/0x8d9bc3930c3ae9a7f55325c29c15380a16001394/transactions) |

## Deploying new contract

### Salary contract

> NOTE: An employee can have only one opened contract in SalaryRegistry. Make sure to close previous salary contract when deploying a new one.

> NOTE: After deploying new contract, Fund owner should approve DAI to salary contract.

You need these information:

```shell script
Employee address: # Addrss who will get DAI
DAI address (default: 0xcecd059cde0138cb681ff9bf9445a0a2cc9e98cb): # DAI address 
Fund address: # Fund owner address
Wage period interval (default: 7 days): # Seconds
Wage per period: # Wage amount in WEI format. 
```

Use command below:

```shell script
# Deploy new Salary contract to testnet
npx truffle exec scripts/truffle/Salary.deploy.js --network extdev
# Deploy new Salary contract to mainnet
npx truffle exec scripts/truffle/Salary.deploy.js --network plasma
```

Need these information

### Token Vesting Contract

> NOTE: After deploying new contract, ADMIN should execute `initialize` function of the contract.

You need these information:

```shell script
Beneficiary address: # Address who will get ALICE
ALICE address (default: 0x40bCc78eAD588c7806b47414770b70C83eC4B00D): # Address of ALICE default
Total amount: # Amount in WEI format (ex: 10 ALICE => 10000000000000000000)
Release start timestamp(default: 1 year later): # UNIX Epoch time (ex: 1569479700)
Release period interval(default: 7 days): # Seconds (ex: 7 days => 604800)
Total release period count(default: 52): # beneficiary can get release amount * count
Initial release amount: # This amount will be released right after Release start time
Release amount per period: # This amount will be released release every period
Claim amount per period: # Beneficiary can claim only this amount after previous claim. 
```

Use command below:

```shell script
# Deploy new Salary contract to testnet
npx truffle exec scripts/truffle/TokenVesting.deploy.js --network extdev
# Deploy new Salary contract to mainnet
npx truffle exec scripts/truffle/TokenVesting.deploy.js --network plasma
```

