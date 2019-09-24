const { BN, expectEvent, expectRevert, time } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const Salary = artifacts.require("Salary.sol");
const ERC20 = artifacts.require("mock/ERC20Mock.sol");

const ZERO = new BN(0);
const MULTIPLIER = new BN(10).pow(new BN(18));
const MAX_AMOUNT = MULTIPLIER.mul(new BN("50000000"));
const AMOUNT1 = MULTIPLIER.mul(new BN(100));
const INTERVAL = time.duration.days(7);

contract("Salary", function([admin, fund, employee1, notAdmin, notEmployee]) {
  const createSalary = async (ctx, employee, amount, interval = INTERVAL) => {
    const salary = await Salary.new(ctx.dai.address, employee, fund, interval, amount, { from: admin });
    await ctx.dai.approve(salary.address, MAX_AMOUNT, { from: fund });
    return salary;
  };

  beforeEach(async function() {
    this.dai = await ERC20.new("DAI Stable Token", "DAI", 18);

    await this.dai.mint(fund, MAX_AMOUNT);
  });

  it("should get right information", async function() {
    const salary = await createSalary(this, employee1, AMOUNT1);

    expect(await salary.interval()).to.be.bignumber.equal(INTERVAL);
    expect(await salary.wage()).to.be.bignumber.equal(AMOUNT1);
    expect(await salary.totalClaimed()).to.be.bignumber.equal(ZERO);
    expect(await salary.lastClaimedTimestamp()).to.be.bignumber.equal(ZERO);
    expect(await salary.token()).to.be.equal(this.dai.address);
    expect(await salary.employee()).to.be.equal(employee1);
    expect(await salary.fund()).to.be.equal(fund);
    expect(await salary.currentClaimable()).to.be.bignumber.equal(ZERO);
  });

  it("should claim", async function() {
    const start = await time.latest();
    const salary = await createSalary(this, employee1, AMOUNT1);

    await time.increaseTo(start.add(INTERVAL));

    expect(await salary.currentClaimable()).to.be.bignumber.equal(AMOUNT1);

    const { logs } = await salary.claim({ from: employee1 });
    expectEvent.inLogs(logs, "Claimed", {
      amount: AMOUNT1
    });

    expect(await salary.currentClaimable()).to.be.bignumber.equal(ZERO);
  });

  it("should increase claimable", async function() {
    const start = await time.latest();
    const salary = await createSalary(this, employee1, AMOUNT1);

    await time.increaseTo(start.add(INTERVAL));
    expect(await salary.currentClaimable()).to.be.bignumber.equal(AMOUNT1);
    await salary.claim({ from: employee1 });

    await time.increaseTo(start.add(INTERVAL.mul(new BN(10))));

    expect(await salary.currentClaimable()).to.be.bignumber.equal(AMOUNT1.mul(new BN(9)));

    await salary.claim({ from: employee1 });

    expect(await salary.currentClaimable()).to.be.bignumber.equal(ZERO);
  });

  it("should terminate", async function() {
    const start = await time.latest();
    const salary = await createSalary(this, employee1, AMOUNT1);
    await time.increaseTo(start.add(INTERVAL.mul(new BN(10))));

    expect(await salary.currentClaimable()).to.be.bignumber.equal(AMOUNT1.mul(new BN(10)));
    expect(await salary.isClosed()).to.be.false;

    const { logs } = await salary.close({ from: admin });

    expectEvent.inLogs(logs, "Closed");

    expect(await salary.isClosed()).to.be.true;

    await time.increaseTo(start.add(INTERVAL.mul(new BN(11))));

    expect(await salary.currentClaimable()).to.be.bignumber.equal(AMOUNT1.mul(new BN(10)));

    await salary.claim({ from: employee1 });

    expect(await salary.currentClaimable()).to.be.bignumber.equal(ZERO);
  });

  it("should not claim", async function() {
    const start = await time.latest();
    const salary = await createSalary(this, employee1, AMOUNT1);

    await time.increaseTo(start.add(INTERVAL));

    expect(await salary.currentClaimable()).to.be.bignumber.equal(AMOUNT1);

    await expectRevert(salary.claim({ from: notEmployee }), "caller is not employee");

    await salary.claim({ from: employee1 });
    await expectRevert(salary.claim({ from: employee1 }), "no claimable amount");
  });

  it("should not close", async function() {
    const salary = await createSalary(this, employee1, AMOUNT1);

    await expectRevert(salary.close({ from: notAdmin }), "Ownable: caller is not the owner");
    await salary.close({ from: admin });
    await expectRevert(salary.close({ from: admin }), "contract closed");
  });
});
