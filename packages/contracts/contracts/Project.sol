// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Project {
    struct Milestone {
        string description;
        uint256 amount;
        bool isCompleted;
        bool isApproved;
        uint256 approvalCount;
        uint256 rejectionCount;
    }

    struct Proof {
        string ipfsHash; // or MinIO hash
        uint256 timestamp;
        string location; // GPS coordinates
        address submitter;
    }

    address public organizer;
    address public admin; // Backend wallet to manage donors
    string public title;
    
    Milestone[] public milestones;
    mapping(uint256 => Proof) public milestoneProofs; // milestoneId => Proof
    mapping(uint256 => mapping(address => bool)) public hasVoted; // milestoneId => user => voted
    mapping(address => bool) public isDonor;
    uint256 public donorCount;

    event MilestoneCreated(uint256 indexed milestoneId, string description, uint256 amount);
    event ProofSubmitted(uint256 indexed milestoneId, string ipfsHash, address submitter);
    event VoteCast(uint256 indexed milestoneId, address indexed voter, bool approve);
    event MilestoneApproved(uint256 indexed milestoneId);
    event MilestoneRejected(uint256 indexed milestoneId);
    event DonorAdded(address indexed donor);

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only organizer can perform this action");
        _;
    }

    modifier onlyDonor() {
        require(isDonor[msg.sender], "Only donors can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor(address _organizer, string memory _title) {
        organizer = _organizer;
        title = _title;
        admin = msg.sender;
    }

    function addDonor(address _donor) external onlyAdmin {
        if (!isDonor[_donor]) {
            isDonor[_donor] = true;
            donorCount++;
            emit DonorAdded(_donor);
        }
    }

    function createMilestone(string memory _description, uint256 _amount) external onlyOrganizer {
        milestones.push(Milestone({
            description: _description,
            amount: _amount,
            isCompleted: false,
            isApproved: false,
            approvalCount: 0,
            rejectionCount: 0
        }));
        emit MilestoneCreated(milestones.length - 1, _description, _amount);
    }

    function submitProof(uint256 _milestoneId, string memory _ipfsHash, string memory _location) external onlyOrganizer {
        require(_milestoneId < milestones.length, "Invalid milestone ID");
        require(!milestones[_milestoneId].isCompleted, "Milestone already completed");

        milestoneProofs[_milestoneId] = Proof({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            location: _location,
            submitter: msg.sender
        });

        emit ProofSubmitted(_milestoneId, _ipfsHash, msg.sender);
    }

    function voteOnProof(uint256 _milestoneId, bool _approve) external onlyDonor {
        require(_milestoneId < milestones.length, "Invalid milestone ID");
        require(!hasVoted[_milestoneId][msg.sender], "You have already voted");
        
        // Check if proof exists (simple check: timestamp > 0)
        require(milestoneProofs[_milestoneId].timestamp > 0, "No proof submitted for this milestone");

        hasVoted[_milestoneId][msg.sender] = true;

        if (_approve) {
            milestones[_milestoneId].approvalCount++;
        } else {
            milestones[_milestoneId].rejectionCount++;
        }

        emit VoteCast(_milestoneId, msg.sender, _approve);

        checkApproval(_milestoneId);
    }

    function checkApproval(uint256 _milestoneId) internal {
        Milestone storage m = milestones[_milestoneId];
        // Simple majority logic: if > 50% of registered donors approve
        // Or simpler: if approvals > rejections and approvals > donorCount / 2
        
        // For MVP: If approvals > 50% of TOTAL donors
        if (m.approvalCount * 2 > donorCount) {
            m.isApproved = true;
            m.isCompleted = true;
            emit MilestoneApproved(_milestoneId);
        }
    }
}
