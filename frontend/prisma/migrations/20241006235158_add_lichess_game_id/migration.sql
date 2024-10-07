/*
  Warnings:

  - Made the column `lichessGameId` on table `Game` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contractGameId" INTEGER NOT NULL,
    "lichessGameId" TEXT NOT NULL,
    "player1Id" INTEGER NOT NULL,
    "player2Id" INTEGER,
    "wagerAmount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Game_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("contractGameId", "createdAt", "id", "isActive", "lichessGameId", "player1Id", "player2Id", "updatedAt", "wagerAmount", "winnerId") SELECT "contractGameId", "createdAt", "id", "isActive", "lichessGameId", "player1Id", "player2Id", "updatedAt", "wagerAmount", "winnerId" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_contractGameId_key" ON "Game"("contractGameId");
CREATE UNIQUE INDEX "Game_lichessGameId_key" ON "Game"("lichessGameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
