import { ethers } from "hardhat";

async function main() {
  // Get the contract factory for TestToken
  const TestToken = await ethers.getContractFactory("TestToken");
  
  // Get the first signer (account)
  const [deployer] = await ethers.getSigners();

  // Deploy the contract with an initial supply
  const initialSupply = ethers.utils.parseUnits("1000000", 18);
  const testToken = await TestToken.deploy(initialSupply);
  
  // Wait for the contract to be deployed
  await testToken.deployed();
  
  console.log("TestToken deployed to:", testToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });