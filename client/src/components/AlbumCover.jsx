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

        // 1. Varied Color Palettes
        const palettes = [
            ['#FF5F6D', '#FFC371', '#000000'], // Sunset
            ['#2193b0', '#6dd5ed', '#ffffff'], // Ocean
            ['#eb3349', '#f45c43', '#000000'], // Cherry
            ['#4facfe', '#00f2fe', '#ffffff'], // Sky
            ['#6a11cb', '#2575fc', '#ffffff'], // Purple-Blue
            ['#f83600', '#f9d423', '#000000'], // Fire
            ['#11998e', '#38ef7d', '#000000'], // Emerald
        ];
        const palette = palettes[Math.floor(rng() * palettes.length)];
        const primary = palette[0];
        const secondary = palette[1];
        const textCol = palette[2];

        // 2. Clear Background
        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, W, H);

        // 3. Structural Varations (Styles)
        const style = Math.floor(rng() * 4);

        if (style === 0) { // Retro Burst
            ctx.save();
            ctx.translate(W / 2, H / 2 - 40);
            ctx.fillStyle = secondary;
            ctx.strokeStyle = textCol;
            ctx.lineWidth = 5;
            const pts = 8 + Math.floor(rng() * 12);
            ctx.beginPath();
            for (let i = 0; i < pts * 2; i++) {
                const r = i % 2 === 0 ? 150 : 80 + rng() * 40;
                const a = (i * Math.PI) / pts;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        else if (style === 1) { // Floating Shapes
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = secondary;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                const type = rng();
                const sx = rng() * W;
                const sy = rng() * H;
                const size = 30 + rng() * 100;
                if (type > 0.6) ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
                else if (type > 0.3) ctx.rect(sx, sy, size, size);
                else {
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + size, sy);
                    ctx.lineTo(sx + size / 2, sy - size);
                }
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }
        else if (style === 2) { // Typographic Hero
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = secondary;
            ctx.font = 'bold 240px "Inter", sans-serif';
            ctx.fillText(song.title.charAt(0).toUpperCase(), W / 2, H / 2 - 20);
        }
        else { // Abstract Grid
            const grid = 3 + Math.floor(rng() * 3);
            const cell = W / grid;
            for (let x = 0; x < grid; x++) {
                for (let y = 0; y < grid; y++) {
                    if (rng() > 0.4) {
                        ctx.fillStyle = secondary;
                        ctx.globalAlpha = rng();
                        ctx.fillRect(x * cell, y * cell, cell, cell);
                    }
                }
            }
            ctx.globalAlpha = 1.0;
        }

        // 4. Overlays & Texture
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let i = 0; i < 500; i++) {
            ctx.fillRect(rng() * W, rng() * H, 2, 2);
        }
        ctx.globalCompositeOperation = 'source-over';

        // 5. Stylized Footer Label
        ctx.fillStyle = textCol === '#ffffff' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)';
        ctx.fillRect(0, H - 100, W, 100);
        ctx.strokeStyle = textCol;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, H - 100, W, 100);

        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.font = '900 24px sans-serif';
        ctx.fillText(song.title.toUpperCase().substring(0, 18), W / 2, H - 60);
        ctx.font = '600 12px sans-serif';
        ctx.globalAlpha = 0.5;
        ctx.fillText(song.artist.toUpperCase(), W / 2, H - 30);
        ctx.globalAlpha = 1.0;

    }, [song]);

    return (
        <div className="cover-art">
            <canvas ref={canvasRef} width="400" height="400" style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
});

export default AlbumCover;
