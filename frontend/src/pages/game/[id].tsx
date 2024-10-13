
// pages/game/[id].tsx

import GameComponent from '@/components/pages/game/[id]/GameComponent';
import { GetStaticPaths, GetStaticProps } from 'next';
import prisma from '@/lib/prisma';

export default function GamePage({ game }: { game: any }) {
    return <GameComponent game={game} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
    const games = await prisma.game.findMany({
        select: { id: true }, // Ensure this `id` matches the DB field, e.g., `contractGameId`
    });

    const paths = games.map((game) => ({
        params: { id: game.id.toString() }, // Ensure it's a string
    }));

    return {
        paths,
        fallback: 'blocking', // Use blocking fallback for dynamic data
    };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const { id } = params as { id: string };

    try {
        const game = await prisma.game.findUnique({
            where: { id: parseInt(id, 10) }, // Ensure `id` is parsed correctly
        });

        if (!game) {
            return {
                notFound: true, // Handle 404 if the game isn't found
            };
        }

        return {
            props: {
                game: {
                    ...game,
                    wagerAmount: game.wagerAmount.toString(),
                    createdAt: game.createdAt.toISOString(),
                    updatedAt: game.updatedAt.toISOString(),
                },
            },
            revalidate: 60, // Revalidate every 60 seconds
        };
    } finally {
        await prisma.$disconnect(); // Ensure Prisma disconnects after the operation
    }
};
