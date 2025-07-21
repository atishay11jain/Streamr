import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

export const HomePage = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stream, setStream] = useState(null);
  const [streamKey, setStreamKey] = useState("rtmp://a.rtmp.youtube.com/live2/vq7w-ab6b-rd6w-bf6h-251d");
  const [socket, setSocket] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080 },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    const initSocket = () => {
      console.log("Connecting to socket server...");
      const socketConnection = io("http://localhost:3000");
      
      socketConnection.on("connect", () => {
        console.log("Connected to server ", socketConnection.id);
      });

      socketConnection.on("disconnect", () => {
        console.log("Disconnected from server ", socketConnection.id);
      });

      socketConnection.on("error", (error) => {
        console.error("Socket error:", error);
      });

    setSocket(socketConnection);
    };

    initCamera();
    initSocket();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleStartStream = () => {
    if (!stream || !socket) {
      alert("Camera or socket connection not available.");
      return;
    }

    setIsConnecting(true);

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9,opus",
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          const reader = new FileReader();
          reader.onload = () => {
            socket.emit('video-stream', {
              data: reader.result,
              streamKey: streamKey
            });
          };
          reader.readAsArrayBuffer(event.data);
        }
      };
      recorder.onstart = () => {
        setIsStreaming(true);
        setIsConnecting(false);
      };
      recorder.start(1000); // Send data every second
      setMediaRecorder(recorder);
    } catch (error) {
      console.error("Error starting stream:", error);
    }
  };

  const handleStopStream = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsStreaming(false);
      setMediaRecorder(null);
    }
  };

  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-[#221112] overflow-x-hidden"
      style={{ fontFamily: '"Be Vietnam Pro", "Noto Sans", sans-serif' }}
    >
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#472426] px-10 py-3">
          <div className="flex items-center gap-4 text-white">
            <div className="size-4">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
              Streamr
            </h2>
          </div>
        </header>        
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[660px] flex-1">
            <div className="p-4">
              <div className="relative flex items-center justify-center bg-[#e92932] bg-cover bg-center aspect-video rounded-xl p-4 overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover rounded-xl"
                />
                {isStreaming && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    LIVE
                  </div>
                )}
                {isConnecting && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white font-medium">
                        Connecting to YouTube...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex flex-1 gap-6 flex-wrap px-4 py-4 max-w-[380px] justify-center">
                <button
                  onClick={handleStartStream}
                  disabled={isStreaming || isConnecting}
                  className={`flex min-w-[84px] max-w-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 text-sm font-bold leading-normal tracking-[0.015em] grow transition-colors ${
                    isStreaming || isConnecting
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-[#e92932] text-white hover:bg-[#d11e28]"
                  }`}
                >
                  <span className="truncate">
                    {isConnecting
                      ? "Connecting..."
                      : isStreaming
                      ? "Streaming Live"
                      : "Start Stream"}
                  </span>
                </button>
                <button
                  onClick={handleStopStream}
                  disabled={!isStreaming}
                  className={`flex min-w-[84px] max-w-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 text-sm font-bold leading-normal tracking-[0.015em] grow transition-colors ${
                    !isStreaming
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-[#472426] text-white hover:bg-[#5a2e31]"
                  }`}
                >
                  <span className="truncate">Stop Stream</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
