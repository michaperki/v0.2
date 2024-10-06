
// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

contract Game {
    // Structs
    struct Wager {
        uint256 amount;
        address player;
        uint256 timestamp;
    }

    // Events
    event GameJoined(Wager newWager);

    // Storage
    Wager[] wagers;


    /**
    * @dev joins a Game
    * @param amount uint256 buy-in wager
    */
   function joinGame(uint256 amount) external {
       Wager memory newWager = Wager(
           amount,
           msg.sender,
           block.timestamp
       );
       wagers.push(newWager);
       emit GameJoined(newWager);
   }

   /**
    * @dev Gets list of all wagers
    */
   function getAllWagers() external view returns (Wager[] memory) {
       return wagers;
   }
}
