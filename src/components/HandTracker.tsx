import { useRef, useEffect, useState } from 'react'
import { Hands, Results } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import { AdaptiveFrameController } from '../utils/frameThrottler'

// Landmark connections for hand skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17] // Palm
]

interface Landmark {
  x: number
  y: number
  z?: number
}

interface DetectedHand {
  landmarks: Landmark[]
  confidence: number
  handedness: 'Left' | 'Right'
}

interface HandTrackerProps {
  videoElement: HTMLVideoElement | null
  canvasElement: HTMLCanvasElement | null
  onHandsDetected?: (hands: DetectedHand[]) => void
  enabled?: boolean
  showDebug?: boolean
  confidenceThreshold?: number
  targetFPS?: number
}

const HandTracker = ({
  videoElement,
  canvasElement,
  onHandsDetected,
  enabled = true,
  showDebug = false,
  confidenceThreshold = 0.5,
  targetFPS = 20
}: HandTrackerProps) => {
  const handsRef = useRef<Hands | null>(null)
  const cameraRef = useRef<any>(null)
  const frameControllerRef = useRef<AdaptiveFrameController>(new AdaptiveFrameController(targetFPS))
  const isInitializedRef = useRef(false)
  const onHandsDetectedRef = useRef(onHandsDetected)

  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentFPS, setCurrentFPS] = useState(targetFPS)

  // Keep callback updated without triggering re-initialization
  useEffect(() => {
    onHandsDetectedRef.current = onHandsDetected
  }, [onHandsDetected])

  // Update frame controller settings when props change
  useEffect(() => {
    frameControllerRef.current.setTargetFPS(targetFPS)
    setCurrentFPS(targetFPS)
  }, [targetFPS])

  // Main initialization effect - only runs when refs are ready
  useEffect(() => {
    if (!enabled) {
      // Cleanup when disabled
      if (cameraRef.current) {
        try {
          cameraRef.current.stop()
        } catch (e) {
          console.warn('Error stopping camera:', e)
        }
        cameraRef.current = null
      }
      if (handsRef.current) {
        try {
          handsRef.current.close()
        } catch (e) {
          console.warn('Error closing hands:', e)
        }
        handsRef.current = null
      }
      isInitializedRef.current = false
      frameControllerRef.current.reset()
      return
    }

    // Wait for refs to be available (fixes blank page bug)
    if (!videoElement || !canvasElement) {
      console.log('HandTracker: Waiting for video and canvas refs...')
      return
    }

    // Prevent re-initialization
    if (isInitializedRef.current) {
      return
    }

    const canvasCtx = canvasElement.getContext('2d')
    if (!canvasCtx) {
      setError('Failed to get canvas context')
      setIsLoading(false)
      return
    }

    initializeHandTracking(canvasCtx, canvasElement)

    return () => {
      if (cameraRef.current) {
        try {
          cameraRef.current.stop()
        } catch (e) {
          console.warn('Error stopping camera:', e)
        }
        cameraRef.current = null
      }

      if (handsRef.current) {
        try {
          handsRef.current.close()
        } catch (e) {
          console.warn('Error closing hands:', e)
        }
        handsRef.current = null
      }

      isInitializedRef.current = false
      frameControllerRef.current.reset()
    }
  }, [enabled, videoElement, canvasElement])

  // Separate effect for updating MediaPipe options
  useEffect(() => {
    if (handsRef.current) {
      handsRef.current.setOptions({
        maxNumHands: 2,
        modelComplexity: 0, // Optimized: was 1, now 0 for better performance
        minDetectionConfidence: confidenceThreshold,
        minTrackingConfidence: confidenceThreshold
      })
    }
  }, [confidenceThreshold])

  const initializeHandTracking = async (
    canvasCtx: CanvasRenderingContext2D,
    canvasEl: HTMLCanvasElement
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        }
      })

      // Optimized configuration
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0, // Reduced from 1 for 30-50% better performance
        minDetectionConfidence: confidenceThreshold,
        minTrackingConfidence: confidenceThreshold
      })

      hands.onResults((results: Results) => {
        // Frame throttling - only process when needed
        if (!frameControllerRef.current.shouldProcess()) {
          return
        }

        const startTime = performance.now()

        // Clear canvas
        canvasCtx.save()
        canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height)

        // Draw video frame
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasEl.width,
          canvasEl.height
        )

        const detectedHands: DetectedHand[] = []

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          results.multiHandLandmarks.forEach((landmarks, index) => {
            // Draw hand connections
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS as any, {
              color: '#0ea5e9',
              lineWidth: 3
            })

            // Draw landmarks
            drawLandmarks(canvasCtx, landmarks, {
              color: '#fbbf24',
              lineWidth: 1,
              radius: 4
            })

            // Get handedness
            const handedness = results.multiHandedness?.[index]?.label || 'Right'

            // Create detected hand object
            const hand: DetectedHand = {
              landmarks: landmarks.map(lm => ({
                x: lm.x,
                y: lm.y,
                z: lm.z
              })),
              confidence: results.multiHandedness?.[index]?.score || 0,
              handedness: handedness as 'Left' | 'Right'
            }

            detectedHands.push(hand)

            // Draw handedness label
            const wrist = landmarks[0]
            canvasCtx.font = 'bold 16px Arial'
            canvasCtx.fillStyle = handedness === 'Left' ? '#10b981' : '#ef4444'
            canvasCtx.fillText(
              `${handedness}`,
              wrist.x * canvasEl.width - 20,
              wrist.y * canvasEl.height - 20
            )
          })
        }

        canvasCtx.restore()

        // Record frame time for adaptive FPS
        const processingTime = performance.now() - startTime
        frameControllerRef.current.recordFrameTime(processingTime)
        setCurrentFPS(frameControllerRef.current.getCurrentFPS())

        // Notify parent component
        onHandsDetectedRef.current?.(detectedHands)
      })

      handsRef.current = hands
      isInitializedRef.current = true

      // Initialize camera with frame rate control
      if (!videoElement) {
        setError('Video element not available')
        setIsLoading(false)
        return
      }

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          // Only process when throttled AND enabled
          if (handsRef.current && enabled && frameControllerRef.current.shouldProcess()) {
            await handsRef.current.send({ image: videoElement })
          }
        },
        width: canvasEl.width,
        height: canvasEl.height
      })

      cameraRef.current = camera
      await camera.start()

      setIsModelLoaded(true)
      setIsLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize hand tracking'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Loading hand tracking model...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 rounded-2xl">
          <div className="text-center p-6">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Debug info */}
      {showDebug && isModelLoaded && (
        <div className="absolute bottom-4 left-4 bg-black/50 text-white rounded-lg px-3 py-2 text-sm">
          Model: MediaPipe Hands<br />
          Status: Ready<br />
          FPS: {currentFPS}
        </div>
      )}
    </div>
  )
}

export default HandTracker
export type { DetectedHand, Landmark }
