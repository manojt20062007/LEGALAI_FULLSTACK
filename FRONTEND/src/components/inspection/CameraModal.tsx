"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, AlertCircle, Check } from "lucide-react";
import { Button } from "../ui/Button";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera(facingMode);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setLocationError("Location access denied or unavailable. Image will be captured without verified geo-tag.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: "environment" | "user") => {
    stopCamera();
    setCameraError(null);
    setIsStarting(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported on this browser or requires HTTPS.");
      setIsStarting(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Camera init error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device found on this device.");
      } else {
        // Try fallback with simple constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
          }
        } catch (fbErr: any) {
          setCameraError("Unable to access camera: " + (fbErr.message || "Unknown error"));
        }
      }
    } finally {
      setIsStarting(false);
    }
  };

  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const geoText = location
      ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`
      : "Location: Not Verified";
    
    const watermarkText = `Timestamp: ${timestamp} | ${geoText}`;
    
    // Draw semi-transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    const stripHeight = Math.max(40, Math.floor(height * 0.05));
    ctx.fillRect(0, height - stripHeight, width, stripHeight);
    
    // Draw text
    ctx.fillStyle = "white";
    const fontSize = Math.max(14, Math.floor(stripHeight * 0.5));
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = "middle";
    ctx.fillText(watermarkText, 20, height - (stripHeight / 2));
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `label_scan_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        stopCamera();
        onCapture(capturedFile);
        onClose();
      },
      "image/jpeg",
      0.95
    );
  };

  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const handleNativeCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);
        drawWatermark(ctx, canvas.width, canvas.height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const watermarkedFile = new File([blob], `label_scan_${Date.now()}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            stopCamera();
            onCapture(watermarkedFile);
            onClose();
          },
          "image/jpeg",
          0.95
        );
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      {/* Hidden Native Camera Input Fallback */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraChange}
        className="hidden"
        id="camera-fallback-input"
      />

      <div className="relative w-full max-w-lg bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-sm">Scan Product Label</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Window */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black flex items-center justify-center overflow-hidden">
          {locationError && !cameraError && (
            <div className="absolute top-2 left-2 right-2 z-20 bg-amber-500/90 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm shadow-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{locationError}</span>
            </div>
          )}
          {cameraError ? (
            <div className="p-6 text-center text-slate-200 space-y-4 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center mx-auto border border-blue-700/50">
                <Camera className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">Launch Device Camera</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Web browser camera access requires a local session or HTTPS. Tap below to snap a photo using your phone&apos;s native camera.
                </p>
              </div>
              
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 shadow-md text-xs sm:text-sm"
                >
                  <Camera className="w-4 h-4 mr-1.5" />
                  Snap with Phone Camera
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startCamera(facingMode)}
                  className="text-slate-400 border-slate-700 hover:bg-slate-800 text-xs"
                >
                  Retry Browser Stream
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Targeting Overlay Frame */}
              <div className="absolute inset-8 border-2 border-blue-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400 -mt-1 -ml-1"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400 -mt-1 -mr-1"></div>
                </div>
                <div className="text-center">
                  <span className="bg-black/60 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs">
                    Align mandatory declaration box inside frame
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400 -mb-1 -ml-1"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400 -mb-1 -mr-1"></div>
                </div>
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>


        {/* Controls Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleCamera}
            disabled={!stream}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            title="Switch Camera"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            <span className="text-xs">Flip</span>
          </Button>

          {/* Shutter Button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={!stream || isStarting}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50"
            aria-label="Capture Label Photo"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700"></div>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
