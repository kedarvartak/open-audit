// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Project.sol";

contract ProjectFactory {
    Project[] public projects;

    event ProjectCreated(address indexed projectAddress, address indexed organizer, string title);

    function createProject(string memory _title) external {
        Project newProject = new Project(msg.sender, _title);
        projects.push(newProject);
        emit ProjectCreated(address(newProject), msg.sender, _title);
    }

    function getProjects() external view returns (Project[] memory) {
        return projects;
    }
}
