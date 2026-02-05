import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, Square } from 'lucide-react';
import seedrandom from 'seedrandom';

const MusicPlayer = ({ song }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const synthRef = useRef(null);
    const sequenceRef = useRef(null);

    const startPlayback = async () => {
        await Tone.start();

        if (!synthRef.current) {
            const rng = seedrandom(song.mediaSeed);

            const scales = [
                ['C4', 'E4', 'G4', 'B4', 'D5'],
                ['A3', 'C4', 'E4', 'G4', 'B4'],
                ['F3', 'A3', 'C4', 'E4', 'G4', 'B4'],
                ['G3', 'B3', 'D4', 'F4', 'A4'],
            ];
            const selectedScale = scales[Math.floor(rng() * scales.length)];

            const synth = new Tone.PolySynth(Tone.Synth).toDestination();
            synth.set({
                envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 1.5 },
                oscillator: { type: 'triangle' }
            });
            synth.volume.value = -12;

            const reverb = new Tone.Reverb(2.5).toDestination();
            synth.connect(reverb);

            synthRef.current = synth;

            const pattern = Array.from({ length: 16 }, () => {
                const draw = rng();
                if (draw > 0.6) return selectedScale[Math.floor(rng() * selectedScale.length)];
                if (draw > 0.4) return selectedScale[0];
                return null;
            });

            const seq = new Tone.Sequence((time, note) => {
                if (note) {
                    synth.triggerAttackRelease(note, '16n', time);
                }
            }, pattern, '16n');

            sequenceRef.current = seq;
        }

        Tone.Transport.start();
        sequenceRef.current.start(0);
        setIsPlaying(true);
    };

    const stopPlayback = () => {
        Tone.Transport.stop();
        if (sequenceRef.current) sequenceRef.current.stop();
        setIsPlaying(false);
    };

    useEffect(() => {
        return () => {
            stopPlayback();
            if (synthRef.current) {
                synthRef.current.dispose();
            }
            if (sequenceRef.current) {
                sequenceRef.current.dispose();
            }
        };
    }, []);

    return (
        <div className="player-controls">
            {isPlaying ? (
                <Square
                    size={28}
                    fill="#3b82f6"
                    color="#3b82f6"
                    className="player-btn"
                    onClick={stopPlayback}
                />
            ) : (
                <Play
                    size={28}
                    fill="#3b82f6"
                    color="#3b82f6"
                    className="player-btn"
                    onClick={startPlayback}
                />
            )}
            <div className="player-meta">
                <label>Song preview</label>
                <div className="progress-bar">
                    <div className={`progress-filled ${isPlaying ? 'is-playing' : ''}`}></div>
                </div>
            </div>
        </div>
    );
};

export default MusicPlayer;
