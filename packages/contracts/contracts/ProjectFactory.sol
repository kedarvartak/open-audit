// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Project.sol";

/**
 * @title ProjectFactory
 * @dev Factory contract to deploy and manage Project contracts
 * @notice Creates new Project instances and maintains a registry
 */
contract ProjectFactory {
    // ==================== STATE VARIABLES ====================
    
    Project[] public projects;
    mapping(address => address[]) public organizerProjects; // organizer => project addresses
    mapping(address => bool) public isProject; // Check if address is a valid project
    
    address public admin;

    // ==================== EVENTS ====================
    
    event ProjectCreated(
        address indexed projectAddress,
        address indexed organizer,
        string title,
        uint256 fundingGoal,
        uint256 timestamp
    );

    // ==================== MODIFIERS ====================
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // ==================== CONSTRUCTOR ====================
    
    constructor() {
        admin = msg.sender;
    }

    // ==================== PROJECT CREATION ====================
    
    function createProject(
        address _organizer,
        string memory _title,
        string memory _description,
        uint256 _fundingGoal
    ) external returns (address) {
        // Create new Project contract
        Project newProject = new Project(
            _organizer,
            _title,
            _description,
            _fundingGoal
        );
        
        address projectAddress = address(newProject);
        
        // Store in registry
        projects.push(newProject);
        organizerProjects[_organizer].push(projectAddress);
        isProject[projectAddress] = true;
        
        emit ProjectCreated(
            projectAddress,
            _organizer,
            _title,
            _fundingGoal,
            block.timestamp
        );
        
        return projectAddress;
    }

    // ==================== VIEW FUNCTIONS ====================
    
    function getProjects() external view returns (Project[] memory) {
        return projects;
    }

    function getProjectCount() external view returns (uint256) {
        return projects.length;
    }

    function getProjectsByOrganizer(address _organizer) external view returns (address[] memory) {
        return organizerProjects[_organizer];
    }

    function getProjectDetails(uint256 _index) external view returns (
        address projectAddress,
        address organizer,
        string memory title,
        string memory description,
        uint256 fundingGoal,
        uint256 createdAt
    ) {
        require(_index < projects.length, "Invalid project index");
        
        Project project = projects[_index];
        
        return (
            address(project),
            project.organizer(),
            project.title(),
            project.description(),
            project.fundingGoal(),
            project.createdAt()
        );
    }

    function isValidProject(address _projectAddress) external view returns (bool) {
        return isProject[_projectAddress];
    }
}
