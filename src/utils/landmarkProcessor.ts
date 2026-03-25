import type { Landmark } from '../components/HandTracker'

// Re-export Landmark for use in other modules
export type { Landmark }

/**
 * Depth features extracted from MediaPipe z-coordinates
 * MediaPipe provides pseudo-depth data that works with standard webcams
 */
export interface DepthFeatures {
  /** Average z-distance of hand from camera (normalized) */
  handDepth: number
  /** Per-finger depths (thumb, index, middle, ring, pinky) */
  fingerDepths: number[]
  /** Variance of depth across hand (indicates tilt) */
  depthVariance: number
  /** Depth differences between adjacent fingers */
  relativeFingerDepths: number[]
  /** Depth range (max - min) across hand */
  depthRange: number
  /** Is hand tilted forward/backward based on depth distribution */
  handTilt: 'forward' | 'backward' | 'flat'
}

/**
 * Hand landmark indices from MediaPipe Hands
 */
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_IP: 2,
  THUMB_TIP: 3,
  THUMB_MCP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
}

/**
 * Normalize landmarks to a consistent coordinate system
 * This makes the hand position-independent
 */
export function normalizeLandmarks(landmarks: Landmark[]): number[] {
  if (landmarks.length === 0) return []

  // Get bounding box
  const xs = landmarks.map(l => l.x)
  const ys = landmarks.map(l => l.y)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const width = maxX - minX
  const height = maxY - minY
  const scale = Math.max(width, height) || 1

  // Normalize to [0,1] and flatten to array
  return landmarks.flatMap(lm => [
    (lm.x - minX) / scale,
    (lm.y - minY) / scale,
    lm.z || 0
  ])
}

/**
 * Calculate distances between landmarks
 */
export function calculateDistances(landmarks: Landmark[]): number[] {
  const distances: number[] = []
  const n = landmarks.length

  // Calculate pairwise distances (upper triangle only)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = landmarks[i].x - landmarks[j].x
      const dy = landmarks[i].y - landmarks[j].y
      const dz = (landmarks[i].z || 0) - (landmarks[j].z || 0)
      distances.push(Math.sqrt(dx * dx + dy * dy + dz * dz))
    }
  }

  return distances
}

/**
 * Calculate angles between fingers and palm
 */
export function calculateFingerAngles(landmarks: Landmark[]): number[] {
  const angles: number[] = []

  // Index finger angle
  angles.push(calculateAngle(
    landmarks[HAND_LANDMARKS.WRIST],
    landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP],
    landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP]
  ))

  // Middle finger angle
  angles.push(calculateAngle(
    landmarks[HAND_LANDMARKS.WRIST],
    landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP],
    landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP]
  ))

  // Ring finger angle
  angles.push(calculateAngle(
    landmarks[HAND_LANDMARKS.WRIST],
    landmarks[HAND_LANDMARKS.RING_FINGER_MCP],
    landmarks[HAND_LANDMARKS.RING_FINGER_TIP]
  ))

  // Pinky angle
  angles.push(calculateAngle(
    landmarks[HAND_LANDMARKS.WRIST],
    landmarks[HAND_LANDMARKS.PINKY_MCP],
    landmarks[HAND_LANDMARKS.PINKY_TIP]
  ))

  return angles
}

/**
 * Calculate angle between three points
 */
function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }
  const bc = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) }

  const dot = ab.x * bc.x + ab.y * bc.y + ab.z * bc.z
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z)
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z)

  if (magAB * magBC === 0) return 0

  return Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magBC))))
}

/**
 * Check if fingers are extended
 */
