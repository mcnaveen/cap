import { videos } from "@cap/database/schema";
import { VideoPlayer } from "./VideoPlayer";
import { useState, useEffect, useRef } from "react";
import { Play, Pause, Maximize, VolumeX, Volume2 } from "lucide-react";
import { LogoSpinner } from "@cap/ui";

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const ShareVideo = ({ data }: { data: typeof videos.$inferSelect }) => {
  const video2Ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [longestDuration, setLongestDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [videoMetadataLoaded, setVideoMetadataLoaded] = useState(false);

  useEffect(() => {
    if (videoMetadataLoaded) {
      console.log("Metadata loaded");
      setIsLoading(false);
    }
  }, [videoMetadataLoaded]);

  useEffect(() => {
    const onVideoLoadedMetadata = () => {
      console.log("Video metadata loaded");
      setVideoMetadataLoaded(true);
      if (video2Ref.current) {
        setLongestDuration(video2Ref.current.duration);
      }
    };

    const videoElement = video2Ref.current;

    videoElement?.addEventListener("loadedmetadata", onVideoLoadedMetadata);

    return () => {
      videoElement?.removeEventListener(
        "loadedmetadata",
        onVideoLoadedMetadata
      );
    };
  }, []);

  const handlePlayPauseClick = async () => {
    setIsPlaying(!isPlaying);

    const videoElement = video2Ref.current;

    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      try {
        await videoElement.play();
      } catch (error) {
        console.error("Error with playing:", error);
        setIsPlaying(false); // Revert the isPlaying state on error
      }
    }
  };

  const applyTimeToVideos = (time: number) => {
    if (video2Ref.current) video2Ref.current.currentTime = time;
    setCurrentTime(time);
  };

  // Update useEffect for playback synchronization
  useEffect(() => {
    const syncPlayback = () => {
      const videoElement = video2Ref.current;

      if (!isPlaying || isLoading || !videoElement) return;

      const handleTimeUpdate = () => {
        // Avoid setting state on every time update to reduce re-renders
        setCurrentTime(videoElement.currentTime);
      };

      videoElement.play().catch((error) => {
        console.error("Error playing video", error);
        setIsPlaying(false);
      });
      videoElement.addEventListener("timeupdate", handleTimeUpdate);

      return () =>
        videoElement.removeEventListener("timeupdate", handleTimeUpdate);
    };

    syncPlayback();
  }, [isPlaying, isLoading]); // Add isLoading to the dependency array

  // Add a useEffect for seeking behavior
  useEffect(() => {
    const handleSeeking = () => {
      if (seeking && video2Ref.current) {
        // Optional: add throttling here to reduce frequency of seek updates
        setCurrentTime(video2Ref.current.currentTime);
      }
    };

    const videoElement = video2Ref.current;

    videoElement?.addEventListener("seeking", handleSeeking);

    return () => {
      videoElement?.removeEventListener("seeking", handleSeeking);
    };
  }, [seeking]); // seeking state controls when this effect re-runs

  const calculateNewTime = (event: any, seekBar: any) => {
    const rect = seekBar.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const relativePosition = offsetX / rect.width;
    return relativePosition * longestDuration;
  };

  // Changes specifically in handleSeekMouseMove, handleSeekMouseUp to use applyTimeToVideos directly
  const handleSeekMouseUp = (event: any) => {
    // Similar change as handleSeekMouseMove, no need for isPlaying check here
    if (!seeking) return;
    setSeeking(false);
    const seekBar = event.currentTarget;
    const seekTo = calculateNewTime(event, seekBar);
    applyTimeToVideos(seekTo);
    if (isPlaying) {
      video2Ref.current?.play();
    }
  };

  const handleMuteClick = () => {
    if (video2Ref.current) {
      console.log("Mute clicked");
      video2Ref.current.muted = video2Ref.current.muted ? false : true;
    }
  };

  const handleFullscreenClick = () => {
    const player = document.getElementById("player");
    if (!document.fullscreenElement) {
      player
        ?.requestFullscreen()
        .catch((err) =>
          console.error(
            `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
          )
        );
    } else {
      document.exitFullscreen();
    }
  };

  const watchedPercentage =
    longestDuration > 0 ? (currentTime / longestDuration) * 100 : 0;

  useEffect(() => {
    if (isPlaying) {
      video2Ref.current?.play();
    } else {
      video2Ref.current?.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const syncPlay = () => {
      if (video2Ref.current && !isLoading) {
        const playPromise2 = video2Ref.current.play();
        playPromise2.catch((e) => console.log("Play failed for video 2", e));
      }
    };

    if (isPlaying) {
      syncPlay();
    }
  }, [isPlaying, isLoading]);

  return (
    <div
      className="relative flex h-full w-full overflow-hidden shadow-lg rounded-lg group"
      id="player"
    >
      {isLoading && (
        <div className="absolute top-0 left-0 flex items-center justify-center w-full h-full z-10">
          <LogoSpinner className="w-10 h-auto animate-spin" />
        </div>
      )}
      {isLoading === false && (
        <div
          className={`absolute top-0 left-0 w-full h-full z-10 flex items-center justify-center bg-black bg-opacity-50 transition-all opacity-0 group-hover:opacity-100 z-20`}
        >
          <button
            aria-label="Play video"
            className=" w-full h-full flex items-center justify-center text-sm font-medium transition ease-in-out duration-150 text-white border border-transparent px-2 py-2 justify-center rounded-lg"
            tabIndex={0}
            type="button"
            onClick={() => handlePlayPauseClick()}
          >
            {isPlaying ? (
              <Pause className="w-auto h-14 hover:opacity-50" />
            ) : (
              <Play className="w-auto h-14 hover:opacity-50" />
            )}
          </button>
        </div>
      )}
      <div
        className="relative block w-full h-full rounded-lg bg-black"
        style={{ paddingBottom: "min(806px, 56.25%)" }}
      >
        <VideoPlayer
          ref={video2Ref}
          videoStartTime={data.videoStartTime}
          audioStartTime={data.audioStartTime}
          videoSrc={`${process.env.NEXT_PUBLIC_URL}/api/playlist?userId=${data.ownerId}&videoId=${data.id}&videoType=screen`}
          audioSrc={`${process.env.NEXT_PUBLIC_URL}/api/playlist?userId=${data.ownerId}&videoId=${data.id}&videoType=audio`}
        />
      </div>
      <div className="absolute bottom-0 z-20 w-full text-white bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-all">
        <div
          id="seek"
          className="drag-seek absolute left-0 right-0 block h-4 mx-4 -mt-2 group z-20 cursor-pointer"
          onMouseUp={handleSeekMouseUp}
          onMouseLeave={() => setSeeking(false)}
          onTouchEnd={handleSeekMouseUp}
        >
          <div className="absolute top-1.5 w-full h-1 bg-white bg-opacity-50 rounded-full z-0" />
          <div
            className="absolute top-1.5 h-1 bg-white rounded-full cursor-pointer transition-all duration-300 z-0"
            style={{ width: `${watchedPercentage}%` }}
          />
          <div
            className="drag-button absolute top-1.5 z-10 -mt-1.5 -ml-2 w-4 h-4 bg-white rounded-full border border-white cursor-pointer focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-80 focus:outline-none transition-all duration-300"
            tabIndex={0}
            style={{ left: `${watchedPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-3">
            <div>
              <span className="inline-flex">
                <button
                  aria-label="Play video"
                  className=" inline-flex items-center text-sm font-medium transition ease-in-out duration-150 focus:outline-none border text-slate-100 border-transparent hover:text-white focus:border-white hover:bg-slate-100 hover:bg-opacity-10 active:bg-slate-100 active:bg-opacity-10 px-2 py-2 justify-center rounded-lg"
                  tabIndex={0}
                  type="button"
                  onClick={() => handlePlayPauseClick()}
                >
                  {isPlaying ? (
                    <Pause className="w-auto h-6" />
                  ) : (
                    <Play className="w-auto h-6" />
                  )}
                </button>
              </span>
            </div>
            <div className="text-sm text-white font-medium select-none tabular text-clip overflow-hidden whitespace-nowrap space-x-0.5">
              {formatTime(currentTime)} - {formatTime(longestDuration)}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <div className="flex items-center justify-end space-x-2">
              <span className="inline-flex">
                <button
                  aria-label="Mute video"
                  className=" inline-flex items-center text-sm font-medium transition ease-in-out duration-150 focus:outline-none border text-slate-100 border-transparent hover:text-white focus:border-white hover:bg-slate-100 hover:bg-opacity-10 active:bg-slate-100 active:bg-opacity-10 px-2 py-2 justify-center rounded-lg"
                  tabIndex={0}
                  type="button"
                  onClick={() => handleMuteClick()}
                >
                  {video2Ref?.current?.muted ? (
                    <VolumeX className="w-auto h-6" />
                  ) : (
                    <Volume2 className="w-auto h-6" />
                  )}
                </button>
              </span>
              <span className="inline-flex">
                <button
                  aria-label="Go fullscreen"
                  className=" inline-flex items-center text-sm font-medium transition ease-in-out duration-150 focus:outline-none border text-slate-100 border-transparent hover:text-white focus:border-white hover:bg-slate-100 hover:bg-opacity-10 active:bg-slate-100 active:bg-opacity-10 px-2 py-2 justify-center rounded-lg"
                  tabIndex={0}
                  type="button"
                  onClick={handleFullscreenClick}
                >
                  <Maximize className="w-auto h-6" />
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
