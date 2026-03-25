import { useState, useEffect, useRef, useCallback } from 'react'
import HandTracker, { DetectedHand } from '../components/HandTracker'
import ASLHandImage, { ASLImageGrid } from '../components/ASLHandImage'
import { classifyASL, getFeedbackMessage, ClassificationSmoother } from '../utils/aslClassifier'
import { ASL_ALPHABET, ASL_NUMBERS, ASL_SENTENCES, getSignInfo } from '../data/aslData'

interface LearnModeProps {
  onNavigate: (page: 'home' | 'learn' | 'practice' | 'game') => void
}

type LearnCategory = 'alphabet' | 'numbers' | 'sentences'

const LearnMode = ({ onNavigate }: LearnModeProps) => {
  const [category, setCategory] = useState<LearnCategory>('alphabet')
  const [currentSignIndex, setCurrentSignIndex] = useState(0)
  const [signs, setSigns] = useState<string[]>(Object.keys(ASL_ALPHABET))
  const [detectedSign, setDetectedSign] = useState<string>('')
  const [confidence, setConfidence] = useState(0)
  const [feedback, setFeedback] = useState<string>('Position your hand in the frame')
  const [isCorrect, setIsCorrect] = useState(false)
  const [completedSigns, setCompletedSigns] = useState<Set<string>>(new Set())
  const [refsReady, setRefsReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smootherRef = useRef(new ClassificationSmoother(5))
  const onHandsDetectedRef = useRef<(hands: DetectedHand[]) => void>()

  // Update signs when category changes
  useEffect(() => {
    switch (category) {
      case 'alphabet':
        setSigns(Object.keys(ASL_ALPHABET))
        break
      case 'numbers':
        setSigns(Object.keys(ASL_NUMBERS))
        break
      case 'sentences':
        const sentence = ASL_SENTENCES[Math.floor(Math.random() * ASL_SENTENCES.length)]
        setSigns(sentence.signs)
        break
    }
    setCurrentSignIndex(0)
    setCompletedSigns(new Set())
    smootherRef.current.reset()
  }, [category])

  // Wait for refs to be ready (fixes blank page bug)
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      setRefsReady(true)
    }
  }, [])

  // Keep callback updated and avoid stale closures
  const handleHandsDetected = useCallback((hands: DetectedHand[]) => {
    if (hands.length === 0) {
      setDetectedSign('')
      setConfidence(0)
      setFeedback('Position your hand in the frame')
      setIsCorrect(false)
      return
    }

    const hand = hands[0]
    const sign = signs[currentSignIndex] // Get current sign from index
    const result = smootherRef.current.add(classifyASL(hand.landmarks, sign))

    setDetectedSign(result.sign)
    setConfidence(result.confidence)

    if (result.sign === sign && result.confidence > 0.65) {
      setIsCorrect(true)
      setFeedback(getFeedbackMessage(result, sign))
      setCompletedSigns(prev => new Set([...prev, sign]))
    } else if (result.confidence > 0.5) {
      setIsCorrect(false)
      setFeedback(getFeedbackMessage(result, sign))
    } else {
      setIsCorrect(false)
      setFeedback('Adjust your hand position')
    }
  }, [currentSignIndex, signs])

  // Derive current sign and info from index
  const currentSign = signs[currentSignIndex]
  const signInfo = getSignInfo(currentSign)
  const progress = ((currentSignIndex + 1) / signs.length) * 100

  // Update ref when callback changes
  useEffect(() => {
    onHandsDetectedRef.current = handleHandsDetected
  }, [handleHandsDetected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      smootherRef.current.reset()
    }
  }, [])

  const goToNext = () => {
    if (currentSignIndex < signs.length - 1) {
      setCurrentSignIndex(prev => prev + 1)
      setIsCorrect(false)
      setFeedback('Position your hand in the frame')
      smootherRef.current.reset()
    }
  }

  const goToPrevious = () => {
    if (currentSignIndex > 0) {
      setCurrentSignIndex(prev => prev - 1)
      setIsCorrect(false)
      setFeedback('Position your hand in the frame')
      smootherRef.current.reset()
    }
  }

  const selectSign = (index: number) => {
    setCurrentSignIndex(index)
    setIsCorrect(false)
    setFeedback('Position your hand in the frame')
    smootherRef.current.reset()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-cyan-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-white hover:text-green-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-white">📚 Learn Mode</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Category Selection */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setCategory('alphabet')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              category === 'alphabet'
                ? 'bg-green-500 text-white shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🔤 Alphabet
          </button>
          <button
            onClick={() => setCategory('numbers')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              category === 'numbers'
                ? 'bg-green-500 text-white shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🔢 Numbers
          </button>
          <button
            onClick={() => setCategory('sentences')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              category === 'sentences'
                ? 'bg-green-500 text-white shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            💬 Sentences
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Current Sign Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Target Sign Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white/70 mb-4">Current Sign</h2>
              <div className="text-center">
                <div className="text-8xl font-bold text-white mb-4">{currentSign}</div>
                <h3 className="text-xl font-medium text-green-300 mb-2">{signInfo?.description}</h3>
                <p className="text-white/70">{signInfo?.tips}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/70">Progress</span>
                <span className="text-white font-medium">{currentSignIndex + 1} / {signs.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-400 to-cyan-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-white/50 text-sm mt-2">{Math.round(progress)}% complete</p>
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={goToPrevious}
                disabled={currentSignIndex === 0}
                className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={goToNext}
                disabled={currentSignIndex === signs.length - 1}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Center - Camera */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden relative">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full scale-x-[-1]"
                  width={480}
                  height={480}
                />
                {/* Only render HandTracker when refs are ready (fixes blank page bug) */}
                {refsReady && (
                  <HandTracker
                    videoElement={videoRef.current}
                    canvasElement={canvasRef.current}
                    onHandsDetected={(hands) => onHandsDetectedRef.current?.(hands)}
                    enabled={true}
                    targetFPS={20}
                  />
                )}
              </div>

              {/* Detection Result */}
              <div className={`mt-4 p-4 rounded-xl text-center ${
                isCorrect
                  ? 'bg-green-500/30 border border-green-400'
                  : detectedSign
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white/5 border border-white/10'
              }`}>
                <div className="text-3xl font-bold text-white mb-1">
                  {detectedSign || '?'}
                </div>
                <div className="text-sm text-white/70">
                  Confidence: {Math.round(confidence * 100)}%
                </div>
                <div className={`mt-2 font-medium ${
                  isCorrect ? 'text-green-300' : 'text-white/80'
                }`}>
                  {feedback}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Sign List */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white/70 mb-4 text-center">All Signs</h2>
              <div className="max-h-96 overflow-y-auto pr-2">
                <ASLImageGrid
                  signs={signs}
                  completedSigns={completedSigns}
                  currentSign={signs[currentSignIndex]}
                  onSelectSign={(sign) => selectSign(signs.indexOf(sign))}
                />
              </div>

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Completed</span>
                  <span className="text-green-400 font-bold">{completedSigns.size} / {signs.length}</span>
                </div>
              </div>
            </div>

            {/* Reference Hand */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mt-4">
              <h2 className="text-lg font-semibold text-white/70 mb-4 text-center">Reference</h2>
              <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 flex justify-center">
                <ASLHandImage
                  sign={currentSign}
                  size={160}
                  showLabel={false}
                />
              </div>
              <p className="text-white/80 text-base mt-3 text-center font-medium leading-relaxed">
                {signInfo?.tips || 'Position your hand clearly in front of the camera.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearnMode
