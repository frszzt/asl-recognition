import { useRef, useEffect, useState } from 'react'

interface CameraFeedProps {
  onFrame: (videoElement: HTMLVideoElement) => void
  width?: number
  height?: number
  enabled?: boolean
  onError?: (error: string) => void
}

const CameraFeed = ({
  onFrame,
  width = 640,
  height = 480,
  enabled = true,
  onError
}: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [useRealSense, setUseRealSense] = useState(false)

  useEffect(() => {
    let animationId: number | null = null

    const setupCamera = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Try RealSense first if available
        const realSense = await checkRealSenseAvailable()

        if (realSense && useRealSense) {
          await setupRealSenseCamera()
        } else {
          await setupWebRTCCamera()
        }

        setIsLoading(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        onError?.(errorMessage)
        setIsLoading(false)
      }
    }

    const checkRealSenseAvailable = async (): Promise<boolean> => {
      // Check if RealSense device is available via WebUSB
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.some(device =>
          device.label.toLowerCase().includes('realsense') ||
          device.label.toLowerCase().includes('intel')
        )
      } catch {
        return false
      }
    }

    const setupWebRTCCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user'
        },
        audio: false
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
        startFrameLoop()
      }
    }

    const setupRealSenseCamera = async () => {
      // For RealSense, we'd use the librealsense2 library
      // For now, this is a placeholder that falls back to WebRTC
      console.log('RealSense setup requested, falling back to WebRTC')
      await setupWebRTCCamera()
    }

    const startFrameLoop = () => {
      const processFrame = () => {
        if (videoRef.current && enabled) {
          onFrame(videoRef.current)

          // Draw to canvas for preview
          if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, width, height)
            }
          }
        }
        animationId = requestAnimationFrame(processFrame)
      }
      animationId = requestAnimationFrame(processFrame)
    }

    const stopCamera = () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
      setCameraActive(false)
    }

    if (enabled) {
      setupCamera()
    }

    return () => {
      stopCamera()
    }
  }, [enabled, useRealSense, onFrame, width, height, onError])

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
      {/* Hidden video element for processing */}
      <video
        ref={videoRef}
        className="hidden"
        width={width}
        height={height}
        playsInline
      />

      {/* Canvas for display */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-lg">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center text-white p-6 max-w-md">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-bold mb-2">Camera Error</h3>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Camera status indicator */}
      {cameraActive && !isLoading && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-white text-sm">Live</span>
        </div>
      )}

      {/* Camera toggle button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setUseRealSense(!useRealSense)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            useRealSense
              ? 'bg-primary-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-white'
          }`}
        >
          {useRealSense ? '📷 RealSense' : '📹 Webcam'}
        </button>
      </div>

      {/* Permission help */}
      {!cameraActive && !isLoading && !error && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white p-6">
            <p className="text-lg mb-4">Please allow camera access to continue</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Enable Camera
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CameraFeed
