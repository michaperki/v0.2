
// POST /api/games/updateContractGameId
export default async function handler(req, res) {
    const { gameId, contractGameId } = req.body;

    // Logic to update the database with the contractGameId
    await prisma.game.update({
        where: { id: gameId },
        data: { contractGameId },
    });

    res.status(200).json({ message: "Contract game ID updated successfully" });
}
