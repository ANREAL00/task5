import React, { useEffect, useRef } from 'react';
import seedrandom from 'seedrandom';

const AlbumCover = React.memo(({ song }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rng = seedrandom(song.mediaSeed);

        const W = 400;
        const H = 400;

        const baseHue = Math.floor(rng() * 360);
        const split = 2 + Math.floor(rng() * 3);

        ctx.fillStyle = `hsl(${baseHue}, 30%, 20%)`;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < split; i++) {
            for (let j = 0; j < split; j++) {
                const hue = (baseHue + rng() * 60) % 360;
                ctx.fillStyle = `hsl(${hue}, 50%, ${30 + rng() * 40}%)`;
                const x = (i * W) / split;
                const y = (j * H) / split;
                const w = W / split;
                const h = H / split;

                if (rng() > 0.3) {
                    ctx.fillRect(x, y, w, h);
                }

                if (rng() > 0.8) {
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect(x, y, w, h / 4);
                }
            }
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(song.title.substring(0, 15), 40, 80);

        ctx.font = '16px sans-serif';
        ctx.globalAlpha = 0.7;
        ctx.fillText(song.artist, 40, 120);

    }, [song.mediaSeed, song.title, song.artist]);

    return (
        <div className="cover-art">
            <canvas
                ref={canvasRef}
                width="400"
                height="400"
                style={{ width: '100%', height: '100%', display: 'block' }}
            />
        </div>
    );
});

export default AlbumCover;
