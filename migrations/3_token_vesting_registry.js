const TokenVestingRegistry = artifacts.require("registry/TokenVestingRegistry.sol");

module.exports = function(deployer) {
  deployer.deploy(TokenVestingRegistry);
};
