import { useState, useEffect, useRef } from 'react'
import HandTracker, { DetectedHand } from '../components/HandTracker'
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smootherRef = useRef(new ClassificationSmoother(5))

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

  const currentSign = signs[currentSignIndex]
  const signInfo = getSignInfo(currentSign)
  const progress = ((currentSignIndex + 1) / signs.length) * 100

  const handleHandsDetected = (hands: DetectedHand[]) => {
    if (hands.length === 0) {
      setDetectedSign('')
      setConfidence(0)
      setFeedback('Position your hand in the frame')
      setIsCorrect(false)
      return
    }

    const hand = hands[0]
    const result = smootherRef.current.add(classifyASL(hand.landmarks, currentSign))

    setDetectedSign(result.sign)
    setConfidence(result.confidence)

    if (result.sign === currentSign && result.confidence > 0.65) {
      setIsCorrect(true)
      setFeedback(getFeedbackMessage(result, currentSign))
      setCompletedSigns(prev => new Set([...prev, currentSign]))
    } else if (result.confidence > 0.5) {
      setIsCorrect(false)
      setFeedback(getFeedbackMessage(result, currentSign))
    } else {
      setIsCorrect(false)
      setFeedback('Adjust your hand position')
    }
  }

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
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  width={480}
                  height={480}
                />
                <HandTracker
                  videoElement={videoRef.current}
                  canvasElement={canvasRef.current}
                  onHandsDetected={handleHandsDetected}
                  enabled={true}
                />
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
              <h2 className="text-lg font-semibold text-white/70 mb-4">All Signs</h2>
              <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                {signs.map((sign, index) => {
                  const isCompleted = completedSigns.has(sign)
                  const isCurrent = index === currentSignIndex

                  return (
                    <button
                      key={sign}
                      onClick={() => selectSign(index)}
                      className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                        isCurrent
                          ? 'bg-green-500 text-white scale-110 shadow-lg'
                          : isCompleted
                          ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {isCompleted && !isCurrent ? '✓' : sign}
                    </button>
                  )
                })}
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
              <h2 className="text-lg font-semibold text-white/70 mb-4">Reference</h2>
              <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-6 text-center">
                <div className="text-6xl mb-3">👋</div>
                <p className="text-white/60 text-sm">
                  Position your hand clearly in front of the camera.
                  Keep good lighting for best results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearnMode
