"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { isRecoverableScannerError, resolveScannerFailureStatus } from "./scan.func";
import type { ScannerStatus, UseQrScannerArgs, UseQrScannerResult } from "./scan.types";

const isJsdomEnvironment = () => (
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)
);

export const useQrScanner = ({
    onDecodedText,
}: UseQrScannerArgs): UseQrScannerResult => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");

    useEffect(() => {
        if (typeof window === "undefined" || !videoRef.current || !navigator.mediaDevices?.getUserMedia) {
            return;
        }

        let cancelled = false;
        const reader = new BrowserMultiFormatReader();
        const videoElement = videoRef.current;

        const startScanner = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                    },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                const controls = await reader.decodeFromStream(stream, videoElement, (resultValue, error) => {
                    if (resultValue) {
                        onDecodedText(resultValue.getText());
                        return;
                    }

                    if (error && !isRecoverableScannerError(error)) {
                        setScannerStatus("error");
                    }
                });

                if (cancelled) {
                    controls.stop();
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                controlsRef.current = controls;
                setScannerStatus("ready");
            } catch (error) {
                if (!cancelled) {
                    setScannerStatus(resolveScannerFailureStatus(error));
                }
            }
        };

        void startScanner();

        return () => {
            cancelled = true;
            controlsRef.current?.stop();
            controlsRef.current = null;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            if (videoElement) {
                try {
                    if (!isJsdomEnvironment()) {
                        videoElement.pause();
                    }
                } catch {
                    // Some test environments do not implement HTMLMediaElement.pause().
                } finally {
                    videoElement.srcObject = null;
                }
            }
        };
    }, [onDecodedText]);

    return {
        videoRef,
        scannerStatus,
    };
};
