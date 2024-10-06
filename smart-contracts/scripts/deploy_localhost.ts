
import { ethers } from "hardhat";

async function main() {
  // Deploy ChessBetting contract
  const chessBettingContract = await ethers.deployContract("ChessBetting");
  await chessBettingContract.waitForDeployment();
  console.log("ChessBetting contract deployed to:", chessBettingContract.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
