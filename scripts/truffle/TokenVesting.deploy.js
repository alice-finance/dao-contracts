require("dotenv").config();
const util = require("util");
const readline = require("readline-sync");
const ora = require("ora");

const TokenVesting = artifacts.require("TokenVesting.sol");
const TokenVestingRegistry = artifacts.require("registry/TokenVestingRegistry.sol");

module.exports = async function(callback) {
  try {
    let beneficiary = readline.question("Beneficiary address: ");
    let alice = readline.question(`ALICE address (default: ${process.env.ALICE_ADDRESS}): `, {
      defaultInput: process.env.ALICE_ADDRESS
    });

    let yearLater = new Date();
    yearLater.setFullYear(yearLater.getFullYear() + 1);

    let totalAmount = readline.question("Total amount: ");
    let startAt = readline.question(`Release start timestamp(default: ${yearLater}): `, { defaultInput: "" });
    let interval = readline.question("Release period interval(default: 7 days): ", {
      defaultInput: 60 * 60 * 24 * 7 /* 1 week */
    });
    let count = readline.question("Total release period count(default: 52): ");
    let initialAmount = readline.question("Initial release amount: ");
    let releaseAmount = readline.question("Release amount per period: ");
    let claimAmount = readline.question("Claim amount per period: ");

    const spinner = ora("Deploying token vesting contract").start();

    const tokenVesting = await TokenVesting.new(
      process.env.ALICE_ADDRESS,
      beneficiary,
      totalAmount,
      startAt,
      interval,
      count,
      initialAmount,
      releaseAmount,
      claimAmount
    );

    spinner.succeed("Done");

    console.log("TokenVesting contract deployed to", util.inspect(tokenVesting.address, false, null, true));

    let register = readline.keyInYN("Register to TokenVestingRegistry?", { defaultInput: true });

    if (register) {
      const spinner = ora("Registering token vesting contract").start();
      const registry = await TokenVestingRegistry.deployed();

      const result = await registry.register(beneficiary, tokenVesting.address);

      console.log(util.inspect(result, false, null, true));

      spinner.succeed("Done");
    }

    callback();
  } catch (e) {
    callback(e);
  }
};
