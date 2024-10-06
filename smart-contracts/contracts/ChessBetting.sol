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
    }

    // Events
    event GameCreated(uint256 gameId, address creator, uint256 wagerAmount);
    event GameJoined(uint256 gameId, address player);
    event GameResult(uint256 gameId, address winner, uint256 payoutAmount);

    // Storage
    mapping(uint256 => Game) public games; // Mapping of gameId to Game
    uint256 public gameCounter; // Counter to track game IDs

    // Escrow account for holding funds
    mapping(uint256 => uint256) public escrow;

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

    /**
     * @dev Create a new chess game with a wager
     * @param wagerAmount The amount each player wagers
     */
    function createGame(uint256 wagerAmount) external payable {
        require(msg.value == wagerAmount, "Incorrect wager amount");

        // Create a new game in memory to minimize storage writes
        Game memory newGame;
        newGame.wagerAmount = wagerAmount;
        newGame.timestamp = block.timestamp;
        newGame.winner = address(0);
        newGame.isActive = false;

        // Add the creator as the first participant
        address;
        participants[0] = msg.sender;
        newGame.participants = participants;

        // Store the game into storage
        games[gameCounter] = newGame;

        // Store the funds in escrow
        escrow[gameCounter] = msg.value;

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
        require(msg.value == game.wagerAmount, "Incorrect wager amount");

        // Add the joining player as the second participant
        game.participants.push(msg.sender);

        // Add the second player's funds to escrow
        escrow[gameId] += msg.value;

        // Set the game to active now that both players have joined
        game.isActive = true;

        emit GameJoined(gameId, msg.sender);
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

        // Payout the winnings to the winner
        uint256 payoutAmount = escrow[gameId];
        escrow[gameId] = 0;
        payable(winner).transfer(payoutAmount);

        emit GameResult(gameId, winner, payoutAmount);
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
        // Return all the games in the array
        Game[] memory allGames = new Game[](gameCounter);
        for (uint256 i = 0; i < gameCounter; i++) {
            allGames[i] = games[i];
        }
        return allGames;
    }
}
