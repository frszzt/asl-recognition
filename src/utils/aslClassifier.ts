/**
 * ASL Sign Classifier
 * Uses hand landmarks to classify ASL signs
 * Now includes depth-aware matching for better accuracy
 */

import type { Landmark } from './landmarkProcessor'
import {
  checkFingersExtended,
  extractDepthFeatures
} from './landmarkProcessor'
import { ASL_ALPHABET, ASL_NUMBERS } from '../data/aslData'

export interface ClassificationResult {
  sign: string
  confidence: number
  isMatch: boolean
  alternative?: string
}

/**
 * Enhanced sign template with depth features
 * Depth features help disambiguate similar signs (M vs N vs T, etc.)
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
  // Depth features (optional, for enhanced matching)
  depthFeatures?: {
    expectedFingerDepthPattern?: number[]  // Relative depths of fingers
    depthVarianceRange?: [number, number]   // Expected depth variance range
    thumbOverFingers?: boolean               // Thumb depth relative to other fingers
  }
}

// Sign templates based on ASL characteristics
const SIGN_TEMPLATES: Record<string, SignTemplate> = {
  // Alphabet
  'A': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: { thumbOverFingers: false } // Thumb on side
  },
  'B': {
    thumbExtended: false,
    fingersExtended: [true, true, true, true],
    fingersTogether: true,
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0, 0.02] } // Flat hand
  },
  'C': {
    thumbExtended: true,
    fingersExtended: [false, false, false, false],
    tolerance: 0.4,
    depthFeatures: { depthVarianceRange: [0.01, 0.05] } // Curved hand
  },
  'D': {
    thumbExtended: true,
    fingersExtended: [true, false, false, false],
    tolerance: 0.3
  },
  'E': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0.01, 0.04] } // Fingers bent
  },
  'F': {
    thumbExtended: true,
    fingersExtended: [true, true, true, true],
    thumbTouchesIndex: true,
    tolerance: 0.4
  },
  'G': {
    thumbExtended: true,
    fingersExtended: [true, false, false, false],
    tolerance: 0.3
  },
  'H': {
    thumbExtended: false,
    fingersExtended: [true, true, false, false],
    fingersTogether: true,
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0, 0.02] }
  },
  'I': {
    thumbExtended: false,
    fingersExtended: [false, false, false, true],
    tolerance: 0.3
  },
  'J': {
    thumbExtended: false,
    fingersExtended: [false, false, false, true],
    tolerance: 0.3
  }, // Motion-based, same as I statically
  'K': {
    thumbExtended: true,
    fingersExtended: [true, true, false, false],
    tolerance: 0.4
  },
  'L': {
    thumbExtended: true,
    fingersExtended: [true, false, false, false],
    lShape: true,
    tolerance: 0.3
  },
  'M': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: {
      // Thumb under 3 fingers - thumb has highest depth (most positive)
      expectedFingerDepthPattern: [1, 0.2, 0.2, 0.2, 0.2], // thumb deepest
      thumbOverFingers: false
    }
  },
  'N': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: {
      // Thumb under 2 fingers - thumb between index and middle in depth
      expectedFingerDepthPattern: [0.7, 0.3, 0.3, 0.2, 0.2],
      thumbOverFingers: false
    }
  },
  'O': {
    thumbExtended: true,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0.01, 0.04] } // Curved
  },
  'P': {
    thumbExtended: true,
    fingersExtended: [true, true, false, false],
    tolerance: 0.4
  },
  'Q': {
    thumbExtended: true,
    fingersExtended: [true, false, false, false],
    tolerance: 0.3
  },
  'R': {
    thumbExtended: false,
    fingersExtended: [true, true, false, false],
    indexMiddleCrossed: true,
    tolerance: 0.4
  },
  'S': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: {
      thumbOverFingers: true, // Thumb over fingers
      depthVarianceRange: [0, 0.015] // Flat fist
    }
  },
  'T': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: {
      // Thumb under only index finger
      expectedFingerDepthPattern: [0.5, 0.4, 0.2, 0.2, 0.2],
      thumbOverFingers: false
    }
  },
  'U': {
    thumbExtended: false,
    fingersExtended: [true, true, false, false],
    fingersTogether: true,
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0, 0.02] }
  },
  'V': {
    thumbExtended: false,
    fingersExtended: [true, true, false, false],
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0, 0.02] }
  },
  'W': {
    thumbExtended: false,
    fingersExtended: [true, true, true, false],
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0, 0.02] }
  },
  'X': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3
  },
  'Y': {
    thumbExtended: true,
    fingersExtended: [false, false, false, true],
    tolerance: 0.3
  },
  'Z': {
    thumbExtended: false,
    fingersExtended: [true, false, false, false],
    tolerance: 0.3
  }, // Motion-based

  // Numbers
  '0': {
    thumbExtended: false,
    fingersExtended: [false, false, false, false],
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0.01, 0.04] } // Like O
  },
  '1': {
    thumbExtended: false,
    fingersExtended: [true, false, false, false],
    tolerance: 0.3
  },
  '2': {
    thumbExtended: false,
    fingersExtended: [true, true, false, false],
    tolerance: 0.3
  },
  '3': {
    thumbExtended: false,
    fingersExtended: [true, true, true, false],
    tolerance: 0.3
  },
  '4': {
    thumbExtended: false,
    fingersExtended: [true, true, true, true],
    tolerance: 0.3
  },
  '5': {
    thumbExtended: true,
    fingersExtended: [true, true, true, true],
    tolerance: 0.3,
    depthFeatures: { depthVarianceRange: [0, 0.02] } // Flat hand
  },
  '6': {
    thumbExtended: true,
    fingersExtended: [false, false, false, true],
    tolerance: 0.3
  },
  '7': {
    thumbExtended: true,
    fingersExtended: [false, false, false, true],
    tolerance: 0.4
  },
  '8': {
    thumbExtended: true,
    fingersExtended: [false, true, false, false],
    thumbTouchesIndex: true,
    tolerance: 0.4
  },
  '9': {
    thumbExtended: true,
    fingersExtended: [false, false, false, false],
    tolerance: 0.4
  }
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
 * Match landmarks against sign template with depth-aware scoring
 */
