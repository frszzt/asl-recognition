/**
 * ASL Sign Classifier
 * Uses hand landmarks to classify ASL signs
 */

import type { Landmark } from './landmarkProcessor'
import { checkFingersExtended } from './landmarkProcessor'
import { ASL_ALPHABET, ASL_NUMBERS } from '../data/aslData'

export interface ClassificationResult {
  sign: string
  confidence: number
  isMatch: boolean
  alternative?: string
}

/**
 * Template matching for ASL signs
 * Based on finger extension patterns and landmark positions
 */
interface SignTemplate {
  thumbExtended: boolean
  fingersExtended: [boolean, boolean, boolean, boolean] // index, middle, ring, pinky
  // Additional features for disambiguation
  thumbTouchesIndex?: boolean
  thumbTouchesPinky?: boolean
  fingersTogether?: boolean
  indexMiddleCrossed?: boolean
  lShape?: boolean
  // Tolerance for matching
  tolerance: number
}

// Sign templates based on ASL characteristics
const SIGN_TEMPLATES: Record<string, SignTemplate> = {
  // Alphabet
  'A': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'B': { thumbExtended: false, fingersExtended: [true, true, true, true], fingersTogether: true, tolerance: 0.3 },
  'C': { thumbExtended: true, fingersExtended: [false, false, false, false], tolerance: 0.4 },
  'D': { thumbExtended: true, fingersExtended: [true, false, false, false], tolerance: 0.3 },
  'E': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'F': { thumbExtended: true, fingersExtended: [true, true, true, true], thumbTouchesIndex: true, tolerance: 0.4 },
  'G': { thumbExtended: true, fingersExtended: [true, false, false, false], tolerance: 0.3 },
  'H': { thumbExtended: false, fingersExtended: [true, true, false, false], fingersTogether: true, tolerance: 0.3 },
  'I': { thumbExtended: false, fingersExtended: [false, false, false, true], tolerance: 0.3 },
  'J': { thumbExtended: false, fingersExtended: [false, false, false, true], tolerance: 0.3 }, // Motion-based, same as I statically
  'K': { thumbExtended: true, fingersExtended: [true, true, false, false], tolerance: 0.4 },
  'L': { thumbExtended: true, fingersExtended: [true, false, false, false], lShape: true, tolerance: 0.3 },
  'M': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'N': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'O': { thumbExtended: true, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'P': { thumbExtended: true, fingersExtended: [true, true, false, false], tolerance: 0.4 },
  'Q': { thumbExtended: true, fingersExtended: [true, false, false, false], tolerance: 0.3 },
  'R': { thumbExtended: false, fingersExtended: [true, true, false, false], indexMiddleCrossed: true, tolerance: 0.4 },
  'S': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'T': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'U': { thumbExtended: false, fingersExtended: [true, true, false, false], fingersTogether: true, tolerance: 0.3 },
  'V': { thumbExtended: false, fingersExtended: [true, true, false, false], tolerance: 0.3 },
  'W': { thumbExtended: false, fingersExtended: [true, true, true, false], tolerance: 0.3 },
  'X': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  'Y': { thumbExtended: true, fingersExtended: [false, false, false, true], tolerance: 0.3 },
  'Z': { thumbExtended: false, fingersExtended: [true, false, false, false], tolerance: 0.3 }, // Motion-based

  // Numbers
  '0': { thumbExtended: false, fingersExtended: [false, false, false, false], tolerance: 0.3 },
  '1': { thumbExtended: false, fingersExtended: [true, false, false, false], tolerance: 0.3 },
  '2': { thumbExtended: false, fingersExtended: [true, true, false, false], tolerance: 0.3 },
  '3': { thumbExtended: false, fingersExtended: [true, true, true, false], tolerance: 0.3 },
  '4': { thumbExtended: false, fingersExtended: [true, true, true, true], tolerance: 0.3 },
  '5': { thumbExtended: true, fingersExtended: [true, true, true, true], tolerance: 0.3 },
  '6': { thumbExtended: true, fingersExtended: [false, false, false, true], tolerance: 0.3 },
  '7': { thumbExtended: true, fingersExtended: [false, false, false, true], tolerance: 0.4 },
  '8': { thumbExtended: true, fingersExtended: [false, true, false, false], thumbTouchesIndex: true, tolerance: 0.4 },
  '9': { thumbExtended: true, fingersExtended: [false, false, false, false], tolerance: 0.4 }
}

/**
 * Calculate geometric features from landmarks for more accurate classification
 */
function calculateGeometricFeatures(landmarks: Landmark[]) {
  // Landmark indices from MediaPipe
  const WRIST = 0
  const THUMB_TIP = 4
  const INDEX_TIP = 8
  const MIDDLE_TIP = 12
  const RING_TIP = 16
  const PINKY_TIP = 20
  const INDEX_MCP = 5
  const MIDDLE_MCP = 9

  const wrist = landmarks[WRIST]
  const thumbTip = landmarks[THUMB_TIP]
  const indexTip = landmarks[INDEX_TIP]
  const middleTip = landmarks[MIDDLE_TIP]
  const ringTip = landmarks[RING_TIP]
  const pinkyTip = landmarks[PINKY_TIP]

  // Calculate distances from wrist to each finger tip
  const thumbDist = distance(wrist, thumbTip)
  const indexDist = distance(wrist, indexTip)
  const middleDist = distance(wrist, middleTip)
  const ringDist = distance(wrist, ringTip)
  const pinkyDist = distance(wrist, pinkyTip)

  // Calculate distance between thumb and index tip
  const thumbIndexDist = distance(thumbTip, indexTip)

  // Calculate distance between index and middle tips
  const indexMiddleDist = distance(indexTip, middleTip)

  // Calculate spread of extended fingers
  const fingerSpan = Math.max(
    distance(indexTip, pinkyTip),
    distance(indexTip, landmarks[INDEX_MCP]),
    distance(middleTip, landmarks[MIDDLE_MCP])
  )

  return {
    thumbDist,
    indexDist,
    middleDist,
    ringDist,
    pinkyDist,
    thumbIndexDist,
    indexMiddleDist,
    fingerSpan
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

/**
 * Check if thumb is touching index finger
 */
function isThumbTouchingIndex(landmarks: Landmark[]): boolean {
  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const dist = distance(thumbTip, indexTip)
  return dist < 0.08 // Threshold for "touching"
}

/**
 * Check if index and middle are crossed
 */
function areIndexMiddleCrossed(landmarks: Landmark[]): boolean {
  const indexTip = landmarks[8]
  const middleTip = landmarks[12]
  const indexMCP = landmarks[5]
  const middleMCP = landmarks[9]

  // Check if the tips are close and fingers are extended
  const tipsClose = distance(indexTip, middleTip) < 0.05
  const bothExtended = indexTip.y < indexMCP.y && middleTip.y < middleMCP.y

  return tipsClose && bothExtended
}

/**
 * Check if fingers are together (for B, H, U signs)
 */
function areFingersTogether(landmarks: Landmark[]): boolean {
  const indexTip = landmarks[8]
  const middleTip = landmarks[12]
  const ringTip = landmarks[16]
  const pinkyTip = landmarks[20]

  // Calculate average spread between adjacent fingers
  const indexMiddle = distance(indexTip, middleTip)
  const middleRing = distance(middleTip, ringTip)
  const ringPinky = distance(ringTip, pinkyTip)

  const avgSpread = (indexMiddle + middleRing + ringPinky) / 3

  return avgSpread < 0.1 // Threshold for "together"
}

/**
 * Check for L shape
 */
function isLShape(landmarks: Landmark[]): boolean {
  const wrist = landmarks[0]
  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]

  // L shape: thumb and index extended perpendicular-ish
  const thumbExtended = distance(wrist, thumbTip) > 0.15
  const indexExtended = distance(wrist, indexTip) > 0.15

  // Check angle between thumb and index (should be close to 90 degrees)
  const thumbVector = { x: thumbTip.x - wrist.x, y: thumbTip.y - wrist.y }
  const indexVector = { x: indexTip.x - wrist.x, y: indexTip.y - wrist.y }

  const dot = thumbVector.x * indexVector.x + thumbVector.y * indexVector.y
  const magThumb = Math.sqrt(thumbVector.x ** 2 + thumbVector.y ** 2)
  const magIndex = Math.sqrt(indexVector.x ** 2 + indexVector.y ** 2)

  const angle = Math.acos(Math.max(-1, Math.min(1, dot / (magThumb * magIndex))))
  const angleDegrees = angle * (180 / Math.PI)

  return thumbExtended && indexExtended && angleDegrees > 60 && angleDegrees < 120
}

/**
 * Match landmarks against sign template
 */
function matchTemplate(landmarks: Landmark[], template: SignTemplate): number {
  const fingers = checkFingersExtended(landmarks)

  let score = 0
  let maxScore = 0

  // Thumb extended check
  maxScore += 1
  if (fingers.thumb === template.thumbExtended) score += 1

  // Finger extension checks
  maxScore += 4
  const fingerMatch = [
    fingers.index === template.fingersExtended[0],
    fingers.middle === template.fingersExtended[1],
    fingers.ring === template.fingersExtended[2],
    fingers.pinky === template.fingersExtended[3]
  ]
  score += fingerMatch.filter(Boolean).length

  // Additional feature checks
  if (template.thumbTouchesIndex !== undefined) {
    maxScore += 1
    if (isThumbTouchingIndex(landmarks) === template.thumbTouchesIndex) score += 1
  }

  if (template.fingersTogether !== undefined) {
    maxScore += 1
    if (areFingersTogether(landmarks) === template.fingersTogether) score += 1
  }

  if (template.indexMiddleCrossed !== undefined) {
    maxScore += 1
    if (areIndexMiddleCrossed(landmarks) === template.indexMiddleCrossed) score += 1
  }

  if (template.lShape !== undefined) {
    maxScore += 1
    if (isLShape(landmarks) === template.lShape) score += 1
  }

  return score / maxScore
}

/**
 * Disambiguate similar signs using geometric features
 */
function disambiguateSimilarSigns(
  landmarks: Landmark[],
  candidates: string[]
): string {
  if (candidates.length <= 1) return candidates[0]

  const features = calculateGeometricFeatures(landmarks)

  // Disambiguate A vs S vs M vs N (all closed fist)
  if (candidates.includes('A') && candidates.includes('S')) {
    // Check thumb position relative to fingers
    const thumbTip = landmarks[4]
    const indexMCP = landmarks[5]

    if (thumbTip.x < indexMCP.x) {
      return 'A' // Thumb on side
    } else {
      return 'S' // Thumb over fingers
    }
  }

  // Disambiguate B vs 4 (same finger pattern, different thumb)
  if (candidates.includes('B') && candidates.includes('4')) {
    if (features.fingerSpan > 0.2) {
      return '4' // Spread fingers
    } else {
      return 'B' // Together fingers
    }
  }

  // Disambiguate H vs U vs V (two fingers extended)
  if (candidates.includes('H') && candidates.includes('U') && candidates.includes('V')) {
    if (features.indexMiddleDist < 0.1) {
      return 'U' // Together
    } else if (features.indexMiddleDist < 0.2) {
      return 'H' // Slightly spread
    } else {
      return 'V' // Wide spread
    }
  }

  // Disambiguate I vs Y
  if (candidates.includes('I') && candidates.includes('Y')) {
    if (features.thumbDist > 0.15) {
      return 'Y' // Thumb extended
    } else {
      return 'I' // Thumb not extended
    }
  }

  return candidates[0]
}

/**
 * Main classification function
 */
export function classifyASL(
  landmarks: Landmark[],
  targetSign?: string
): ClassificationResult {
  if (!landmarks || landmarks.length === 0) {
    return { sign: '', confidence: 0, isMatch: false }
  }

  const scores: Array<{ sign: string; score: number }> = []

  // Match against all templates
  for (const [sign, template] of Object.entries(SIGN_TEMPLATES)) {
    const matchScore = matchTemplate(landmarks, template)
    scores.push({ sign, score: matchScore })
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  const bestMatch = scores[0]
  const confidence = bestMatch.score

  // Get top candidates for disambiguation
  const topCandidates = scores
    .filter(s => s.score >= confidence - 0.2)
    .map(s => s.sign)

  // Disambiguate similar signs
  const finalSign = disambiguateSimilarSigns(landmarks, topCandidates)

  // Recalculate confidence for disambiguated sign
  const finalScore = scores.find(s => s.sign === finalSign)?.score || confidence

  // Check if it matches the target sign (if provided)
  let isMatch = false
  if (targetSign) {
    isMatch = finalSign === targetSign && finalScore > 0.6
  }

  return {
    sign: finalSign,
    confidence: finalScore,
    isMatch,
    alternative: scores[1]?.sign
  }
}

/**
 * Get feedback message based on classification result
 */
export function getFeedbackMessage(
  result: ClassificationResult,
  targetSign: string
): string {
  if (!result.sign) {
    return 'No hand detected. Make sure your hand is clearly visible.'
  }

  if (result.confidence < 0.5) {
    return 'Low confidence. Try to keep your hand steady.'
  }

  if (result.sign === targetSign) {
    const praise = [
      'Perfect! 🎉',
      'Great job! 👏',
      'Excellent! ⭐',
      'You got it! 🌟',
      'Amazing! 💯'
    ]
    return praise[Math.floor(Math.random() * praise.length)]
  }

  // Provide hint based on what was detected
  const targetInfo = ASL_ALPHABET[targetSign] || ASL_NUMBERS[targetSign]
  if (targetInfo) {
    return `That looks like "${result.sign}". Try: ${targetInfo.tips}`
  }

  return `Try again! Make the sign for "${targetSign}"`
}

/**
 * Calculate score for a game round
 */
export function calculateRoundScore(
  result: ClassificationResult,
  timeTaken: number,
  streak: number
): number {
  if (!result.isMatch) return 0

  let baseScore = 100

  // Bonus for high confidence
  if (result.confidence > 0.9) baseScore += 20
  else if (result.confidence > 0.8) baseScore += 10

  // Bonus for speed (under 3 seconds)
  if (timeTaken < 2000) baseScore += 30
  else if (timeTaken < 3000) baseScore += 15

  // Streak bonus
  baseScore += streak * 5

  return Math.min(baseScore, 200) // Cap at 200 points
}

/**
 * Smooth classification results over multiple frames
 */
export class ClassificationSmoother {
  private buffer: string[] = []
  private readonly bufferSize: number

  constructor(bufferSize = 5) {
    this.bufferSize = bufferSize
  }

  add(result: ClassificationResult): ClassificationResult {
    this.buffer.push(result.sign)
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift()
    }

    // Find most common sign in buffer
    const counts = new Map<string, number>()
    for (const sign of this.buffer) {
      counts.set(sign, (counts.get(sign) || 0) + 1)
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    const smoothedSign = sorted[0]?.[0] || result.sign

    return {
      ...result,
      sign: smoothedSign
    }
  }

  reset(): void {
    this.buffer = []
  }
}
