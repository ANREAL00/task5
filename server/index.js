import express from 'express';
import cors from 'cors';
import { Faker, en, de, pl } from '@faker-js/faker';
import seedrandom from 'seedrandom';

const app = express();
const PORT = 3001;

const fakers = {
    en_US: new Faker({ locale: [en] }),
    de_DE: new Faker({ locale: [de] }),
    pl_PL: new Faker({ locale: [pl] }),
};

app.use(cors());
app.use(express.json());

app.get('/api/songs', (req, res) => {
    const { seed, page = 1, locale = 'en_US', likes = 0 } = req.query;

    if (!seed) {
        return res.status(400).json({ error: 'Seed is required' });
    }

    const pageSize = 20;
    const pageSeed = `${seed}-${page}`;
    const rng = seedrandom(pageSeed);

    const currentFaker = fakers[locale];
    currentFaker.seed(Math.abs(rng.int32()));

    const songs = [];
    for (let i = 0; i < pageSize; i++) {
        const index = (page - 1) * pageSize + i + 1;

        const baseLikes = Math.floor(likes);
        const extraLike = rng() < (likes % 1) ? 1 : 0;
        const totalLikes = baseLikes + extraLike;

        songs.push({
            id: index,
            title: currentFaker.music.songName(),
            artist: currentFaker.music.artist(),
            album: rng() > 0.2 ? currentFaker.music.album() : 'Single',
            genre: currentFaker.music.genre(),
            likes: totalLikes,
            review: currentFaker.lorem.paragraph(),
            mediaSeed: `${pageSeed}-${i}`
        });
    }

    res.json(songs);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
