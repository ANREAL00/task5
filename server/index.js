import express from 'express';
import cors from 'cors';
import { faker } from '@faker-js/faker';
import seedrandom from 'seedrandom';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper function to create a seeded RNG
const createRNG = (seed) => {
    return seedrandom(seed);
};

app.get('/api/songs', (req, res) => {
    const { seed, page = 1, locale = 'en_US', likes = 0 } = req.query;

    if (!seed) {
        return res.status(400).json({ error: 'Seed is required' });
    }

    const pageSize = 20;
    const pageSeed = `${seed}-${page}`;
    const rng = createRNG(pageSeed);

    // Set faker seed
    faker.seed(rng.int32());
    // Set locale (Note: faker.setLocale is deprecated in newer versions, use locale specific fakers)
    // For now we use the default and will refine later

    const songs = [];
    for (let i = 0; i < pageSize; i++) {
        const index = (page - 1) * pageSize + i + 1;

        // Probability for likes
        const baseLikes = Math.floor(likes);
        const extraLike = rng() < (likes % 1) ? 1 : 0;
        const totalLikes = baseLikes + extraLike;

        songs.push({
            id: index,
            title: faker.music.songName(),
            artist: faker.person.fullName(),
            album: rng() > 0.2 ? faker.music.album() : 'Single',
            genre: faker.music.genre(),
            likes: totalLikes
        });
    }

    res.json(songs);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
