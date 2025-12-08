// src/components/CameraCapture.jsx
import { useEffect, useRef, useState } from "react";

/**
 * Simple camera component:
 * - Starts webcam on mount
 * - Shows live video
 * - Provides `capture()` to parent via ref callback
 */
export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (!isMounted) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Could not access camera. Check permissions.");
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        // Pass the blob back to parent
        onCapture(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="border rounded overflow-hidden bg-black flex justify-center">
        {error ? (
          <div className="p-4 text-red-600 text-center">{error}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full"
            style={{ maxHeight: "320px" }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={handleCapture}
        className="self-start mt-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Capture from Camera
      </button>
    </div>
  );
}
