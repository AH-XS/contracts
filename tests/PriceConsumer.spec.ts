import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { PriceConsumer, PriceConsumer__factory } from "../build/typechain";

let priceConsumer: PriceConsumer;
let deployer: tsEthers.Signer;
/**
 * Network: Goerli
 * Aggregator: ETH/USD
 * Address: 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
 */
const ETH_USD_ADDRESS = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";

describe("Price Consumer", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    priceConsumer = await new PriceConsumer__factory(deployer).deploy(
      ETH_USD_ADDRESS
    );
  });

  it("Should get price consumer contract address", () => {
    expect(priceConsumer.address).to.not.null;
  });

  it("Should get latest price", async () => {
    const price = await priceConsumer.getLatestPrice();
    console.log(price);
    expect(price).to.not.null;
  });
});
