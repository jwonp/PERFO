"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import type { ScannerStatus, UseQrScannerArgs, UseQrScannerResult } from "./scan.types";

export const useQrScanner = ({
    onDecodedText,
}: UseQrScannerArgs): UseQrScannerResult => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);
    const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");

    useEffect(() => {
        if (typeof window === "undefined" || !videoRef.current) {
            return;
        }

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        reader
            .decodeFromVideoDevice(undefined, videoRef.current, (resultValue, error) => {
                if (resultValue) {
                    onDecodedText(resultValue.getText());
                    return;
                }

                if (error && !(error instanceof Error && error.name === "NotFoundException")) {
                    setScannerStatus("error");
                }
            })
            .then((controls) => {
                controlsRef.current = controls;
                setScannerStatus("ready");
            })
            .catch(() => {
                setScannerStatus("blocked");
            });

        return () => {
            controlsRef.current?.stop();
            controlsRef.current = null;
            readerRef.current = null;
        };
    }, [onDecodedText]);

    return {
        videoRef,
        scannerStatus,
    };
};
