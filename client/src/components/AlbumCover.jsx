import React, { useMemo } from 'react';
import seedrandom from 'seedrandom';

const AlbumCover = React.memo(({ song }) => {
    const dicebearUrl = useMemo(() => {
        const styles = [
            'shapes',
            'abstract',
            'glass',
            'icons',
            'identicon',
            'rings',
            'pixel-art',
            'notionists',
            'initials'
        ];
        const rng = seedrandom(song.mediaSeed);
        const selectedStyle = styles[Math.floor(rng() * styles.length)];

        return `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${song.mediaSeed}&radius=0&randomizeIds=true`;
    }, [song.mediaSeed]);

    const handleImgError = (e) => {
        e.target.src = `https://api.dicebear.com/9.x/shapes/svg?seed=${song.mediaSeed}`;
    };

    return (
        <div className="album-cover-container">
            <img
                src={dicebearUrl}
                alt="Album Art"
                className="album-art-img"
                loading="lazy"
                onError={handleImgError}
            />
            <div className="album-label-overlay">
                <div className="label-content">
                    <h4 className="label-title">{song.title}</h4>
                    <h5 className="label-artist">{song.artist}</h5>
                </div>
                <div className="label-accent-bar"></div>
            </div>
        </div>
    );
});

export default AlbumCover;