function matchTemplate(landmarks: Landmark[], template: SignTemplate): number {
  const fingers = checkFingersExtended(landmarks)
  const depthFeatures = extractDepthFeatures(landmarks)

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

  // Depth-based feature checks
  if (template.depthFeatures) {
    // Check depth variance range (helps identify flat vs curved hands)
    if (template.depthFeatures.depthVarianceRange) {
      maxScore += 1
      const [minVar, maxVar] = template.depthFeatures.depthVarianceRange
      if (depthFeatures.depthVariance >= minVar && depthFeatures.depthVariance <= maxVar) {
        score += 1
      }
    }

    // Check thumb position relative to fingers using depth
    if (template.depthFeatures.thumbOverFingers !== undefined) {
      maxScore += 1
      const thumbDepth = depthFeatures.fingerDepths[0]
      const avgFingerDepth = depthFeatures.fingerDepths.slice(1).reduce((a, b) => a + b, 0) / 4

      // More negative = closer to camera
      const thumbOverFingers = thumbDepth < avgFingerDepth
      if (thumbOverFingers === template.depthFeatures.thumbOverFingers) {
        score += 1
      }
    }

    // Check finger depth pattern (for M/N/T disambiguation)
    if (template.depthFeatures.expectedFingerDepthPattern) {
      maxScore += 2
      const pattern = template.depthFeatures.expectedFingerDepthPattern
      const actualPattern = depthFeatures.fingerDepths

      // Normalize patterns for comparison
      const patternMax = Math.max(...pattern)
      const actualMax = Math.max(...actualPattern.map(Math.abs))

      let patternMatch = 0
      for (let i = 0; i < 5; i++) {
        const expected = pattern[i] / patternMax
        const actual = actualPattern[i] / (actualMax || 1)
        const diff = Math.abs(expected - actual)
        if (diff < 0.3) patternMatch++
      }

      // Award partial points for pattern match
      score += (patternMatch / 5) * 2
    }
  }

  return score / maxScore
}

/**
 * Disambiguate similar signs using geometric and depth features
 * Depth features significantly improve M/N/T and A/S disambiguation
 */
