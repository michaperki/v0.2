
// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

contract ChessBetting {
    // Struct for a Chess Game
    struct Game {
        address[] participants;
        uint256 wagerAmount;
        uint256 timestamp;
        address winner; // Address of the winner (if set)
        bool isActive;  // Is the game ongoing?
        bool isCancelled; // Has the game been cancelled?
    }

    // Events
    event GameCreated(uint256 gameId, address creator, uint256 wagerAmount);
    event GameJoined(uint256 gameId, address player);
    event GameResult(uint256 gameId, address winner, uint256 payoutAmount);
    event EscrowDeposit(uint256 gameId, address player, uint256 amount);
    event GameCancelled(uint256 gameId);

    // Storage
    mapping(uint256 => Game) public games; // Mapping of gameId to Game
    uint256 public gameCounter; // Counter to track game IDs

    // Escrow account for holding funds
    mapping(uint256 => uint256) public escrow;

    // Address of contract owner (e.g., the server)
    address public owner;

    // Modifier to ensure only players in the game can interact with certain functions
    modifier onlyPlayers(uint256 gameId) {
        bool isPlayer = false;
        for (uint i = 0; i < games[gameId].participants.length; i++) {
            if (msg.sender == games[gameId].participants[i]) {
                isPlayer = true;
            }
        }
        require(isPlayer, "Not a player in this game");
        _;
    }

    // Modifier to ensure only the contract owner can create games
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can create games");
        _;
    }

    // Constructor to set the owner
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Create a new chess game with a wager
     * @param wagerAmount The amount each player wagers
     */
    function createGame(uint256 wagerAmount) external onlyOwner {
        // Create a new game in storage
        Game storage newGame = games[gameCounter];
        newGame.wagerAmount = wagerAmount;
        newGame.timestamp = block.timestamp;
        newGame.winner = address(0);
        newGame.isActive = false;
        newGame.isCancelled = false;

        // Emit the game creation event
        emit GameCreated(gameCounter, msg.sender, wagerAmount);

        // Increment game counter
        gameCounter++;
    }

    /**
     * @dev Join an existing game
     * @param gameId The ID of the game to join
     */
    function joinGame(uint256 gameId) external payable {
        Game storage game = games[gameId];
        require(!game.isActive, "Game already active");
        require(game.participants.length < 2, "Game is already full");
        require(!game.isCancelled, "Game has been cancelled");
        require(msg.value == game.wagerAmount, "Incorrect wager amount");

        // Add the joining player as a participant
        game.participants.push(msg.sender);

        // Add the player's funds to escrow
        escrow[gameId] += msg.value;

        emit GameJoined(gameId, msg.sender);
        emit EscrowDeposit(gameId, msg.sender, msg.value);

        // If two players have joined, mark the game as active
        if (game.participants.length == 2) {
            game.isActive = true;
        }
    }

    /**
     * @dev Declare the result of the game and distribute the winnings
     * @param gameId The ID of the game
     * @param winner The address of the winner (can be set via Oracle)
     */
    function declareResult(uint256 gameId, address winner) external onlyPlayers(gameId) {
        Game storage game = games[gameId];
        require(game.isActive, "Game is not active");
        require(winner == game.participants[0] || winner == game.participants[1], "Invalid winner");

        // Mark the game as finished
        game.isActive = false;
        game.winner = winner;

        // Calculate the total payout amount from the escrow
        uint256 totalPayout = escrow[gameId];

        // Calculate the 5% fee for the owner
        uint256 feeAmount = (totalPayout * 5) / 100;

        // Calculate the remaining payout for the winner
        uint256 winnerPayout = totalPayout - feeAmount;

        // Reset the escrow for the game
        escrow[gameId] = 0;

        // Transfer the 5% fee to the owner
        payable(owner).transfer(feeAmount);

        // Transfer the remaining payout to the winner
        payable(winner).transfer(winnerPayout);

        emit GameResult(gameId, winner, winnerPayout);
    }

    /**
     * @dev Cancel an existing game if no participants have joined
     * @param gameId The ID of the game to cancel
     */
    function cancelGame(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(!game.isActive, "Cannot cancel an active game");
        require(game.participants.length == 0, "Cannot cancel a game with participants");

        // Mark the game as cancelled
        game.isCancelled = true;

        emit GameCancelled(gameId);
    }

    /**
     * @dev Get details of a game by its ID
     * @param gameId The ID of the game
     */
    function getGameDetails(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    /**
     * @dev Get all active games
     */
    function getAllGames() external view returns (Game[] memory) {
        Game[] memory allGames = new Game[](gameCounter);
        for (uint256 i = 0; i < gameCounter; i++) {
            allGames[i] = games[i];
        }
        return allGames;
    }

    /**
     * @dev Change the owner of the contract (optional feature)
     * @param newOwner The address of the new owner
     */
    function changeOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}

