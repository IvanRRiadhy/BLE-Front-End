import { useEffect, useRef, useState } from 'react';
import flvjs from 'flv.js';
import Hls from 'hls.js';

interface UniversalVideoPlayerProps {
  streamUrl: string;
  engineWsUrl?: string;
  style?: React.CSSProperties;
}

export default function UniversalVideoPlayer({ 
  streamUrl, 
  engineWsUrl = 'ws://192.168.1.96:8282',
  style
}: UniversalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<flvjs.Player | Hls | null>(null);
  const latencyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    setIsLoading(true);
    setError(null);

    // Helper: Cleanup previous instances when streamUrl changes
    const destroyPlayer = () => {
      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current);
        latencyIntervalRef.current = null;
      }
      
      if (playerRef.current) {
        if (playerRef.current instanceof Hls) {
          playerRef.current.destroy();
        } else {
          // FLV.js destroy logic
          const flvPlayer = playerRef.current as flvjs.Player;
          flvPlayer.pause();
          flvPlayer.unload();
          flvPlayer.detachMediaElement();
          flvPlayer.destroy();
        }
        playerRef.current = null;
      }
    };

    // Clean up any existing player before mounting a new one
    destroyPlayer();

    const videoElement = videoRef.current;

    // -- RTSP / FLV Logic --
    if (streamUrl.startsWith('rtsp://')) {
      if (!flvjs.isSupported()) {
        setError("FLV format is not supported in this browser.");
        return;
      }
      
      const wsEndpoint = `${engineWsUrl}/?url=${encodeURIComponent(streamUrl)}`;
      
      const flvPlayer = flvjs.createPlayer({
        type: 'flv',
        isLive: true,
        hasAudio: false, // Prevents AV sync drift
        url: wsEndpoint
      }, {
        enableWorker: false, // Prevents "undefined constructor" bug
        enableStashBuffer: false,
        stashInitialSize: 128,
        autoCleanupSourceBuffer: true
      });

      flvPlayer.attachMediaElement(videoElement);
      flvPlayer.load();
      const playPromise = flvPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch((e: any) => console.log("Autoplay prevented:", e));
      }
      playerRef.current = flvPlayer;

      // Anti-drift background tab chaser
      latencyIntervalRef.current = setInterval(() => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
          const end = videoRef.current.buffered.end(0);
          const current = videoRef.current.currentTime;
          if (end - current > 2) {
            videoRef.current.currentTime = end;
          }
        }
      }, 2000);

      flvPlayer.on(flvjs.Events.ERROR, (errType: string, errDetail: string) => {
        setError(`FLV.js Error: ${errType} - ${errDetail}`);
        setIsLoading(false);
      });
    } 
    // -- HLS Logic --
    else if (streamUrl.includes('m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({ debug: false, enableWorker: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoElement.play().catch(e => console.log("Autoplay prevented:", e));
        });
        
        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            setError("HLS Error: " + data.type);
            setIsLoading(false);
          }
        });
        playerRef.current = hls;
      } 
      // Safari Native HLS Fallback
      else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = streamUrl;
        videoElement.play().catch(e => console.log("Autoplay prevented:", e));
      } else {
        setError("Your browser does not support HLS video.");
      }
    } else {
      setError("Unsupported stream format. Please use RTSP or HLS.");
      setIsLoading(false);
    }

    // Handle UI loading state
    const handlePlaying = () => setIsLoading(false);
    videoElement.addEventListener('playing', handlePlaying);

    // Cleanup on unmount
    return () => {
      videoElement.removeEventListener('playing', handlePlaying);
      destroyPlayer();
    };
  }, [streamUrl, engineWsUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: 'black', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)', ...style }}>
      <video 
        ref={videoRef} 
        style={{ width: '100%', height: '100%', objectFit: 'contain', outline: 'none' }} 
        controls 
        autoPlay 
        muted 
      />
      
      {isLoading && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '15px' }} />
            <p>Loading stream...</p>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220, 38, 38, 0.9)', color: 'white', padding: '20px', textAlign: 'center', zIndex: 10 }}>
          <p style={{ fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
