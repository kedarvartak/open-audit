import { ethers } from "hardhat";

async function main() {
    console.log("Deploying TaskEscrow contract...");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Deploy the contract
    // Backend address will be the deployer for now (can be updated later)
    const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(deployer.address);

    await taskEscrow.waitForDeployment();

    const address = await taskEscrow.getAddress();
    console.log("TaskEscrow deployed to:", address);
    console.log("Backend address (authorized):", deployer.address);

    // Save deployment info
    console.log("\nAdd to .env:");
    console.log(`TASKESCROW_CONTRACT_ADDRESS="${address}"`);
    console.log(`BLOCKCHAIN_BACKEND_ADDRESS="${deployer.address}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
