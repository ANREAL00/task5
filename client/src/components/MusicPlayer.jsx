import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, Square, Loader2, Music } from 'lucide-react';
import seedrandom from 'seedrandom';
import * as mm from '@magenta/music/es6';

let rnnModel = null;
let isModelInitialized = false;

const globalSequenceCache = new Map();

const MusicPlayer = ({ song, lyrics, onWordIndexChange }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const synthRef = useRef(null);
    const drumsRef = useRef(null);
    const sequenceRef = useRef(null);
    const isPlayingRef = useRef(false);
    const lyricsRef = useRef(lyrics);

    useEffect(() => {
        lyricsRef.current = lyrics;
    }, [lyrics]);

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

    const runPlaybackLoop = () => {
        if (!isPlayingRef.current) return;

        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        setProgress(0);
        if (onWordIndexChange) onWordIndexChange(-1);

        const currentLyrics = lyricsRef.current;
        const utter = new SpeechSynthesisUtterance(currentLyrics);

        utter.voice = getBestVoice();
        utter.pitch = 0.7 + (Math.abs(song.mediaSeed.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 30) / 100;
        utter.rate = 0.85;

        utter.onboundary = (event) => {
            if (event.name === 'word') {
                if (onWordIndexChange) {
                    const textSoFar = currentLyrics.substring(0, event.charIndex);
                    const wordCount = textSoFar.split(/\s+/).filter(x => x.length > 0).length;
                    onWordIndexChange(wordCount);
                }
            }
        };

        utter.onerror = (e) => {
            console.warn("Speech error:", e);
        };

        Tone.Transport.start("+0.1");
        window.speechSynthesis.speak(utter);
    };

    const startPlayback = async () => {
        setIsLoading(true);
        try {
            await Tone.start();
            if (Tone.context.state !== 'running') await Tone.context.resume();
            await initModel();

            Tone.Transport.stop();
            Tone.Transport.cancel();

            let genSeq;
            if (globalSequenceCache.has(song.mediaSeed)) {
                genSeq = globalSequenceCache.get(song.mediaSeed);
            } else {
                const numericSeed = Math.abs(song.mediaSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
                seedrandom(numericSeed.toString(), { global: true });

                const unquantizedPrimer = {
                    notes: [{ pitch: 60, startTime: 0, endTime: 0.5 }],
                    totalTime: 0.5
                };
                const primer = mm.sequences.quantizeNoteSequence(unquantizedPrimer, 4);
                const steps = 32;
                genSeq = await rnnModel.continueSequence(primer, steps, 1.0);
                globalSequenceCache.set(song.mediaSeed, genSeq);
            }

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
            seq.loopEnd = 32 * 0.25;
            seq.start(0);
            sequenceRef.current = seq;

            const drumRng = seedrandom(song.mediaSeed);
            const repeatId = Tone.Transport.scheduleRepeat((time) => {
                kick.triggerAttackRelease("C1", "8n", time);
                if (drumRng() > 0.3) hats.triggerAttackRelease(time);
            }, "4n");
            drumsRef.current.repeatId = repeatId;

            const PLAYBACK_DURATION = 17;
            const progressLoop = Tone.Transport.scheduleRepeat(() => {
                const current = Tone.Transport.seconds;
                if (current >= PLAYBACK_DURATION) {
                    stopPlayback();
                    return;
                }
                setProgress((current / PLAYBACK_DURATION) * 100);
            }, "16n");

            Tone.Transport.schedule(() => {
                stopPlayback();
            }, `+${PLAYBACK_DURATION}`);

            isPlayingRef.current = true;
            setIsPlaying(true);
            runPlaybackLoop();

        } catch (error) {
            console.error("Neural playback failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const stopPlayback = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setProgress(0);
        if (onWordIndexChange) onWordIndexChange(-1);

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

    return (
        <div className="player-controls-container">
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
                        <span>Preview</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-filled" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            <style>{`
                .player-controls-container { margin-bottom: 16px; width: 100%; }
                .player-controls { display: flex; align-items: center; gap: 16px; width: 100%; }
                .player-title { font-size: 13px; font-weight: 600; color: #1e40af; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
                .icon-beat { animation: beat 0.8s infinite; }
                @keyframes beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                .progress-bar { flex-grow: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; position: relative; }
                .progress-filled { height: 100%; background: #3b82f6; transition: width 0.1s linear; box-shadow: 0 0 8px rgba(59, 130, 246, 0.5); }
            `}</style>
        </div>
    );
};

export default MusicPlayer;
