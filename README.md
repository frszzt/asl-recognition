# ASL Learning Game - American Sign Language Recognition

A web-based interactive system for learning American Sign Language (ASL) through real-time hand tracking and game-like scoring.

## Features

- **Learn Mode**: Study ASL alphabet (A-Z), numbers (0-9), and simple sentences with visual guides
- **Practice Mode**: Free-form and targeted practice with real-time feedback
- **Game Mode**: Scored challenges with achievements, streaks, and leaderboards
- **Real-time Recognition**: Uses MediaPipe Hands for accurate hand tracking
- **Camera Support**: Works with standard webcams and Intel RealSense depth cameras
- **All Ages**: Simple, fun interface suitable for learners of all ages

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with camera support
- (Optional) Intel RealSense camera for depth sensing

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## How to Use

### 1. Allow Camera Access

When you first open the app, you'll be prompted to allow camera access. Click "Allow" to enable hand tracking.

### 2. Choose Your Mode

**Learn Mode 📚**
- Select a category: Alphabet, Numbers, or Sentences
- Follow the visual guide for each sign
- Get real-time feedback as you practice

**Practice Mode 🎯**
- Target Practice: Focus on specific signs
- Free Practice: Explore any sign
- Track your accuracy and streaks

**Game Mode 🎮**
- Race against the clock
- Earn points for correct signs
- Unlock achievements
- Build scoring streaks

### 3. Make the Signs

Position your hand clearly in front of the camera:
- Keep your hand well-lit
- Center your hand in the frame
- Hold each sign steady for recognition
- Follow the on-screen tips

## Camera Compatibility

### Standard Webcam
The app works with any built-in or USB webcam. MediaPipe's hand tracking performs well with standard RGB input.

### Intel RealSense
If you have an Intel RealSense camera (D400 series, etc.):
1. Connect your RealSense camera
2. The app will auto-detect it
3. Click the RealSense toggle in the camera view

## Importing ASL Datasets

You can import your own ASL datasets to train/improve the classifier.

### Using Python (Recommended)

```bash
# Install dependencies
pip install mediapipe opencv-python numpy tqdm

# Extract landmarks from images
python scripts/extract_landmarks.py --input ./data/asl_alphabet_train --output src/data/trainingData.json

# Limit images per sign (for testing)
python scripts/extract_landmarks.py --input ./data/asl_alphabet_train --output src/data/trainingData.json --limit 50
```

### Popular Datasets

1. **Kaggle ASL Alphabet**: https://www.kaggle.com/datasets/grassknoted/asl-alphabet
2. **RWTH-BOSTON-104**: https://www-i6.informatik.rwth-aachen.de/~koller/RWTH-BOSTON-104/
3. **ASL-LEX**: https://asl-lex.org/

See `scripts/README.md` for detailed dataset import instructions.

## Project Structure

```
faris-asl-project/
├── src/
│   ├── components/         # React components
│   │   ├── CameraFeed.tsx  # Camera input component
│   │   └── HandTracker.tsx # MediaPipe integration
│   ├── data/
│   │   └── aslData.ts      # ASL sign reference data
│   ├── pages/
│   │   ├── Home.tsx        # Main menu
│   │   ├── LearnMode.tsx   # Learning interface
│   │   ├── PracticeMode.tsx # Practice interface
│   │   └── GameMode.tsx    # Game interface
│   └── utils/
│       ├── aslClassifier.ts   # Sign classification logic
│       ├── landmarkProcessor.ts # Landmark processing
│       └── realsense-bridge.ts # RealSense camera support
├── scripts/
│   ├── importDataset.js    # Node.js dataset importer
│   ├── extract_landmarks.py # Python landmark extractor
│   └── README.md           # Dataset documentation
└── public/                 # Static assets
```

## How It Works

1. **Hand Detection**: MediaPipe Hands detects 21 3D landmarks on your hand
2. **Feature Extraction**: Finger extensions, angles, and positions are calculated
3. **Classification**: Template matching identifies the ASL sign
4. **Feedback**: Real-time feedback helps you improve

### Landmark Structure

```
  0  Wrist
  4  Thumb tip
  8  Index finger tip
  12 Middle finger tip
  16 Ring finger tip
  20 Pinky tip
```

## Troubleshooting

### "No hand detected"
- Improve lighting conditions
- Move closer to the camera
- Ensure your hand is clearly visible
- Check camera permissions

### "Low confidence"
- Hold your hand steady
- Keep fingers clearly separated
- Position hand centrally in frame

### Camera not working
- Check browser permissions
- Try a different browser
- Ensure no other app is using the camera
- Refresh the page

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Technologies

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Hand Tracking**: MediaPipe Hands
- **ML**: TensorFlow.js (for future enhancements)

## License

ISC

## Contributing

Contributions welcome! Areas for improvement:
- Additional sign categories (common words, phrases)
- Two-handed signs
- Motion-based signs (J, Z)
- Neural network training with custom datasets
- Mobile app version

## Acknowledgments

- MediaPipe by Google for hand tracking
- ASL community for sign references
- Kaggle contributors for ASL datasets
