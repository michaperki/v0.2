
// pages/game/[id].tsx

import GameComponent from '@/components/pages/game/[id]/GameComponent';
import { GetStaticPaths, GetStaticProps } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default function GamePage({ game }: { game: any }) {
    return <GameComponent game={game} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
    const games = await prisma.game.findMany({
        select: { id: true },
    });

    const paths = games.map((game) => ({
        params: { id: game.id.toString() },
    }));

    return {
        paths,
        fallback: 'blocking',
    };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const { id } = params as { id: string };

    const game = await prisma.game.findUnique({
        where: { id: parseInt(id, 10) },
    });

    if (!game) {
        return {
            notFound: true,
        };
    }

    // Serialize the Date fields (createdAt and updatedAt)
    return {
        props: {
            game: {
                ...game,
                createdAt: game.createdAt.toISOString(),
                updatedAt: game.updatedAt.toISOString(),
            },
        },
        revalidate: 60, // Revalidate every 60 seconds
    };
};

