import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { fetchWithAuth, API_URL } from '@/lib/api';
import { Loader2, Play, Pause, RotateCcw, RotateCw, Square, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  url: string;
  videoId: string;
  courseId: string;
  onComplete?: () => void;
}

interface ProgressData {
  last_watched_time?: number;
  watched_percentage?: number;
  completed?: boolean;
}

const getGoogleDriveStreamUrl = (url?: string) => {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || 
                url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/id=([a-zA-Z0-9_-]+)/);
  const fileId = match && match[1] ? match[1] : '';
  if (!fileId) return url;
  
  // Route through backend proxy to bypass CORS/CORP block and cookie conflicts
  return `${API_URL}/video/proxy-drive?fileId=${fileId}`;
};

const getGoogleDriveFileId = (url?: string) => {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || 
                url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : '';
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, videoId, courseId, onComplete }) => {
  const playerRef = useRef<ReactPlayer | HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [forceIframe, setForceIframe] = useState(false);

  const isDrive = url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('/uc?id=');
  const isS3 = url.includes('/api/s3/public/') || url.includes('.amazonaws.com');
  const isMkv = url.toLowerCase().includes('.mkv');
  const fileId = getGoogleDriveFileId(url);
  const streamUrl = getGoogleDriveStreamUrl(url);

  // Play natively via HTML5 video element if it is S3, or if it is Drive and not MKV and we haven't toggled iframe fallback.
  const playNatively = isS3 || (isDrive && !isMkv && !useIframeFallback && !forceIframe);

  useEffect(() => {
    setUseIframeFallback(isMkv);
    setIsReady(false);
    setHasResumed(false);
    setLoading(true);
  }, [url, isMkv]);

  const handlePlayPause = () => {
    const video = playerRef.current as HTMLVideoElement | null;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleForward = () => {
    const video = playerRef.current as HTMLVideoElement | null;
    if (!video) return;
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
  };

  const handleBackward = () => {
    const video = playerRef.current as HTMLVideoElement | null;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const handleStop = () => {
    const video = playerRef.current as HTMLVideoElement | null;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
  };

  // Refs for sync access in beforeunload & unmount cleanup
  const progressRef = useRef(0);
  const timeRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch saved progress on mount / videoId change
  useEffect(() => {
    const init = async () => {
      try {
        setForceIframe(false); // Reset on new video
        setLoading(true);
        const data = await fetchWithAuth<ProgressData>(`/progress/${videoId}`);
        if (data) {
          const savedPct = data.watched_percentage || 0;
          const savedTime = data.last_watched_time || 0;
          setLastSavedProgress(savedPct);
          setCurrentProgress(savedPct);
          progressRef.current = savedPct;
          timeRef.current = savedTime;
          if (savedTime > 0) {
            setPendingSeek(savedTime);
          }
        } else {
          setLastSavedProgress(0);
          setCurrentProgress(0);
          progressRef.current = 0;
          timeRef.current = 0;
          setPendingSeek(null);
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [videoId]);

  const saveProgress = useCallback(async (percentage: number, currentTime: number, isCompleted: boolean = false) => {
    try {
      if (!videoId || !courseId) return;
      await fetchWithAuth('/progress/save', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          courseId,
          watchedPercentage: percentage,
          lastWatchedTime: currentTime,
          completed: isCompleted
        })
      });
      setLastSavedProgress(percentage);
      if (isCompleted && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [videoId, courseId, onComplete]);

  // Handle seeking when pendingSeek is loaded
  useEffect(() => {
    if (pendingSeek !== null && playerRef.current && playNatively) {
      const video = playerRef.current as HTMLVideoElement;
      if (video && video.readyState >= 1) {
        video.currentTime = pendingSeek;
        setHasResumed(true);
        setPendingSeek(null);
      }
    }
  }, [pendingSeek, playNatively]);

  // Handle native video events
  const onNativeTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (!video.duration) return;
    const progress = (video.currentTime / video.duration) * 100;
    const percentage = Math.floor(progress);
    setCurrentProgress(percentage);
    progressRef.current = percentage;
    timeRef.current = video.currentTime;

    if (percentage >= lastSavedProgress + 5) {
      saveProgress(percentage, video.currentTime, percentage >= 95);
    }
  };

  const onNativeLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    setDuration(video.duration);
    setIsReady(true);
    setLoading(false);
    if (!hasResumed && pendingSeek !== null) {
      video.currentTime = pendingSeek;
      setHasResumed(true);
      setPendingSeek(null);
    }
  };

  // 2. Save progress on component unmount
  useEffect(() => {
    return () => {
      const finalPct = progressRef.current;
      const finalTime = timeRef.current;
      if (videoId && courseId && finalPct > 0) {
        const body = JSON.stringify({
          videoId,
          courseId,
          watchedPercentage: finalPct,
          lastWatchedTime: finalTime,
          completed: finalPct >= 95
        });
        const token = localStorage.getItem('access_token');
        if (token) {
          fetch(`${API_URL}/progress/save`, {
            method: 'POST',
            body,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }).catch(err => console.error("Error saving progress on unmount:", err));
        }
      }
    };
  }, [videoId, courseId]);

  // Handle Tab Close / Unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!videoId || !courseId) return;
      const body = JSON.stringify({
        videoId,
        courseId,
        watchedPercentage: progressRef.current,
        lastWatchedTime: timeRef.current,
        completed: progressRef.current >= 95
      });
      const token = localStorage.getItem('access_token');
      if (token) {
        fetch(`${API_URL}/progress/save`, {
          method: 'POST',
          body,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          keepalive: true
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [videoId, courseId]);

  return (
    <div className="relative group w-full h-full min-h-[400px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
      {/* Percentage Overlay */}
      <div className="absolute top-4 left-4 z-20 transition-opacity opacity-70 group-hover:opacity-100">
         <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${currentProgress >= 95 ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">
              {currentProgress}% {currentProgress >= 95 ? 'Completed' : 'Watched'}
            </span>
         </div>
      </div>

      {/* Main Video Stream Container */}
      <div className="flex-1 w-full h-full relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {playNatively ? (
          <video
            ref={playerRef as React.RefObject<HTMLVideoElement>}
            src={isDrive ? streamUrl : url}
            className="w-full h-full object-contain cursor-pointer absolute inset-0 rounded-2xl"
            controls
            autoPlay
            onTimeUpdate={onNativeTimeUpdate}
            onLoadedMetadata={onNativeLoadedMetadata}
            onEnded={() => saveProgress(100, duration, true)}
            onPause={() => {
              setIsPlaying(false);
              saveProgress(progressRef.current, timeRef.current, progressRef.current >= 95);
            }}
            onPlay={() => setIsPlaying(true)}
            onError={(e) => {
              console.error("Native video error:", e);
              if (isDrive) {
                console.warn("Native stream failed; falling back to iframe");
                setForceIframe(true);
              }
            }}
            controlsList="nodownload"
          />
        ) : isDrive ? (
          <div className="w-full h-full bg-black rounded-2xl flex flex-col items-center justify-center p-4">
            <iframe
              src={`https://drive.google.com/file/d/${fileId}/preview`}
              className="w-full h-full border-0 rounded-xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
              onLoad={() => setLoading(false)}
            />
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank')}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Drive
              </Button>
            </div>
          </div>
        ) : (
          <ReactPlayer
            ref={playerRef as React.RefObject<ReactPlayer>}
            url={url}
            width="100%"
            height="100%"
            controls
            playing={isPlaying}
            onProgress={(state: { played: number; playedSeconds: number }) => {
              const pct = Math.floor(state.played * 100);
              setCurrentProgress(pct);
              progressRef.current = pct;
              timeRef.current = state.playedSeconds;
              if (pct >= lastSavedProgress + 5) saveProgress(pct, state.playedSeconds, pct >= 95);
            }}
            onReady={() => {
              setLoading(false);
              if (playerRef.current && 'getDuration' in playerRef.current) {
                 setDuration(playerRef.current.getDuration());
                 if (!hasResumed && pendingSeek !== null) {
                   playerRef.current.seekTo(pendingSeek, 'seconds');
                   setHasResumed(true);
                   setPendingSeek(null);
                 }
              }
            }}
            onEnded={() => saveProgress(100, duration, true)}
            onPause={() => saveProgress(progressRef.current, timeRef.current, progressRef.current >= 95)}
            config={{ file: { attributes: { controlsList: 'nodownload', style: { width: '100%', height: '100%', objectFit: 'contain' } } } }}
          />
        )}
      </div>

      {/* Embedded Iframe Premium Manual Sync Bar */}
      {isDrive && useIframeFallback && (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-black/75 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-lg transition-transform duration-300">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
              {isMkv ? "MKV Format (Iframe Preview)" : "Embedded Google Drive Preview"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentProgress < 95 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  saveProgress(100, duration || 0, true);
                  setCurrentProgress(100);
                  progressRef.current = 100;
                }}
                className="bg-primary/20 hover:bg-primary/30 border-primary/30 text-white font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Mark Completed
              </Button>
            ) : (
              <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Lesson Completed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Persistent Bottom Progress Bar (only visible when in native or standard player modes) */}
      {(!isDrive || !useIframeFallback) && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-10">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${currentProgress}%` }} />
        </div>
      )}
    </div>
  );
};
