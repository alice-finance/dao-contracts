const { constants, BN, expectEvent, expectRevert, time } = require("openzeppelin-test-helpers");
const { expect } = require("chai");

const TokenVesting = artifacts.require("TokenVesting.sol");
const ERC20 = artifacts.require("mock/ERC20Mock.sol");

const ZERO = new BN(0);
const { MAX_UINT256 } = constants;
const COUNT = new BN(52);
const INTERVAL = time.duration.days(7);
const START = time.duration.years(1);
const MULTIPLIER = new BN(10).pow(new BN(18));
const AMOUNT1 = MULTIPLIER.mul(new BN(100000));
const AMOUNT_INITIAL_1 = MULTIPLIER.mul(new BN(50000));
const AMOUNT_RELEASE_1 = MULTIPLIER.mul(new BN(50000)).div(COUNT);
const AMOUNT_CLAIM_1 = AMOUNT_RELEASE_1.mul(new BN(2));

contract("Vesting", function([admin, member1, notAdmin, notMember]) {
  const createVesting = async (
    ctx,
    beneficiary,
    startAt,
    totalAmount = AMOUNT1,
    initialAmount = AMOUNT_INITIAL_1,
    releaseAmount = AMOUNT_RELEASE_1,
    claimAmount = AMOUNT_CLAIM_1,
    interval = INTERVAL,
    count = 52
  ) => {
    return TokenVesting.new(
      ctx.alice.address,
      beneficiary,
      totalAmount,
      startAt,
      interval,
      count,
      initialAmount,
      releaseAmount,
      claimAmount,
      { from: admin }
    );
  };

  const createAndInitialize = async (
    ctx,
    beneficiary,
    startAt,
    totalAmount = AMOUNT1,
    initialAmount = AMOUNT_INITIAL_1,
    releaseAmount = AMOUNT_RELEASE_1,
    claimAmount = AMOUNT_CLAIM_1,
    interval = INTERVAL,
    count = 52
  ) => {
    const vesting = await createVesting(
      ctx,
      beneficiary,
      startAt,
      totalAmount,
      initialAmount,
      releaseAmount,
      claimAmount,
      interval,
      count
    );
    await ctx.alice.approve(vesting.address, AMOUNT1, { from: admin });
    await vesting.initialize({ from: admin });
    return vesting;
  };

  beforeEach(async function() {
    this.alice = await ERC20.new("Alice Token", "ALICE", 18);

    await this.alice.mint(admin, MAX_UINT256.div(new BN(10)));
    await this.alice.mint(notAdmin, MAX_UINT256.div(new BN(10)));
  });

  it("should get right information", async function() {
    const start = await time.latest();
    const vesting = await createVesting(this, member1, start.add(START));

    expect(await vesting.initialized()).to.be.false;
    expect(await vesting.totalSupply()).to.be.bignumber.equal(AMOUNT1);
    expect(await vesting.totalClaimed()).to.be.bignumber.equal(ZERO);
    expect(await vesting.initialReleaseAmount()).to.be.bignumber.equal(AMOUNT_INITIAL_1);
    expect(await vesting.releaseStartAt()).to.be.bignumber.equal(start.add(START));
    expect(await vesting.releaseInterval()).to.be.bignumber.equal(INTERVAL);
    expect(await vesting.releaseCount()).to.be.bignumber.equal(COUNT);
    expect(await vesting.releaseAmount()).to.be.bignumber.equal(AMOUNT_RELEASE_1);
    expect(await vesting.claimAmount()).to.be.bignumber.equal(AMOUNT_CLAIM_1);
    expect(await vesting.lastClaimedTimestamp()).to.be.bignumber.equal(ZERO);
    expect(await vesting.token()).to.be.equal(this.alice.address);
    expect(await vesting.beneficiary()).to.be.equal(member1);
    expect(await vesting.balance()).to.be.bignumber.equal(ZERO);

    await this.alice.approve(vesting.address, AMOUNT1, { from: admin });
    await vesting.initialize({ from: admin });

    expect(await vesting.initialized()).to.be.true;
    expect(await vesting.balance()).to.be.bignumber.equal(AMOUNT1);
    expect(await vesting.totalLocked()).to.be.bignumber.equal(AMOUNT1);
    expect(await vesting.totalReleased()).to.be.bignumber.equal(ZERO);
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(ZERO);
  });

  it("should claim", async function() {
    const start = await time.latest();
    const vesting = await createAndInitialize(this, member1, start.add(START));

    await time.increaseTo(start.add(START));

    expect(await vesting.totalReleased()).to.be.bignumber.equal(AMOUNT_INITIAL_1);
    expect(await vesting.totalLocked()).to.be.bignumber.equal(AMOUNT1.sub(AMOUNT_INITIAL_1));
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(AMOUNT_CLAIM_1);

    const { logs } = await vesting.claim(AMOUNT_RELEASE_1, { from: member1 });
    expectEvent.inLogs(logs, "Claimed", {
      amount: AMOUNT_RELEASE_1
    });

    expect(await vesting.totalClaimed()).to.be.bignumber.equal(AMOUNT_RELEASE_1);
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(AMOUNT_RELEASE_1);
  });

  it("should increase claimable", async function() {
    const start = await time.latest();
    const vesting = await createAndInitialize(this, member1, start.add(START));

    await time.increaseTo(start.add(START));

    expect(await vesting.totalReleased()).to.be.bignumber.equal(AMOUNT_INITIAL_1);
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(AMOUNT_CLAIM_1);

    await time.increaseTo(start.add(START).add(INTERVAL.mul(new BN(10))));

    expect(await vesting.totalReleased()).to.be.bignumber.equal(AMOUNT_INITIAL_1.add(AMOUNT_RELEASE_1.mul(new BN(10))));
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(AMOUNT_CLAIM_1.mul(new BN(11)));

    await time.increaseTo(start.add(START).add(INTERVAL.mul(COUNT)));

    expect(await vesting.totalReleased()).to.be.bignumber.equal(AMOUNT1);
  });

  it("should terminate", async function() {
    const start = await time.latest();
    const vesting = await createAndInitialize(this, member1, start.add(START));

    await time.increaseTo(start.add(START).add(INTERVAL.mul(new BN(10))));

    expect(await vesting.totalLocked()).to.be.bignumber.equal(
      AMOUNT1.sub(AMOUNT_INITIAL_1.add(AMOUNT_RELEASE_1.mul(new BN(10))))
    );
    expect(await vesting.totalReleased()).to.be.bignumber.equal(AMOUNT_INITIAL_1.add(AMOUNT_RELEASE_1.mul(new BN(10))));
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(AMOUNT_CLAIM_1.mul(new BN(11)));

    expect(await vesting.isClosed()).to.be.false;

    const { tx, logs } = await vesting.close({ from: admin });

    expectEvent.inLogs(logs, "Closed");
    await expectEvent.inTransaction(tx, ERC20, "Transfer", {
      from: vesting.address,
      to: admin,
      value: AMOUNT1.sub(AMOUNT_INITIAL_1.add(AMOUNT_RELEASE_1.mul(new BN(10))))
    });

    expect(await vesting.isClosed()).to.be.true;

    await time.increaseTo(start.add(START).add(INTERVAL.mul(new BN(12))));

    expect(await vesting.totalReleased()).to.be.bignumber.equal(AMOUNT_INITIAL_1.add(AMOUNT_RELEASE_1.mul(new BN(10))));
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(
      AMOUNT_INITIAL_1.add(AMOUNT_RELEASE_1.mul(new BN(10)))
    );

    await vesting.claim(AMOUNT_CLAIM_1.mul(new BN(13)), { from: member1 });
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(
      AMOUNT_INITIAL_1.add(AMOUNT_RELEASE_1.mul(new BN(10))).sub(AMOUNT_CLAIM_1.mul(new BN(13)))
    );
  });

  it("should not claim", async function() {
    const start = await time.latest();
    const vesting = await createAndInitialize(this, member1, start.add(START));

    await time.increaseTo(start.add(START).add(INTERVAL.mul(new BN(10))));
    expect(await vesting.currentClaimable()).to.be.bignumber.equal(AMOUNT_CLAIM_1.mul(new BN(11)));

    await expectRevert(vesting.claim(AMOUNT_CLAIM_1.mul(new BN(11)), { from: notMember }), "caller is not beneficiary");

    expect(await vesting.currentClaimable()).to.be.bignumber.equal(AMOUNT_CLAIM_1.mul(new BN(11)));

    await vesting.claim(AMOUNT_CLAIM_1.mul(new BN(11)), { from: member1 });

    expect(await vesting.currentClaimable()).to.be.bignumber.equal(ZERO);

    await expectRevert(vesting.claim(AMOUNT_CLAIM_1.mul(new BN(11)), { from: member1 }), "invalid amount");

    expect(await vesting.currentClaimable()).to.be.bignumber.equal(ZERO);
  });

  it("should not initialize", async function() {
    const start = await time.latest();
    const vesting = await createVesting(this, member1, start.add(START));

    await this.alice.approve(vesting.address, AMOUNT1, { from: admin });
    await this.alice.approve(vesting.address, AMOUNT1, { from: notAdmin });

    await expectRevert(vesting.initialize({ from: notAdmin }), "Ownable: caller is not the owner");

    await vesting.initialize({ from: admin });
    await expectRevert(vesting.initialize({ from: admin }), "already initialized");
  });

  it("should not close", async function() {
    const start = await time.latest();
    const vesting = await createAndInitialize(this, member1, start.add(START));

    await time.increaseTo(start.add(START).add(INTERVAL.mul(new BN(10))));

    await expectRevert(vesting.close({ from: notAdmin }), "Ownable: caller is not the owner");
    await vesting.close({ from: admin });
    await expectRevert(vesting.close({ from: admin }), "contract closed");
  });

  it("weekly report", async function() {
    const start = await time.latest();
    const vesting = await createAndInitialize(this, member1, start.add(START));
    const content = "This week's report";

    await time.increaseTo(start.add(START).add(INTERVAL.mul(new BN(10))));

    const submitTime = await time.latest();

    await vesting.submitReport(content, submitTime, { from: member1 });

    expect(await vesting.getReportAt(submitTime)).to.be.equal(content);
  });
});
