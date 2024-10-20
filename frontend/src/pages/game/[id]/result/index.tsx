import React from 'react';
import { GetServerSideProps } from 'next';
import prisma from '@/lib/prisma';
import { useRouter } from 'next/router';
import styles from './result.module.css';

interface ResultPageProps {
    game: {
        id: string;
        winner: string | null;
        player1: string;
        player2: string | null;
        wagerAmount: string;
        payoutAmount: string;
        lichessGameId: string | null;
    } | null;
}

export default function GameResult({ game }: ResultPageProps) {
    const router = useRouter();
    const { id } = router.query;

    if (!game) {
        return <div className={styles.resultText}>Game result not found.</div>;
    }

    return (
        <div className={styles.resultContainer}>
            <h1 className={styles.resultTitle}>Game Result for Game {id}</h1>
            <p className={styles.resultText}>Player 1: {game.player1}</p>
            <p className={styles.resultText}>Player 2: {game.player2 || 'N/A'}</p>
            <p className={styles.resultText}>Winner: {game.winner || 'N/A'}</p>
            <p className={styles.resultText}>Wager Amount: {game.wagerAmount} ETH</p>
            <p className={styles.resultText}>Payout Amount: {game.payoutAmount} ETH</p>
            {game.lichessGameId && (
                <a
                    href={`https://lichess.org/${game.lichessGameId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                >
                    View Lichess Game
                </a>
            )}
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params as { id: string };

    const game = await prisma.game.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
            winner: true,
            player1: true,
            player2: true,
        },
    });

    if (!game) {
        return { props: { game: null } };
    }

    return {
        props: {
            game: {
                id: game.id.toString(),
                winner: game.winner?.lichessId || null,
                player1: game.player1.lichessId,
                player2: game.player2?.lichessId || null,
                wagerAmount: game.wagerAmount.toString(),
                payoutAmount: game.payoutAmount?.toString() || '0',
                lichessGameId: game.lichessGameId || null,
            },
        },
    };
};