function disambiguateSimilarSigns(
  landmarks: Landmark[],
  candidates: string[]
): string {
  if (candidates.length <= 1) return candidates[0]

  const features = calculateGeometricFeatures(landmarks)
  const depthFeatures = extractDepthFeatures(landmarks)

  // Disambiguate A vs S (both closed fist, different thumb position)
  if (candidates.includes('A') && candidates.includes('S')) {
    // Use depth to check thumb over vs on side
    const thumbDepth = depthFeatures.fingerDepths[0]
    const avgFingerDepth = depthFeatures.fingerDepths.slice(1).reduce((a, b) => a + b, 0) / 4

    // If thumb is significantly closer (more negative) than fingers, it's over them (S)
    // If similar depth, it's on the side (A)
    if (thumbDepth < avgFingerDepth - 0.02) {
      return 'S' // Thumb over fingers
    } else {
      // Also check x position for confirmation
      const thumbTip = landmarks[4]
      const indexMCP = landmarks[5]
      if (thumbTip.x < indexMCP.x - 0.05) {
        return 'A' // Thumb on side
      }
      return 'S' // Default to S
    }
  }

  // Disambiguate M vs N vs T (all closed fist, thumb under different fingers)
  if (candidates.includes('M') || candidates.includes('N') || candidates.includes('T')) {
    // Use depth pattern to determine how many fingers the thumb is under
    const thumbDepth = depthFeatures.fingerDepths[0]
    const indexDepth = depthFeatures.fingerDepths[1]
    const middleDepth = depthFeatures.fingerDepths[2]
    const ringDepth = depthFeatures.fingerDepths[3]

    // Count how many fingers have similar depth to thumb (meaning thumb is under them)
    const depthThreshold = 0.03
    let fingersOverThumb = 0

    if (Math.abs(indexDepth - thumbDepth) < depthThreshold) fingersOverThumb++
    if (Math.abs(middleDepth - thumbDepth) < depthThreshold) fingersOverThumb++
    if (Math.abs(ringDepth - thumbDepth) < depthThreshold) fingersOverThumb++

    // M: thumb under 3 fingers, N: under 2, T: under 1
    if (fingersOverThumb >= 3 && candidates.includes('M')) return 'M'
    if (fingersOverThumb === 2 && candidates.includes('N')) return 'N'
    if (fingersOverThumb <= 1 && candidates.includes('T')) return 'T'

    // Fallback based on candidates
    if (candidates.includes('M')) return 'M'
    if (candidates.includes('N')) return 'N'
    if (candidates.includes('T')) return 'T'
  }

  // Disambiguate A vs M vs N vs S vs T (all closed fist variants)
  const closedFistSigns = ['A', 'S', 'M', 'N', 'T'].filter(s => candidates.includes(s))
  if (closedFistSigns.length > 1) {
    // Use depth variance and thumb position
    const thumbTip = landmarks[4]
    const indexMCP = landmarks[5]

    // Check thumb horizontal position
    const thumbOnSide = thumbTip.x < indexMCP.x - 0.05

    // Check thumb depth relative to fingers
    const thumbDepth = depthFeatures.fingerDepths[0]
    const avgFingerDepth = depthFeatures.fingerDepths.slice(1).reduce((a, b) => a + b, 0) / 4
    const thumbOverFingers = thumbDepth < avgFingerDepth - 0.02

    if (thumbOnSide && !thumbOverFingers) return 'A'
    if (thumbOverFingers) {
      // Thumb is over fingers - check if it's S (tight fist) or other
      if (depthFeatures.depthVariance < 0.01) return 'S'
    }

    // For M, N, T - use depth pattern as above
    if (!thumbOverFingers && !thumbOnSide) {
      const fingersOverThumb = depthFeatures.fingerDepths.slice(1).filter(d =>
        Math.abs(d - thumbDepth) < 0.03).length

      if (fingersOverThumb >= 3 && candidates.includes('M')) return 'M'
      if (fingersOverThumb === 2 && candidates.includes('N')) return 'N'
      if (fingersOverThumb <= 1 && candidates.includes('T')) return 'T'
    }

    return closedFistSigns[0]
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

  // Disambiguate U vs V (two fingers, different spread)
  if (candidates.includes('U') && candidates.includes('V')) {
    if (features.indexMiddleDist < 0.15) {
      return 'U'
    } else {
      return 'V'
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

  // Disambiguate E vs O vs C (curved hand variants)
  if (candidates.includes('E') && candidates.includes('O')) {
    // E has fingers bent down, O has fingertips touching thumb
    // Use depth variance - E has more variance due to bent fingers
    if (depthFeatures.depthVariance > 0.03) {
      return 'E'
    } else {
      return 'O'
    }
  }

  return candidates[0]
}

/**
 * Classify using both 2D template and depth features
 * This provides enhanced accuracy for similar signs
 */
export function classifyWithDepth(
  landmarks: Landmark[],
  targetSign?: string,
  depthWeight: number = 0.3
): ClassificationResult {
  if (!landmarks || landmarks.length === 0) {
    return { sign: '', confidence: 0, isMatch: false }
  }

  const baseResult = classifyASL(landmarks, targetSign)
  const depthFeatures = extractDepthFeatures(landmarks)

  // If depth features show low variance, hand is flat - depth won't help much
  if (depthFeatures.depthVariance < 0.005) {
    return baseResult
  }

  // Get candidates with similar base scores
  const scores: Array<{ sign: string; score: number }> = []

  for (const [sign, template] of Object.entries(SIGN_TEMPLATES)) {
    const matchScore = matchTemplate(landmarks, template)
    scores.push({ sign, score: matchScore })
  }

  scores.sort((a, b) => b.score - a.score)

  // Get top 3 candidates for depth comparison
  const topCandidates = scores.slice(0, 3)

  // If top score is significantly higher, no need for depth disambiguation
  if (topCandidates[0].score - (topCandidates[1]?.score || 0) > 0.2) {
    return {
      ...baseResult,
      sign: topCandidates[0].sign,
      confidence: topCandidates[0].score
    }
  }

  // Use depth to break ties among top candidates
  let bestMatch = topCandidates[0]
  let bestDepthScore = 0

  for (const candidate of topCandidates) {
    const template = SIGN_TEMPLATES[candidate.sign]

    if (template.depthFeatures) {
      // Calculate depth match score
      let depthScore = 0

      // Check depth variance
      if (template.depthFeatures.depthVarianceRange) {
        const [min, max] = template.depthFeatures.depthVarianceRange
        if (depthFeatures.depthVariance >= min && depthFeatures.depthVariance <= max) {
          depthScore += 1
        } else {
          const dist = Math.min(
            Math.abs(depthFeatures.depthVariance - min),
            Math.abs(depthFeatures.depthVariance - max)
          )
          depthScore += Math.max(0, 1 - dist * 20)
        }
      }

      // Check thumb position
      if (template.depthFeatures.thumbOverFingers !== undefined) {
        const thumbDepth = depthFeatures.fingerDepths[0]
        const avgFingerDepth = depthFeatures.fingerDepths.slice(1).reduce((a, b) => a + b, 0) / 4
        const thumbOver = thumbDepth < avgFingerDepth

        if (thumbOver === template.depthFeatures.thumbOverFingers) {
          depthScore += 1
        }
      }

      // Check finger depth pattern
      if (template.depthFeatures.expectedFingerDepthPattern) {
        const pattern = template.depthFeatures.expectedFingerDepthPattern
        const actual = depthFeatures.fingerDepths

        let patternMatch = 0
        for (let i = 0; i < 5; i++) {
          // Normalize and compare
          const diff = Math.abs(pattern[i] - actual[i] * 10) // Scale up for comparison
          if (diff < 2) patternMatch++
        }
        depthScore += patternMatch / 5
      }

      // Normalize depth score
      depthScore = depthScore / 3 // Max score is approximately 3

      // Combine with base score
      const combinedScore = (1 - depthWeight) * candidate.score + depthWeight * depthScore

      if (combinedScore > bestDepthScore) {
        bestDepthScore = combinedScore
        bestMatch = { ...candidate, score: combinedScore }
      }
    } else {
      // No depth features defined, use base score
      const combinedScore = (1 - depthWeight) * candidate.score
      if (combinedScore > bestDepthScore) {
        bestDepthScore = combinedScore
        bestMatch = { ...candidate, score: combinedScore }
      }
    }
  }

  // Check if it matches the target sign
  let isMatch = false
  if (targetSign) {
    isMatch = bestMatch.sign === targetSign && bestMatch.score > 0.6
  }

  return {
    sign: bestMatch.sign,
    confidence: bestMatch.score,
    isMatch,
    alternative: topCandidates[1]?.sign
  }
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
/**
 * Classify with automatic depth detection
 * Uses depth-enhanced classification when depth data is available
 */
export function classifyAuto(
  landmarks: Landmark[],
  targetSign?: string
): ClassificationResult {
  // Check if we have meaningful depth data
  const hasDepth = hasPseudoDepthSupport(landmarks as any)

  if (hasDepth) {
    // Use depth-enhanced classification
    return classifyWithDepth(landmarks, targetSign, 0.25)
  }

  // Fall back to standard classification
  return classifyASL(landmarks, targetSign)
}

/**
 * Check if landmarks have meaningful depth data
 */
function hasPseudoDepthSupport(landmarks: { z?: number }[]): boolean {
  if (!landmarks || landmarks.length === 0) return false

  const zValues = landmarks.map(l => l.z || 0).filter(z => z !== 0)

  if (zValues.length === 0) return false

  const minZ = Math.min(...zValues)
  const maxZ = Math.max(...zValues)

  return (maxZ - minZ) > 0.005
}

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
