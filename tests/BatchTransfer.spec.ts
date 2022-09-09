import { deployProxy } from "./../scripts/deploy/utils";
import { ethers, waffle } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import {
  Token,
  Token__factory,
  BatchTransfer,
  TokenUpgradeable
} from "../build/typechain";

let token: Token;
let tokenUpgradeable: TokenUpgradeable;
let batchTransfer: BatchTransfer;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let user2: tsEthers.Signer;
let user3: tsEthers.Signer;
let user4: tsEthers.Signer;
let operator: tsEthers.Signer;

describe("Batch transfer", () => {
  before(async () => {
    [deployer, user, user2, user3, user4, operator] = await ethers.getSigners();

    token = await new Token__factory(deployer).deploy("Token", "TKN", 18);
    tokenUpgradeable = (await deployProxy(
      "TokenUpgradeable",
      ["Token", "TKN", 18],
      deployer,
      1
    )) as TokenUpgradeable;
    batchTransfer = (await await deployProxy(
      "BatchTransfer",
      [],
      deployer,
      1
    )) as BatchTransfer;

    // Send ETH to batch transfer from signer.
    await deployer.sendTransaction({
      to: batchTransfer.address,
      value: ethers.utils.parseEther("100")
    });

    // Mint token to the batch transfer.
    await token.mint(batchTransfer.address, ethers.utils.parseEther("10000"));
  });

  it("Should get token and eth balance from batch transfer contract", async () => {
    const tokenBalance = await token.balanceOf(batchTransfer.address);
    const provider = waffle.provider;
    const ethBalance = await provider.getBalance(batchTransfer.address);
    expect(tokenBalance).to.equal(ethers.utils.parseEther("10000"));
    expect(ethBalance).to.equal(ethers.utils.parseEther("100"));
  });

  it("Should not transfer if recipients length no equal to value batch", async () => {
    const userAddress = await user.getAddress();
    const user2Address = await user2.getAddress();
    const user3Address = await user3.getAddress();
    const user4Address = await user4.getAddress();

    await expect(
      batchTransfer.batchTransferToken(
        [userAddress, user2Address, user3Address, user4Address],
        [
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther("1000")
        ],
        token.address
      )
    ).to.revertedWith("Value and recipient lists are not the same length");

    await expect(
      batchTransfer.batchTransfer(
        [userAddress, user2Address, user3Address, user4Address],
        [
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("10")
        ]
      )
    ).to.revertedWith("Value and recipient lists are not the same length");
  });

  it("Should not transfer if Insufficient balance", async () => {
    const userAddress = await user.getAddress();
    const user2Address = await user2.getAddress();
    const user3Address = await user3.getAddress();
    const user4Address = await user4.getAddress();

    await expect(
      batchTransfer.batchTransferToken(
        [userAddress, user2Address, user3Address, user4Address],
        [
          ethers.utils.parseEther("10000"),
          ethers.utils.parseEther("10000"),
          ethers.utils.parseEther("10000"),
          ethers.utils.parseEther("10000")
        ],
        token.address
      )
    ).to.revertedWith("Insufficient balance");

    await expect(
      batchTransfer.batchTransfer(
        [userAddress, user2Address, user3Address, user4Address],
        [
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("100")
        ]
      )
    ).to.revertedWith("Insufficient balance");
  });

  it("Should batch transfer token to users", async () => {
    const userAddress = await user.getAddress();
    const user2Address = await user2.getAddress();
    const user3Address = await user3.getAddress();
    const user4Address = await user4.getAddress();
    await (
      await batchTransfer.batchTransferToken(
        [userAddress, user2Address, user3Address, user4Address],
        [
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther("1000")
        ],
        token.address
      )
    ).wait();

    const userBalance = await token.balanceOf(userAddress);
    const user2Balance = await token.balanceOf(user2Address);
    const user3Balance = await token.balanceOf(user3Address);
    const user4Balance = await token.balanceOf(user4Address);

    expect(userBalance).to.equal(ethers.utils.parseEther("1000"));
    expect(user2Balance).to.equal(ethers.utils.parseEther("1000"));
    expect(user3Balance).to.equal(ethers.utils.parseEther("1000"));
    expect(user4Balance).to.equal(ethers.utils.parseEther("1000"));
  });

  it("Should batch transfer eth to users", async () => {
    const userAddress = await user.getAddress();
    const user2Address = await user2.getAddress();
    const user3Address = await user3.getAddress();
    const user4Address = await user4.getAddress();
    await (
      await batchTransfer.batchTransfer(
        [userAddress, user2Address, user3Address, user4Address],
        [
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("10")
        ]
      )
    ).wait();

    const userBalance = await waffle.provider.getBalance(userAddress);
    const user2Balance = await waffle.provider.getBalance(user2Address);
    const user3Balance = await waffle.provider.getBalance(user3Address);
    const user4Balance = await waffle.provider.getBalance(user4Address);

    expect(userBalance).to.equal(ethers.utils.parseEther("10010"));
    expect(user2Balance).to.equal(ethers.utils.parseEther("10010"));
    expect(user3Balance).to.equal(ethers.utils.parseEther("10010"));
    expect(user4Balance).to.equal(ethers.utils.parseEther("10010"));

    const contractBalance = await waffle.provider.getBalance(
      batchTransfer.address
    );
    expect(contractBalance).to.equal(ethers.utils.parseEther("60"));
  });

  it("Should withdraw eth from contract", async () => {
    const contractBalance = await waffle.provider.getBalance(
      batchTransfer.address
    );
    expect(contractBalance).to.equal(ethers.utils.parseEther("60"));

    await (await batchTransfer.withdrawEth()).wait();
    const contractEthBalance = await waffle.provider.getBalance(
      batchTransfer.address
    );

    expect(contractEthBalance).to.equal(ethers.utils.parseEther("0"));

    await expect(batchTransfer.withdrawEth()).to.revertedWith(
      "Insufficient balance"
    );
  });

  it("Should withdraw token from contract", async () => {
    await expect(
      batchTransfer.withdrawToken(ethers.constants.AddressZero)
    ).to.revertedWith("Token address can not be 0");

    await expect(
      batchTransfer.withdrawToken(tokenUpgradeable.address)
    ).to.revertedWith("Token address is not set");

    const tokenBalance = await token.balanceOf(batchTransfer.address);
    expect(tokenBalance).to.equal(ethers.utils.parseEther("6000"));

    await (await batchTransfer.withdrawToken(token.address)).wait();
    const tokenContractBalance = await token.balanceOf(batchTransfer.address);

    expect(tokenContractBalance).to.equal(ethers.utils.parseEther("0"));

    await expect(batchTransfer.withdrawToken(token.address)).to.revertedWith(
      "Insufficient balance"
    );
  });

  it("Should not set same operator or operator address should not be address zero", async () => {
    await expect(
      batchTransfer.setOperator(ethers.constants.AddressZero)
    ).to.be.revertedWith("setOperator: Operator cannot be 0");

    await expect(
      batchTransfer.setOperator(await deployer.getAddress())
    ).to.be.revertedWith("setProperty: Operator cannot be the same");

    await expect(batchTransfer.setOperator(await operator.getAddress()))
      .to.emit(batchTransfer, "NewOperator")
      .withArgs(await operator.getAddress());

    expect(await batchTransfer.transferOperator()).to.equal(
      await operator.getAddress()
    );
  });

  it("Should not set token address to zero or not same token address", async () => {
    await expect(
      batchTransfer.setToken(ethers.constants.AddressZero)
    ).to.revertedWith("Token address can not be 0");

    await expect(batchTransfer.setToken(token.address)).to.revertedWith(
      "Token address is already set"
    );

    await (await batchTransfer.setToken(tokenUpgradeable.address)).wait();
    expect(await batchTransfer.token()).to.equal(tokenUpgradeable.address);
  });
});
