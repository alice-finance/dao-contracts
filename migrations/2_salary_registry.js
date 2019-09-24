const SalaryRegistry = artifacts.require("registry/SalaryRegistry.sol");

module.exports = function(deployer) {
  deployer.deploy(SalaryRegistry);
};
