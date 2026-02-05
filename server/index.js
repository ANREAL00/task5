import express from 'express';
import cors from 'cors';
import { Faker, en, pl } from '@faker-js/faker';
import seedrandom from 'seedrandom';

const app = express();
const PORT = process.env.PORT || 3001;

const plCustom = {
    music: {
        artist: pl.person.last_name.generic,
    }
};

const fakers = {
    en_US: new Faker({ locale: [en] }),
    pl_PL: new Faker({ locale: [plCustom, pl, en] }),
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

app.use(cors());
app.use(express.json());

app.get('/api/songs', (req, res) => {
    const { seed, page = 1, locale = 'en_US', likes = 0 } = req.query;

    const pageSize = 20;
    const pageSeed = `${seed}-${page}`;
    const rng = seedrandom(pageSeed);

    const currentFaker = fakers[locale] || fakers.en_US;
    currentFaker.seed(Math.abs(rng.int32()));

    const songs = [];
    for (let i = 0; i < pageSize; i++) {
        const index = (page - 1) * pageSize + i + 1;
        const songRng = seedrandom(`${pageSeed}-${i}`);

        currentFaker.seed(Math.abs(songRng.int32()));

        const albumTitle = locale === 'en_US'
            ? currentFaker.music.album()
            : currentFaker.word.words({ count: { min: 1, max: 3 } }).replace(/^\w/, c => c.toUpperCase());

        const title = currentFaker.music.songName();
        const artist = currentFaker.music.artist();
        const genre = currentFaker.music.genre();
        const album = songRng() > 0.2 ? albumTitle : 'Single';

        const lyrics = Array.from({ length: 4 }, () => {
            return [
                capitalize(currentFaker.word.adjective()),
                currentFaker.word.noun(),
                currentFaker.word.verb(),
                "in the",
                currentFaker.music.genre(),
                currentFaker.location.city()
            ].join(' ');
        }).join('\n');

        const totalLikes = Math.floor(likes) + (rng() < (likes % 1) ? 1 : 0);

        songs.push({
            id: index,
            title,
            artist,
            album,
            genre,
            likes: totalLikes,
            lyrics,
            mediaSeed: `${pageSeed}-${i}`
        });
    }

    res.json(songs);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running`);
});
