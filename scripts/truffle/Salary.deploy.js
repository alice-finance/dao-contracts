require("dotenv").config();
const util = require("util");
const readline = require("readline-sync");
const ora = require("ora");

const Salary = artifacts.require("Salary.sol");
const SalaryRegistry = artifacts.require("registry/SalaryRegistry.sol");

module.exports = async function(callback) {
  try {
    let employee = readline.question("Employee address: ");
    let daiAddress = readline.question(`DAI address (default: ${process.env.DAI_ADDRESS}): `, {
      defaultInput: process.env.DAI_ADDRESS
    });
    let fund = readline.question("Fund address: ");
    let interval = readline.question("Wage period interval (default: 7 days): ", {
      defaultInput: 60 * 60 * 24 * 7 /* 1 week */
    });
    let amount = readline.question("Wage per period: ");

    const spinner = ora("Deploying salary contract").start();

    const salary = await Salary.new(daiAddress, employee, fund, interval, amount);

    spinner.succeed("Done");

    console.log("Salary contract deployed to", util.inspect(salary.address, false, null, true));

    let register = readline.keyInYN("Register to SalaryRegistry?", { defaultInput: true });

    if (register) {
      const spinner = ora("Registering salary contract").start();
      const registry = await SalaryRegistry.deployed();

      const result = await registry.register(employee, salary.address);

      console.log(util.inspect(result, false, null, true));

      spinner.succeed("Done");
    }

    callback();
  } catch (e) {
    callback(e);
  }
};
