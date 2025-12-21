import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ProjectModule = buildModule("ProjectModule", (m) => {
    const factory = m.contract("ProjectFactory");

    return { factory };
});

export default ProjectModule;