export function checkFingersExtended(landmarks: Landmark[]): {
  thumb: boolean
  index: boolean
  middle: boolean
  ring: boolean
  pinky: boolean
} {
  // Check if finger tip is above the PIP joint (y coordinate is smaller in image)
  const isExtended = (_mcp: number, pip: number, tip: number) => {
    return landmarks[tip].y < landmarks[pip].y
  }

  // Thumb is different - check if tip is far from wrist
  const thumbExtended = Math.hypot(
    landmarks[HAND_LANDMARKS.THUMB_TIP].x - landmarks[HAND_LANDMARKS.WRIST].x,
    landmarks[HAND_LANDMARKS.THUMB_TIP].y - landmarks[HAND_LANDMARKS.WRIST].y
  ) > 0.15

  return {
    thumb: thumbExtended,
    index: isExtended(
      HAND_LANDMARKS.INDEX_FINGER_MCP,
      HAND_LANDMARKS.INDEX_FINGER_PIP,
      HAND_LANDMARKS.INDEX_FINGER_TIP
    ),
    middle: isExtended(
      HAND_LANDMARKS.MIDDLE_FINGER_MCP,
      HAND_LANDMARKS.MIDDLE_FINGER_PIP,
      HAND_LANDMARKS.MIDDLE_FINGER_TIP
    ),
    ring: isExtended(
      HAND_LANDMARKS.RING_FINGER_MCP,
      HAND_LANDMARKS.RING_FINGER_PIP,
      HAND_LANDMARKS.RING_FINGER_TIP
    ),
    pinky: isExtended(
      HAND_LANDMARKS.PINKY_MCP,
      HAND_LANDMARKS.PINKY_PIP,
      HAND_LANDMARKS.PINKY_TIP
    )
  }
}

/**
 * Extract features for sign classification
 */
export function extractFeatures(landmarks: Landmark[]): number[] {
  const normalized = normalizeLandmarks(landmarks)
  const distances = calculateDistances(landmarks)
  const angles = calculateFingerAngles(landmarks)
  const fingers = checkFingersExtended(landmarks)

  return [
    ...normalized,
    ...distances.slice(0, 50), // Limit distances to reduce dimensionality
    ...angles,
    ...Object.values(fingers).map(v => v ? 1 : 0)
  ]
}

/**
 * Extract depth features from MediaPipe z-coordinates
 * This works with standard webcams - MediaPipe provides pseudo-depth
 */
export function extractDepthFeatures(landmarks: Landmark[]): DepthFeatures {
  if (landmarks.length === 0) {
    return {
      handDepth: 0,
      fingerDepths: [0, 0, 0, 0, 0],
      depthVariance: 0,
      relativeFingerDepths: [0, 0, 0, 0],
      depthRange: 0,
      handTilt: 'flat'
    }
  }

  // Finger tip indices
  const THUMB_TIP = 4
  const INDEX_TIP = 8
  const MIDDLE_TIP = 12
  const RING_TIP = 16
  const PINKY_TIP = 20

  // Get depths of finger tips
  const fingerTips = [
    landmarks[THUMB_TIP],
    landmarks[INDEX_TIP],
    landmarks[MIDDLE_TIP],
    landmarks[RING_TIP],
    landmarks[PINKY_TIP]
  ]

  const fingerDepths = fingerTips.map(lm => lm.z || 0)

  // Calculate average hand depth
  const allDepths = landmarks.map(lm => lm.z || 0)
  const handDepth = allDepths.reduce((sum, d) => sum + d, 0) / allDepths.length

  // Calculate depth variance (spread of depths)
  const depthVariance = allDepths.reduce((sum, d) => sum + Math.pow(d - handDepth, 2), 0) / allDepths.length

  // Calculate relative depths between adjacent fingers
  const relativeFingerDepths = [
    fingerDepths[1] - fingerDepths[0], // index - thumb
    fingerDepths[2] - fingerDepths[1], // middle - index
    fingerDepths[3] - fingerDepths[2], // ring - middle
    fingerDepths[4] - fingerDepths[3]  // pinky - ring
  ]

  // Calculate depth range
  const depthMin = Math.min(...allDepths)
  const depthMax = Math.max(...allDepths)
  const depthRange = depthMax - depthMin

  // Determine hand tilt based on depth distribution
  // If fingertips are deeper (more positive) than wrist, hand is tilted forward
  const wristDepth = landmarks[0].z || 0
  const avgFingerTipDepth = fingerDepths.reduce((sum, d) => sum + d, 0) / fingerDepths.length
  let handTilt: 'forward' | 'backward' | 'flat' = 'flat'

  const depthDifference = avgFingerTipDepth - wristDepth
  if (depthDifference > 0.02) {
    handTilt = 'forward' // Fingertips further away
  } else if (depthDifference < -0.02) {
    handTilt = 'backward' // Fingertips closer
  }

  return {
    handDepth,
    fingerDepths,
    depthVariance,
    relativeFingerDepths,
    depthRange,
    handTilt
  }
}

