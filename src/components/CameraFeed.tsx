import { useRef, useEffect, useState, useCallback } from 'react'
import { checkCameraPermission, type PermissionStatus } from '../utils/cameraPermissions'
import {
  checkRealSenseAvailable,
  createDepthVisualization,
  type DepthFrame,
  hasPseudoDepthSupport
} from '../utils/realsense-bridge'

interface CameraFeedProps {
  onFrame?: (videoElement: HTMLVideoElement) => void
  onDepthFrame?: (depthFrame: DepthFrame) => void
  width?: number
  height?: number
  enabled?: boolean
  onError?: (error: string) => void
  onPermissionStatusChange?: (status: PermissionStatus, error?: string) => void
  showPermissionPrompt?: boolean
  enableDepthToggle?: boolean  // Allow showing depth visualization
}

const CameraFeed = ({
  onFrame,
  onDepthFrame,
  width = 640,
  height = 480,
  enabled = true,
  onError,
  onPermissionStatusChange,
  showPermissionPrompt = true,
  enableDepthToggle = false
}: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const depthCanvasRef = useRef<HTMLCanvasElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [hasRealSense, setHasRealSense] = useState(false)
  const [showDepth, setShowDepth] = useState(false)

  const onFrameRef = useRef(onFrame)
  const onDepthFrameRef = useRef(onDepthFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
    onDepthFrameRef.current = onDepthFrame
  }, [onFrame, onDepthFrame])

  // Check for RealSense on mount
  useEffect(() => {
    checkRealSenseAvailable().then(setHasRealSense)
  }, [])

  // Initialize camera
  useEffect(() => {
    if (!enabled) {
      stopCamera()
      return
    }

    initializeCamera()

    return () => {
      stopCamera()
    }
  }, [enabled])

  const initializeCamera = async () => {
    try {
      setIsLoading(true)
      setError(null)
      onPermissionStatusChange?.('requesting')

      // Check permissions first
      const permissionCheck = await checkCameraPermission()

      if (permissionCheck.status === 'denied') {
        setError(permissionCheck.error || 'Camera permission denied')
        setError(permissionCheck.error || 'Camera permission denied')
        onPermissionStatusChange?.('denied', permissionCheck.error)
        setIsLoading(false)
        return
      }

      // Request camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user'
        },
        audio: false
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)

        // Start frame callback loop if provided
        if (onFrameRef.current) {
          startFrameLoop()
        }
      }

      setIsLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      onPermissionStatusChange?.('denied', errorMessage)
      onError?.(errorMessage)
      setIsLoading(false)
    }
  }

  const startFrameLoop = useCallback(() => {
    const processFrame = () => {
      if (videoRef.current && enabled && cameraActive && onFrameRef.current) {
        onFrameRef.current(videoRef.current)
      }

      if (enabled && cameraActive) {
        animationFrameIdRef.current = requestAnimationFrame(processFrame)
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(processFrame)
  }, [enabled, cameraActive])

  const stopCamera = useCallback(() => {
    // Cancel animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }, [])

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
      {/* Hidden video element for processing - parent components draw to their own canvas */}
      <video
        ref={videoRef}
        className="hidden"
        width={width}
        height={height}
        playsInline
        muted
      />

      {/* Depth visualization canvas (hidden by default) */}
      <canvas
        ref={depthCanvasRef}
        className={`absolute inset-0 w-full h-full object-cover ${showDepth ? 'block' : 'hidden'}`}
        width={width}
        height={height}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-lg">Requesting camera permission...</p>
          </div>
        </div>
      )}

      {/* Permission denied / Error overlay */}
      {error && showPermissionPrompt && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center text-white p-6 max-w-md">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-bold mb-2">Camera Access Required</h3>
            <p className="mb-4 text-white/80">{error}</p>
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <p className="text-sm text-white/60 mt-4">
                Make sure to allow camera access in your browser settings
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera status indicator */}
      {cameraActive && !isLoading && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-white text-sm">Live</span>
          {hasRealSense && (
            <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">RealSense</span>
          )}
        </div>
      )}

      {/* Depth visualization toggle */}
      {enableDepthToggle && cameraActive && !isLoading && (
        <button
          onClick={() => setShowDepth(!showDepth)}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded-full text-sm transition-colors"
        >
          {showDepth ? 'Show RGB' : hasRealSense ? 'Show Depth' : 'Show Pseudo-Depth'}
        </button>
      )}
    </div>
  )
}

export default CameraFeed
