import { useState, useEffect, useRef } from 'react'
import HandTracker, { DetectedHand } from '../components/HandTracker'
import { classifyASL, getFeedbackMessage, ClassificationSmoother } from '../utils/aslClassifier'
import { getAllSigns, getSignInfo } from '../data/aslData'

interface PracticeModeProps {
  onNavigate: (page: 'home' | 'learn' | 'practice' | 'game') => void
}

type PracticeMode = 'free' | 'target' | 'challenge'

const PracticeMode = ({ onNavigate }: PracticeModeProps) => {
  const [mode, setMode] = useState<PracticeMode>('target')
  const [targetSign, setTargetSign] = useState<string>('A')
  const [detectedSign, setDetectedSign] = useState<string>('')
  const [confidence, setConfidence] = useState(0)
  const [feedback, setFeedback] = useState<string>('Choose a sign to practice')
  const [history, setHistory] = useState<Array<{ sign: string; correct: boolean; time: number }>>([])
  const [stats, setStats] = useState({
    totalAttempts: 0,
    correctAttempts: 0,
    bestStreak: 0,
    currentStreak: 0
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smootherRef = useRef(new ClassificationSmoother(5))
  const lastRecognitionRef = useRef<number>(0)

  const allSigns = getAllSigns()
  const signInfo = getSignInfo(targetSign)

  useEffect(() => {
    setFeedback(`Practice the sign for "${targetSign}"`)
  }, [targetSign])

  const handleHandsDetected = (hands: DetectedHand[]) => {
    if (hands.length === 0) {
      setDetectedSign('')
      setConfidence(0)
      return
    }

    const hand = hands[0]
    const result = smootherRef.current.add(classifyASL(hand.landmarks, targetSign))

    setDetectedSign(result.sign)
    setConfidence(result.confidence)

    if (mode === 'target' && result.confidence > 0.6) {
      setFeedback(getFeedbackMessage(result, targetSign))

      // Debounce recognition
      const now = Date.now()
      if (now - lastRecognitionRef.current > 1500) {
        lastRecognitionRef.current = now
        recordAttempt(result.sign === targetSign)
      }
    } else if (mode === 'free') {
      const info = getSignInfo(result.sign)
      setFeedback(result.sign ? `${result.sign}: ${info?.description || ''}` : 'No sign detected')
    }
  }

  const recordAttempt = (wasCorrect: boolean) => {
    setStats(prev => {
      const newStreak = wasCorrect ? prev.currentStreak + 1 : 0
      return {
        totalAttempts: prev.totalAttempts + 1,
        correctAttempts: wasCorrect ? prev.correctAttempts + 1 : prev.correctAttempts,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        currentStreak: newStreak
      }
    })

    setHistory(prev => [
      { sign: targetSign, correct: wasCorrect, time: Date.now() },
      ...prev
    ].slice(0, 20))
  }

  const randomSign = () => {
    const randomIndex = Math.floor(Math.random() * allSigns.length)
    setTargetSign(allSigns[randomIndex])
    smootherRef.current.reset()
  }

  const accuracy = stats.totalAttempts > 0
    ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-white hover:text-blue-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-white">🎯 Practice Mode</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Mode Selection */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setMode('target')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              mode === 'target'
                ? 'bg-blue-500 text-white shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🎯 Target Practice
          </button>
          <button
            onClick={() => setMode('free')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              mode === 'free'
                ? 'bg-blue-500 text-white shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🆓 Free Practice
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Target Selection & Stats */}
          <div className="space-y-4">
            {/* Target Sign Selector */}
            {mode === 'target' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white/70 mb-4">Target Sign</h2>
                <div className="text-center mb-4">
                  <div className="text-6xl font-bold text-white mb-2">{targetSign}</div>
                  <p className="text-blue-300">{signInfo?.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={randomSign}
                    className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    🎲 Random
                  </button>
                </div>

                {/* Quick Select */}
                <div className="mt-4">
                  <h3 className="text-white/50 text-sm mb-2">Quick Select</h3>
                  <div className="grid grid-cols-9 gap-1">
                    {allSigns.slice(0, 36).map(sign => (
                      <button
                        key={sign}
                        onClick={() => {
                          setTargetSign(sign)
                          smootherRef.current.reset()
                        }}
                        className={`aspect-square rounded text-sm font-medium transition-all ${
                          targetSign === sign
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {sign}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stats Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white/70 mb-4">Session Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Attempts</span>
                  <span className="text-white font-bold">{stats.totalAttempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Correct</span>
                  <span className="text-green-400 font-bold">{stats.correctAttempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Accuracy</span>
                  <span className="text-blue-400 font-bold">{accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Current Streak</span>
                  <span className="text-orange-400 font-bold">{stats.currentStreak}🔥</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Best Streak</span>
                  <span className="text-yellow-400 font-bold">{stats.bestStreak}</span>
                </div>
              </div>

              {/* Accuracy Bar */}
              <div className="mt-4">
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-cyan-400 h-2 rounded-full transition-all"
                    style={{ width: `${accuracy}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white/70 mb-4">Recent Attempts</h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.slice(0, 10).map((attempt, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2 rounded ${
                        attempt.correct ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}
                    >
                      <span className="text-white font-medium">{attempt.sign}</span>
                      <span className={attempt.correct ? 'text-green-400' : 'text-red-400'}>
                        {attempt.correct ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div className={`mt-4 p-4 rounded-xl text-center transition-all ${
                detectedSign && (mode === 'free' || detectedSign === targetSign)
                  ? 'bg-blue-500/30 border border-blue-400'
                  : detectedSign
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white/5 border border-white/10'
              }`}>
                <div className="text-5xl font-bold text-white mb-2">
                  {mode === 'free' ? (detectedSign || '?') : (detectedSign || '?')}
                </div>
                <div className="text-sm text-white/70 mb-2">
                  Confidence: {Math.round(confidence * 100)}%
                </div>
                <div className={`font-medium ${
                  detectedSign === targetSign && confidence > 0.6
                    ? 'text-green-300'
                    : 'text-white/80'
                }`}>
                  {feedback}
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-white/70 font-medium mb-2">💡 Tips</h3>
              <ul className="text-white/60 text-sm space-y-1">
                <li>• Keep your hand well-lit</li>
                <li>• Position hand centrally in frame</li>
                <li>• Keep fingers separated clearly</li>
                <li>• Hold steady for better recognition</li>
              </ul>
            </div>
          </div>

          {/* Right Panel - Reference */}
          <div className="space-y-4">
            {/* Sign Reference */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white/70 mb-4">Sign Reference</h2>

              {mode === 'target' && signInfo && (
                <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 mb-4">
                  <h3 className="text-2xl font-bold text-white mb-2">{targetSign}</h3>
                  <p className="text-blue-300 font-medium mb-2">{signInfo.description}</p>
                  <p className="text-white/60 text-sm">{signInfo.tips}</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                {allSigns.map(sign => {
                  const info = getSignInfo(sign)
                  return (
                    <button
                      key={sign}
                      onClick={() => {
                        setMode('target')
                        setTargetSign(sign)
                        smootherRef.current.reset()
                      }}
                      className="bg-white/5 hover:bg-white/10 rounded-lg p-2 text-center transition-colors"
                      title={info?.description}
                    >
                      <div className="text-xl font-bold text-white">{sign}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Progress by Category */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white/70 mb-4">Categories</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Alphabet (A-Z)</span>
                    <span className="text-white">26 signs</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Numbers (0-9)</span>
                    <span className="text-white">10 signs</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-purple-400 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PracticeMode
