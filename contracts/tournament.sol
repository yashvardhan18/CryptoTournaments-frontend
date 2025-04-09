// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TournamentPlatform is Ownable, ReentrancyGuard {
    // User registration
    struct Player {
        address wallet;
        uint256 playerId;
        string username;
    }
    
    mapping(address => Player) public players;
    mapping(uint256 => address) public playerIdToAddress;
    uint256 public nextPlayerId = 1;
    
    // Tournament structure
    enum TournamentStatus { CREATED, ACTIVE, COMPLETED, CANCELLED }
    enum GameType { CHESS, POKER, FORTNITE, VALORANT, GENERIC }
    
    struct Tournament {
        uint256 tournamentId;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 startTime;
        uint256 endTime;
        uint256 lobbyCloseTime;
        GameType gameType;
        TournamentStatus status;
        address[] players;
        mapping(address => uint256) scores;
        address[] winners;
        uint256 rewardPool;
    }
    
    mapping(uint256 => Tournament) public tournaments;
    uint256 public nextTournamentId = 1;
    
    // Events
    event PlayerRegistered(address indexed wallet, uint256 playerId, string username);
    event TournamentCreated(uint256 indexed tournamentId, GameType gameType, uint256 entryFee, uint256 startTime, uint256 endTime);
    event TournamentJoined(uint256 indexed tournamentId, address player);
    event TournamentCancelled(uint256 indexed tournamentId);
    event ScoresSubmitted(uint256 indexed tournamentId);
    event RewardsDistributed(uint256 indexed tournamentId);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == owner(), "Only admin can perform this action");
        _;
    }
    
    modifier onlyRegisteredPlayer() {
        require(players[msg.sender].wallet != address(0), "Player not registered");
        _;
    }
        constructor()Ownable(msg.sender) {

    }
    // Fallback function to accept ETH
    receive() external payable {}
    
    // User registration
    function registerPlayer(string memory username) external {
        require(players[msg.sender].wallet == address(0), "Player already registered");
        require(bytes(username).length > 0, "Username cannot be empty");
        
        uint256 playerId = nextPlayerId++;
        players[msg.sender] = Player(msg.sender, playerId, username);
        playerIdToAddress[playerId] = msg.sender;
        
        emit PlayerRegistered(msg.sender, playerId, username);
    }
    
    // Tournament creation (admin only)
    function createTournament(
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime,
        uint256 lobbyDuration,
        GameType gameType
    ) external onlyAdmin {
        require(maxPlayers > 1, "Max players must be greater than 1");
        require(startTime > block.timestamp, "Start time must be in the future");
        require(entryFee > 0, "Entry fee must be greater than 0");
        
        uint256 tournamentId = nextTournamentId++;
        Tournament storage t = tournaments[tournamentId];
        
        t.tournamentId = tournamentId;
        t.entryFee = entryFee;
        t.maxPlayers = maxPlayers;
        t.startTime = startTime;
        t.endTime = startTime + lobbyDuration;
        t.lobbyCloseTime = startTime - lobbyDuration;
        t.gameType = gameType;
        t.status = TournamentStatus.CREATED;
        
        emit TournamentCreated(tournamentId, gameType, entryFee, startTime, startTime + lobbyDuration);
    }
    
    // Joining tournaments
    function joinTournament(uint256 tournamentId) external payable onlyRegisteredPlayer nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        
        require(t.status == TournamentStatus.CREATED, "Tournament not open for joining");
        require(block.timestamp < t.lobbyCloseTime, "Registration period ended");
        require(t.players.length < t.maxPlayers, "Tournament is full");
        require(msg.value == t.entryFee, "Incorrect ETH amount sent");
        
        // Check if player already joined
        for (uint i = 0; i < t.players.length; i++) {
            require(t.players[i] != msg.sender, "Already joined this tournament");
        }
        
        t.players.push(msg.sender);
        t.rewardPool += t.entryFee;
        
        emit TournamentJoined(tournamentId, msg.sender);
        
        // Check if tournament is ready to start
        if (t.players.length == t.maxPlayers) {
            t.status = TournamentStatus.ACTIVE;
        }
    }
    
    // Lobby management (to be called by admin or oracle)
    function checkLobbyStatus(uint256 tournamentId) external {
        Tournament storage t = tournaments[tournamentId];
        
        if (t.status == TournamentStatus.CREATED && 
            block.timestamp >= t.lobbyCloseTime && 
            t.players.length < t.maxPlayers) {
            
            cancelTournament(tournamentId);
        }
    }
    
    function cancelTournament(uint256 tournamentId) internal {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.CREATED, "Cannot cancel tournament");
        
        t.status = TournamentStatus.CANCELLED;
        
        // Refund all players
        for (uint i = 0; i < t.players.length; i++) {
            payable(t.players[i]).transfer(t.entryFee);
        }
        
        emit TournamentCancelled(tournamentId);
    }
    
    // Score submission (called by backend/oracle)
    function submitScores(
        uint256 tournamentId,
        address[] memory playerAddresses,
        uint256[] memory scores
    ) external onlyAdmin {
        require(playerAddresses.length == scores.length, "Arrays length mismatch");
        
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.ACTIVE, "Tournament not active");
        require(block.timestamp >= t.startTime, "Tournament hasn't started yet");
        
        // Record scores
        for (uint i = 0; i < playerAddresses.length; i++) {
            t.scores[playerAddresses[i]] = scores[i];
        }
        
        emit ScoresSubmitted(tournamentId);
    }
    
    // Leaderboard calculation and reward distribution
    function completeTournament(uint256 tournamentId) external onlyAdmin nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.ACTIVE, "Tournament not active");
        require(block.timestamp > t.endTime || t.players.length == t.maxPlayers, "Tournament not finished");
        
        // Calculate winners
        address[] memory sortedPlayers = sortPlayersByScore(tournamentId);
        
        // Determine winners (top 3 or fewer if not enough players)
        uint256 winnerCount = t.players.length >= 3 ? 3 : t.players.length;
        t.winners = new address[](winnerCount);
        
        for (uint i = 0; i < winnerCount; i++) {
            t.winners[i] = sortedPlayers[i];
        }
        
        // Distribute rewards
        distributeRewards(tournamentId);
        
        t.status = TournamentStatus.COMPLETED;
        emit RewardsDistributed(tournamentId);
    }
    
    function sortPlayersByScore(uint256 tournamentId) internal view returns (address[] memory) {
        Tournament storage t = tournaments[tournamentId];
        address[] memory playerAddresses = t.players;
        
        // Simple bubble sort for demonstration (consider more efficient algo for production)
        for (uint i = 0; i < playerAddresses.length; i++) {
            for (uint j = i + 1; j < playerAddresses.length; j++) {
                if (t.scores[playerAddresses[i]] < t.scores[playerAddresses[j]]) {
                    address temp = playerAddresses[i];
                    playerAddresses[i] = playerAddresses[j];
                    playerAddresses[j] = temp;
                }
            }
        }
        
        return playerAddresses;
    }
    
    function distributeRewards(uint256 tournamentId) internal {
        Tournament storage t = tournaments[tournamentId];
        
        uint8[3] memory rewardPercentages = [50, 30, 20];
        uint256 totalDistributed = 0;
        
        for (uint i = 0; i < t.winners.length; i++) {
            uint256 rewardAmount = (t.rewardPool * rewardPercentages[i]) / 100;
            
            if (i == t.winners.length - 1) {
                // Handle rounding by giving last winner remaining balance
                rewardAmount = t.rewardPool - totalDistributed;
            } else {
                totalDistributed += rewardAmount;
            }
            
            payable(t.winners[i]).transfer(rewardAmount);
        }
    }
    
    // Additional utility functions
    function getTournamentPlayers(uint256 tournamentId) external view returns (address[] memory) {
        return tournaments[tournamentId].players;
    }
    
    function getTournamentWinners(uint256 tournamentId) external view returns (address[] memory) {
        return tournaments[tournamentId].winners;
    }
    
    function getPlayerScore(uint256 tournamentId, address player) external view returns (uint256) {
        return tournaments[tournamentId].scores[player];
    }
}