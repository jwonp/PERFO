"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resultLabelKey } from "./scan.func";
import type { UseScanAudioResult } from "./scan.types";

export const useScanAudio = (): UseScanAudioResult => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const primeAudio = useCallback(async (force = false) => {
        if (typeof window === "undefined" || (!force && !soundEnabled)) {
            return null;
        }

        const AudioContextClass =
            window.AudioContext ??
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state === "suspended") {
            try {
                await audioContextRef.current.resume();
            } catch {
                return null;
            }
        }

        return audioContextRef.current;
    }, [soundEnabled]);

    const playResultTone = useCallback(async (status: string) => {
        if (status !== "SUCCESS" && !resultLabelKey(status)) {
            return;
        }

        const audioContext = await primeAudio();
        if (!audioContext || audioContext.state !== "running") {
            return;
        }

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = status === "SUCCESS" ? "sine" : "square";
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0.0001, now);

        if (status === "SUCCESS") {
            oscillator.frequency.setValueAtTime(1046, now);
            gainNode.gain.exponentialRampToValueAtTime(0.075, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.18);
            return;
        }

        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.setValueAtTime(180, now + 0.12);
        gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        gainNode.gain.setValueAtTime(0.0001, now + 0.11);
        gainNode.gain.exponentialRampToValueAtTime(0.075, now + 0.14);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        oscillator.start(now);
        oscillator.stop(now + 0.28);
    }, [primeAudio]);

    const toggleSoundEnabled = useCallback(async () => {
        const nextValue = !soundEnabled;
        setSoundEnabled(nextValue);
        if (nextValue) {
            await primeAudio(true);
        }
    }, [primeAudio, soundEnabled]);

    useEffect(() => {
        return () => {
            void audioContextRef.current?.close();
        };
    }, []);

    return {
        soundEnabled,
        primeAudio,
        playResultTone,
        toggleSoundEnabled,
    };
};
