# ASL Dataset Import Guide

This guide explains how to import and use ASL (American Sign Language) datasets to train and improve the ASL recognition system.

## Supported Dataset Formats

### 1. Kaggle ASL Alphabet Dataset

The most common ASL dataset available on Kaggle.

**Download:** https://www.kaggle.com/datasets/grassknoted/asl-alphabet

**Expected Structure:**
```
asl_alphabet_train/
├── A/
│   ├── img1.jpg
│   ├── img2.jpg
│   └── ...
├── B/
│   ├── img1.jpg
│   └── ...
└── ...
```

### 2. Custom Image Dataset

Organize your own ASL images by sign.

**Expected Structure:**
```
my_asl_data/
├── hello/
│   ├── sample1.jpg
│   └── sample2.jpg
├── thank_you/
│   └── sample1.jpg
└── ...
```

### 3. Pre-extracted Landmarks (JSON)

Already processed landmark data in JSON format.

**Format:**
```json
[
  {
    "sign": "A",
    "landmarks": [
      {"x": 0.5, "y": 0.5, "z": 0.0},
      {"x": 0.45, "y": 0.45, "z": 0.01},
      ...
    ],
    "source": "path/to/image.jpg"
  },
  ...
]
```

## Installation

### For Python (Recommended)

```bash
pip install mediapipe opencv-python numpy tqdm
```

### For Node.js

```bash
npm install --save-dev
```

## Usage

### Extract Landmarks from Images (Python)

This is the recommended method for processing image datasets.

```bash
# Process a dataset
python scripts/extract_landmarks.py --input ./data/asl_alphabet_train --output src/data/trainingData.json

# Limit images per sign (for testing)
python scripts/extract_landmarks.py --input ./data/asl_alphabet_train --output src/data/trainingData.json --limit 50

# Analyze existing dataset
python scripts/extract_landmarks.py --analyze src/data/trainingData.json
```

### Import Using Node.js

```bash
# Import Kaggle dataset
node scripts/importDataset.js --source=kaggle --path=./data/asl_alphabet_train

# Import custom dataset
node scripts/importDataset.js --source=custom --path=./my_asl_data

# Import landmarks JSON
node scripts/importDataset.js --source=landmarks --path=./landmarks.json
```

### Merge Multiple Datasets

```bash
# Python
python scripts/extract_landmarks.py --merge data1.json data2.json --output merged.json

# Node.js
node scripts/importDataset.js --merge --input=data1.json,data2.json --output=merged.json
```

## Popular ASL Datasets

### Kaggle ASL Alphabet
- **Source:** https://www.kaggle.com/datasets/grassknoted/asl-alphabet
- **Size:** ~87,000 images
- **Categories:** A-Z, delete, space, nothing
- **Recommended:** Yes

### RWTH-BOSTON-104
- **Source:** https://www-i6.informatik.rwth-aachen.de/~koller/RWTH-BOSTON-104/
- **Type:** Video sequences
- **Categories:** 104 signs
- **Note:** Requires video processing

### ASL-LEX
- **Source:** https://asl-lex.org/
- **Type:** Lexicon database
- **Features:** Phonological properties, iconicity ratings
- **Note:** Good for linguistic research

## Training the Classifier

After extracting landmarks, you can use them to train a neural network:

```javascript
// In your application
import { TrainingData } from './src/data/trainingData.json'
import { trainClassifier } from './src/utils/neuralNetwork'

const model = await trainClassifier(TrainingData)
model.save('./src/data/model.json')
```

## Tips for Better Results

1. **Lighting:** Ensure good, even lighting
2. **Background:** Use plain backgrounds
3. **Hand Position:** Center the hand in frame
4. **Variety:** Include different angles, hand sizes, and skin tones
5. **Balance:** Keep roughly equal samples per sign

## Troubleshooting

### "No hand detected"
- Check image quality and lighting
- Ensure hand is clearly visible
- Try adjusting `--min-confidence`

### "Out of memory"
- Use `--limit` to process fewer images
- Process in batches
- Use a machine with more RAM

### "Invalid JSON output"
- Check MediaPipe version compatibility
- Ensure all landmarks have x, y, z values
- Validate input images

## Contributing

To contribute your own dataset:

1. Extract landmarks using the scripts above
2. Test on your ASL recognition system
3. Share the JSON file (not raw images for privacy)
4. Document the sign categories used

## License

Ensure any datasets you use have appropriate licenses for your use case.
