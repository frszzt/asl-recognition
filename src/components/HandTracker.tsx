import { useRef, useEffect, useState } from 'react'
import { Hands, Results } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

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
}

const HandTracker = ({
  videoElement,
  canvasElement,
  onHandsDetected,
  enabled = true,
  showDebug = false,
  confidenceThreshold = 0.5
}: HandTrackerProps) => {
  const handsRef = useRef<Hands | null>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !videoElement || !canvasElement) return

    const canvasCtx = canvasElement.getContext('2d')
    if (!canvasCtx) return

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      }
    })

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: confidenceThreshold,
      minTrackingConfidence: confidenceThreshold
    })

    hands.onResults((results: Results) => {
      if (!canvasCtx) return

      // Clear canvas
      canvasCtx.save()
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)

      // Draw video frame
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
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
            wrist.x * canvasElement.width - 20,
            wrist.y * canvasElement.height - 20
          )
        })
      }

      canvasCtx.restore()

      // Notify parent component
      onHandsDetected?.(detectedHands)
    })

    handsRef.current = hands

    // Initialize camera
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (handsRef.current && enabled) {
          await handsRef.current.send({ image: videoElement })
        }
      },
      width: canvasElement.width,
      height: canvasElement.height
    })

    const initCamera = async () => {
      try {
        setIsLoading(true)
        await camera.start()
        setIsModelLoaded(true)
        setIsLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize camera')
        setIsLoading(false)
      }
    }

    initCamera()

    return () => {
      camera.stop()
    }
  }, [enabled, videoElement, canvasElement, confidenceThreshold, onHandsDetected])

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
          Status: Ready
        </div>
      )}
    </div>
  )
}

export default HandTracker
export type { DetectedHand, Landmark }
