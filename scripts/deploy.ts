import { ethers } from "hardhat";

async function main() {
  const Forwarder = await ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy("GaslessForwarder", "1.0");
  await forwarder.deployed();

  console.log("Forwarder deployed to:", forwarder.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
