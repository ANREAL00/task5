import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, Square, Loader2, Music } from 'lucide-react';
import seedrandom from 'seedrandom';
import * as mm from '@magenta/music/es6';

// Aggressive Console Cleanup for Magenta/TFJS spam
(function silenceNoise() {
    const originalWarn = console.warn;
    const originalLog = console.log;
    console.warn = (...args) => {
        const msg = args.join(' ');
        if (msg.includes('kernel') && msg.includes('registered')) return;
        if (msg.includes('Platform browser')) return;
        originalWarn.apply(console, args);
    };
    console.log = (...args) => {
        const msg = args.join(' ');
        if (msg.includes('MusicRNN') && msg.includes('Initialized')) return;
        originalLog.apply(console, args);
    };
})();

let rnnModel = null;
let isModelInitialized = false;

const MusicPlayer = ({ song }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const synthRef = useRef(null);
    const drumsRef = useRef(null);
    const sequenceRef = useRef(null);
    const utterRef = useRef(null);

    const getBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;
        return voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0];
    };

    const initModel = async () => {
        window.speechSynthesis.getVoices();
        if (!rnnModel) {
            try { window.localStorage.setItem('tfjs_loglevel', '3'); } catch (e) { }
            rnnModel = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
        }
        if (!isModelInitialized) {
            await rnnModel.initialize();
            isModelInitialized = true;
        }
    };

    const startPlayback = async () => {
        setIsLoading(true);
        setCurrentWordIndex(-1);
        try {
            await Tone.start();
            if (Tone.context.state !== 'running') await Tone.context.resume();

            await initModel();

            Tone.Transport.stop();
            Tone.Transport.cancel();

            const rng = seedrandom(song.mediaSeed);
            const unquantizedPrimer = {
                notes: [{ pitch: 60, startTime: 0, endTime: 0.5 }],
                totalTime: 0.5
            };
            const primer = mm.sequences.quantizeNoteSequence(unquantizedPrimer, 4);

            const steps = 32;
            const genSeq = await rnnModel.continueSequence(primer, steps, 1.2);

            const synth = new Tone.PolySynth(Tone.Synth).toDestination();
            synth.set({
                oscillator: { type: 'fatsawtooth', count: 3, spread: 35 },
                envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 2 }
            });
            synth.volume.value = -14;

            const reverb = new Tone.Reverb({ decay: 5, wet: 0.45 }).toDestination();
            synth.connect(reverb);
            synthRef.current = synth;

            const kick = new Tone.MembraneSynth({ volume: -4 }).toDestination();
            const hats = new Tone.MetalSynth({ envelope: { decay: 0.05 }, volume: -28 }).toDestination();
            drumsRef.current = { kick, hats };

            const toneNotes = genSeq.notes.map(n => ({
                time: Math.max(0, n.quantizedStartStep * 0.25),
                pitch: Tone.Frequency(n.pitch, "midi").toNote(),
                duration: Math.max(0.1, (n.quantizedEndStep - n.quantizedStartStep) * 0.25)
            }));

            const seq = new Tone.Part((time, note) => {
                synth.triggerAttackRelease(note.pitch, note.duration, time);
            }, toneNotes);
            seq.loop = true;
            seq.loopEnd = steps * 0.25;
            sequenceRef.current = seq;

            const repeatId = Tone.Transport.scheduleRepeat((time) => {
                kick.triggerAttackRelease("C1", "8n", time);
                if (rng() > 0.3) hats.triggerAttackRelease(time);
            }, "4n");
            drumsRef.current.repeatId = repeatId;

            // DIGITAL VOCALIST WITH LYRICS SYNC
            const utter = new SpeechSynthesisUtterance(song.review);
            utter.voice = getBestVoice();
            utter.pitch = 0.7 + rng() * 0.3;
            utter.rate = 0.85;

            // Sync current word
            utter.onboundary = (event) => {
                if (event.name === 'word') {
                    const textSoFar = song.review.substring(0, event.charIndex);
                    const wordCount = textSoFar.split(/\s+/).filter(x => x.length > 0).length;
                    setCurrentWordIndex(wordCount);
                }
            };

            utter.onend = () => setCurrentWordIndex(-1);
            utterRef.current = utter;

            Tone.Transport.start("+0.1");
            seq.start(0);
            window.speechSynthesis.speak(utter);
            setIsPlaying(true);
        } catch (error) {
            console.error("Neural playback failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const stopPlayback = () => {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
        try {
            if (sequenceRef.current) sequenceRef.current.stop(0);
            if (drumsRef.current?.repeatId !== undefined) Tone.Transport.clear(drumsRef.current.repeatId);
        } catch (e) { }
        Tone.Transport.stop();
        Tone.Transport.cancel();
        window.speechSynthesis.cancel();
    };

    useEffect(() => {
        return () => stopPlayback();
    }, []);

    const words = song.review.split(/\s+/);

    return (
        <div className="player-container">
            <div className="player-controls">
                {isLoading ? (
                    <Loader2 size={28} className="spin" color="#3b82f6" />
                ) : isPlaying ? (
                    <Square size={28} fill="#ef4444" color="#ef4444" className="player-btn" onClick={stopPlayback} />
                ) : (
                    <Play size={28} fill="#3b82f6" color="#3b82f6" className="player-btn" onClick={startPlayback} />
                )}

                <div className="player-meta">
                    <div className="player-title">
                        <Music size={14} className="icon-beat" />
                        <span>{isLoading ? 'Composing...' : 'Neural Preview'}</span>
                    </div>
                    <div className="progress-bar">
                        <div className={`progress-filled ${isPlaying ? 'is-playing' : ''}`}></div>
                    </div>
                </div>
            </div>

            <div className="lyrics-box">
                <div className="lyrics-header">LYRICS (SYNCED)</div>
                <div className="lyrics-content">
                    {words.map((word, i) => (
                        <span key={i} className={`vocal-word ${i === currentWordIndex ? 'active' : ''}`}>
                            {word}{' '}
                        </span>
                    ))}
                </div>
            </div>

            <style>{`
                .player-container { display: flex; flex-direction: column; gap: 12px; }
                .player-controls { display: flex; align-items: center; gap: 16px; }
                .player-title { font-size: 13px; font-weight: 600; color: #1e40af; display: flex; align-items: center; gap: 6px; }
                .icon-beat { animation: beat 0.8s infinite; }
                @keyframes beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                
                .lyrics-box {
                    background: rgba(255, 255, 255, 0.5);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 8px;
                    padding: 10px;
                    max-height: 100px;
                    overflow-y: auto;
                    backdrop-filter: blur(4px);
                }
                .lyrics-header { font-size: 10px; font-weight: 800; color: #3b82f6; margin-bottom: 4px; letter-spacing: 1px; }
                .lyrics-content { font-size: 13px; line-height: 1.6; color: #4b5563; }
                .vocal-word { transition: all 0.2s; }
                .vocal-word.active {
                    color: #2563eb;
                    font-weight: 800;
                    text-shadow: 0 0 8px rgba(37, 99, 235, 0.4);
                    background: rgba(37, 99, 235, 0.1);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default MusicPlayer;