/**
 * Compare depth features between two sets of landmarks
 * Returns similarity score (0-1, higher is more similar)
 */
export function compareDepthFeatures(features1: DepthFeatures, features2: DepthFeatures): number {
  const weights = {
    handDepth: 0.2,
    fingerDepths: 0.4,
    relativeFingerDepths: 0.3,
    depthRange: 0.1
  }

  let score = 0

  // Compare average hand depth (normalized)
  const depthDiff = Math.abs(features1.handDepth - features2.handDepth)
  score += weights.handDepth * Math.max(0, 1 - depthDiff * 10)

  // Compare finger depths
  const fingerDepthDiff = features1.fingerDepths.reduce((sum, d, i) =>
    sum + Math.abs(d - features2.fingerDepths[i]), 0) / 5
  score += weights.fingerDepths * Math.max(0, 1 - fingerDepthDiff * 10)

  // Compare relative finger depths (more important for distinguishing signs)
  const relativeDiff = features1.relativeFingerDepths.reduce((sum, d, i) =>
    sum + Math.abs(d - features2.relativeFingerDepths[i]), 0) / 4
  score += weights.relativeFingerDepths * Math.max(0, 1 - relativeDiff * 5)

  // Compare depth range
  const rangeDiff = Math.abs(features1.depthRange - features2.depthRange)
  score += weights.depthRange * Math.max(0, 1 - rangeDiff * 5)

  return Math.min(1, score)
}

/**
 * Enhanced feature extraction that includes depth information
 */
export function extractFeaturesWithDepth(landmarks: Landmark[]): number[] {
  const baseFeatures = extractFeatures(landmarks)
  const depthFeatures = extractDepthFeatures(landmarks)

  return [
    ...baseFeatures,
    depthFeatures.handDepth,
    ...depthFeatures.fingerDepths,
    depthFeatures.depthVariance,
    ...depthFeatures.relativeFingerDepths,
    depthFeatures.depthRange
  ]
}

/**
 * Compare two sets of landmarks using mean squared error
 */
export function compareLandmarks(landmarks1: Landmark[], landmarks2: Landmark[]): number {
  if (landmarks1.length !== landmarks2.length) return Infinity

  let mse = 0
  for (let i = 0; i < landmarks1.length; i++) {
    mse += Math.pow(landmarks1[i].x - landmarks2[i].x, 2)
    mse += Math.pow(landmarks1[i].y - landmarks2[i].y, 2)
  }

  return mse / landmarks1.length
}

/**
 * Smoothing filter for landmarks to reduce jitter
 */
export class LandmarkSmoother {
  private buffer: Landmark[][]
  private readonly bufferSize: number

  constructor(bufferSize: number = 5) {
    this.buffer = []
    this.bufferSize = bufferSize
  }

  add(landmarks: Landmark[]): Landmark[] {
    this.buffer.push(landmarks)
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift()
    }
    return this.smooth()
  }

  private smooth(): Landmark[] {
    if (this.buffer.length === 0) return []

    const result: Landmark[] = []
    const n = this.buffer[0].length

    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, z = 0
      for (const frame of this.buffer) {
        x += frame[i].x
        y += frame[i].y
        z += frame[i].z || 0
      }
      result.push({
        x: x / this.buffer.length,
        y: y / this.buffer.length,
        z: z / this.buffer.length
      })
    }

    return result
  }

  reset(): void {
    this.buffer = []
  }
}
