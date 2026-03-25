#!/usr/bin/env node
/**
 * WLASL Dataset Import Script
 *
 * This script imports the WLASL (Word-Level American Sign Language) dataset
 * to improve ASL recognition templates.
 *
 * Dataset: https://github.com/dxli94/WLASL
 * Paper: https://arxiv.org/abs/1910.11019
 *
 * The WLASL dataset contains 21,000+ videos across 2,000+ ASL signs.
 * This script extracts landmarks from videos and generates optimized templates.
 *
 * Prerequisites:
 *   - Python 3.8+ with mediapipe, opencv-python, numpy
 *   - Node.js for this script
 *
 * Usage:
 *   node scripts/importWlaslDataset.js --video-dir=./data/wlasl/videos --json=./data/wlasl/WLASL_v0.3.json
 *   node scripts/importWlaslDataset.js --from-processed=./data/wlasl/landmarks.json
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// Configuration
const CONFIG = {
  // Signs we want to extract (A-Z, 0-9, plus common words)
  targetSigns: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'hello', 'thank', 'you', 'please', 'yes', 'no', 'help', 'sorry'
  ],
  // Maximum videos to process per sign
  maxVideosPerSign: 20,
  // Frame sampling (every Nth frame)
  frameSampleRate: 5,
  // Output paths
  outputTemplates: './src/data/wlaslTemplates.json',
  outputTraining: './src/data/trainingData.json'
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value || true;
    }
  }

  return flags;
}

/**
 * Download WLASL dataset metadata
 */
async function downloadWLASLMetadata(outputPath = './data/wlasl/WLASL_v0.3.json') {
  console.log('Downloading WLASL metadata...');

  const url = 'https://raw.githubusercontent.com/dxli94/WLASL/master/data/splits/wlasl_class_list.txt';

  try {
    // Create directory
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Fetch class list
    const response = await fetch(url);
    const text = await response.text();

    // Parse class list
    const classes = text.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [gloss, id] = line.split('\t');
        return { gloss: gloss.trim(), id: parseInt(id) };
      });

    const metadata = {
      version: '0.3',
      url: 'https://github.com/dxli94/WLASL',
      classes,
      downloaded: new Date().toISOString()
    };

    await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
    console.log(`✓ Metadata saved to ${outputPath}`);
    console.log(`  Found ${classes.length} sign classes`);

    return metadata;
  } catch (error) {
    console.error('✗ Failed to download metadata:', error.message);
    console.log('  Please download manually from: https://github.com/dxli94/WLASL');
    return null;
  }
}

/**
 * Generate Python script for video landmark extraction
 */
function generateExtractionScript(outputPath) {
  const script = `#!/usr/bin/env python3
"""
WLASL Video Landmark Extraction
Extracts MediaPipe landmarks from WLASL dataset videos
"""

import os
import sys
import json
import cv2
import mediapipe as mp
import numpy as np
from pathlib import Path
from tqdm import tqdm

class VideoLandmarkExtractor:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def extract_from_video(self, video_path, sample_rate=5):
        """Extract landmarks from video file"""
        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            return None

        landmarks_list = []
        frame_count = 0
        success = True

        while success:
            success, frame = cap.read()
            if not success:
                break

            # Sample frames
            if frame_count % sample_rate != 0:
                frame_count += 1
                continue

            # Convert to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Process with MediaPipe
            results = self.hands.process(frame_rgb)

            # Extract landmarks
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    landmarks = []
                    for lm in hand_landmarks.landmark:
                        landmarks.append({
                            'x': float(lm.x),
                            'y': float(lm.y),
                            'z': float(lm.z)
                        })
                    landmarks_list.append(landmarks)
                    break  # Only take first hand

            frame_count += 1

        cap.release()

        return landmarks_list if landmarks_list else None

    def process_dataset(self, video_dir, metadata_path, output_path, target_signs=None, max_per_sign=20):
        """Process entire WLASL dataset"""
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

        sign_classes = metadata.get('classes', [])
        training_data = []

        # Filter to target signs
        if target_signs:
            sign_classes = [c for c in sign_classes if c['gloss'].lower() in [s.lower() for s in target_signs]]

        print(f"Processing {len(sign_classes)} sign classes...")

        for sign_class in tqdm(sign_classes, desc="Processing signs"):
            gloss = sign_class['gloss']
            gloss_dir = Path(video_dir) / gloss.lower()

            if not gloss_dir.exists():
                continue

            # Get video files
            video_files = list(gloss_dir.glob('*.mp4'))[:max_per_sign]

            for video_path in video_files:
                landmarks = self.extract_from_video(video_path)

                if landmarks:
                    # Average landmarks across frames for template
                    avg_landmarks = self.average_landmarks(landmarks)

                    training_data.append({
                        'sign': gloss.upper(),
                        'landmarks': avg_landmarks,
                        'source': str(video_path),
                        'frameCount': len(landmarks)
                    })

        # Save output
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(training_data, f, indent=2)

        print(f"\\n✓ Extracted {len(training_data)} samples")
        print(f"✓ Saved to {output_path}")

        return training_data

    def average_landmarks(self, landmarks_list):
        """Average landmark positions across multiple frames"""
        if not landmarks_list:
            return None

        n = len(landmarks_list[0])
        avg_landmarks = []

        for i in range(n):
            x_sum = sum(l[i]['x'] for l in landmarks_list)
            y_sum = sum(l[i]['y'] for l in landmarks_list)
            z_sum = sum(l[i]['z'] for l in landmarks_list)
            count = len(landmarks_list)

            avg_landmarks.append({
                'x': x_sum / count,
                'y': y_sum / count,
                'z': z_sum / count
            })

        return avg_landmarks

def main():
    if len(sys.argv) < 4:
        print("Usage: python extract_wlasl.py <video_dir> <metadata.json> <output.json>")
        sys.exit(1)

    video_dir = sys.argv[1]
    metadata_path = sys.argv[2]
    output_path = sys.argv[3]

    extractor = VideoLandmarkExtractor()

    try:
        extractor.process_dataset(
            video_dir,
            metadata_path,
            output_path,
            target_signs=${JSON.stringify(CONFIG.targetSigns)},
            max_per_sign=${CONFIG.maxVideosPerSign}
        )
    finally:
        extractor.hands.close()

if __name__ == '__main__':
    main()
`;

  return fs.writeFile(outputPath, script);
}

/**
 * Check if Python and required packages are available
 */
async function checkPythonRequirements() {
  return new Promise((resolve) => {
    const python = spawn('python', ['--version']);
    let output = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0 && output.includes('Python 3')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Check if required Python packages are installed
 */
async function checkPythonPackages() {
  const packages = ['cv2', 'mediapipe', 'numpy'];

  for (const pkg of packages) {
    const test = spawn('python', ['-c', `import ${pkg}`]);
    await new Promise(resolve => test.on('close', resolve));

    if (test.exitCode !== 0) {
      console.error(`✗ Missing Python package: ${pkg}`);
      console.log('  Install with: pip install mediapipe opencv-python numpy');
      return false;
    }
  }

  return true;
}

/**
 * Run the landmark extraction
 */
async function runExtraction(videoDir, metadataPath, outputPath) {
  console.log('\n' + '='.repeat(50));
  console.log('Starting WLASL Video Landmark Extraction');
  console.log('='.repeat(50));

  // Check Python
  const hasPython = await checkPythonRequirements();
  if (!hasPython) {
    console.error('✗ Python 3 is required but not found');
    console.log('  Please install Python 3.8 or higher');
    return false;
  }

  // Check packages
  const hasPackages = await checkPythonPackages();
  if (!hasPackages) {
    return false;
  }

  // Generate extraction script
  const scriptPath = './data/wlasl/extract_wlasl.py';
  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  await generateExtractionScript(scriptPath);
  console.log(`✓ Generated extraction script: ${scriptPath}`);

  // Run extraction
  console.log(`\nProcessing videos from: ${videoDir}`);
  console.log(`Metadata: ${metadataPath}`);
  console.log(`Output: ${outputPath}\n`);

  const extractor = spawn('python', [scriptPath, videoDir, metadataPath, outputPath]);

  extractor.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  extractor.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  await new Promise(resolve => extractor.on('close', resolve));

  if (extractor.exitCode === 0) {
    console.log('\n✓ Extraction complete!');
    return true;
  } else {
    console.error('\n✗ Extraction failed');
    return false;
  }
}

/**
 * Process pre-extracted landmarks
 */
async function processPreExtracted(inputPath, outputPath) {
  console.log(`Processing pre-extracted landmarks from: ${inputPath}`);

  try {
    const content = await fs.readFile(inputPath, 'utf8');
    const data = JSON.parse(content);

    console.log(`✓ Loaded ${data.length} samples`);

    // Filter to target signs
    const filtered = data.filter(item =>
      CONFIG.targetSigns.includes(item.sign) ||
      CONFIG.targetSigns.some(s => s.toLowerCase() === item.sign.toLowerCase())
    );

    console.log(`✓ Filtered to ${filtered.length} target sign samples`);

    // Generate statistics
    const signCounts = {};
    filtered.forEach(item => {
      const sign = item.sign.toUpperCase();
      signCounts[sign] = (signCounts[sign] || 0) + 1;
    });

    console.log('\nSamples per sign:');
    for (const [sign, count] of Object.entries(signCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${sign}: ${count}`);
    }

    // Save filtered data
    await fs.writeFile(outputPath, JSON.stringify(filtered, null, 2));
    console.log(`\n✓ Saved to: ${outputPath}`);

    return filtered;
  } catch (error) {
    console.error('✗ Error processing landmarks:', error.message);
    return null;
  }
}

/**
 * Generate enhanced templates from landmarks
 */
async function generateTemplates(trainingDataPath, templatesOutputPath) {
  console.log('\n' + '='.repeat(50));
  console.log('Generating Enhanced Templates');
  console.log('='.repeat(50));

  try {
    const content = await fs.readFile(trainingDataPath, 'utf8');
    const data = JSON.parse(content);

    // Group by sign
    const bySign = {};
    data.forEach(item => {
      const sign = item.sign.toUpperCase();
      if (!bySign[sign]) {
        bySign[sign] = [];
      }
      bySign[sign].push(item.landmarks);
    });

    // Generate templates with statistics
    const templates = {};

    for (const [sign, landmarkSets] of Object.entries(bySign)) {
      if (landmarkSets.length < 3) {
        console.log(`⚠ Skipping ${sign} (only ${landmarkSets.length} samples)`);
        continue;
      }

      // Calculate average template
      const template = calculateAverageTemplate(landmarkSets);

      // Calculate tolerances based on variance
      const tolerances = calculateTolerances(landmarkSets, template);

      templates[sign] = {
        landmarks: template,
        tolerances,
        sampleCount: landmarkSets.length,
        // Key features for quick matching
        features: extractKeyFeatures(template)
      };
    }

    // Save templates
    await fs.writeFile(templatesOutputPath, JSON.stringify(templates, null, 2));

    console.log(`✓ Generated ${Object.keys(templates).length} templates`);
    console.log(`✓ Saved to: ${templatesOutputPath}`);

    return templates;
  } catch (error) {
    console.error('✗ Error generating templates:', error.message);
    return null;
  }
}

/**
 * Calculate average template from multiple landmark sets
 */
function calculateAverageTemplate(landmarkSets) {
  const n = landmarkSets[0].length;
  const template = [];

  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;

    for (const landmarks of landmarkSets) {
      x += landmarks[i].x;
      y += landmarks[i].y;
      z += landmarks[i].z || 0;
    }

    template.push({
      x: x / landmarkSets.length,
      y: y / landmarkSets.length,
      z: z / landmarkSets.length
    });
  }

  return template;
}

/**
 * Calculate tolerances based on landmark variance
 */
function calculateTolerances(landmarkSets, template) {
  const n = template.length;
  const tolerances = [];

  for (let i = 0; i < n; i++) {
    let varX = 0, varY = 0, varZ = 0;

    for (const landmarks of landmarkSets) {
      varX += Math.pow(landmarks[i].x - template[i].x, 2);
      varY += Math.pow(landmarks[i].y - template[i].y, 2);
      varZ += Math.pow((landmarks[i].z || 0) - template[i].z, 2);
    }

    // Use 2 standard deviations as tolerance
    tolerances.push({
      x: 2 * Math.sqrt(varX / landmarkSets.length),
      y: 2 * Math.sqrt(varY / landmarkSets.length),
      z: 2 * Math.sqrt(varZ / landmarkSets.length)
    });
  }

  return tolerances;
}

/**
 * Extract key features for quick matching
 */
function extractKeyFeatures(landmarks) {
  // MediaPipe landmark indices
  const WRIST = 0;
  const THUMB_TIP = 4;
  const INDEX_TIP = 8;
  const MIDDLE_TIP = 12;
  const RING_TIP = 16;
  const PINKY_TIP = 20;
  const INDEX_PIP = 6;
  const MIDDLE_PIP = 10;
  const RING_PIP = 14;
  const PINKY_PIP = 18;

  const wrist = landmarks[WRIST];

  // Calculate distances from wrist to tips
  const thumbDist = distance(wrist, landmarks[THUMB_TIP]);
  const indexDist = distance(wrist, landmarks[INDEX_TIP]);
  const middleDist = distance(wrist, landmarks[MIDDLE_TIP]);
  const ringDist = distance(wrist, landmarks[RING_TIP]);
  const pinkyDist = distance(wrist, landmarks[PINKY_TIP]);

  // Check finger extension (tip above PIP)
  const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
  const middleExtended = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y;
  const ringExtended = landmarks[RING_TIP].y < landmarks[RING_PIP].y;
  const pinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;
  const thumbExtended = thumbDist > 0.15;

  // Average depth
  const avgDepth = landmarks.reduce((sum, lm) => sum + (lm.z || 0), 0) / landmarks.length;
  const depthVariance = landmarks.reduce((sum, lm) =>
    sum + Math.pow((lm.z || 0) - avgDepth, 2), 0) / landmarks.length;

  return {
    fingersExtended: [indexExtended, middleExtended, ringExtended, pinkyExtended],
    thumbExtended,
    distances: { thumbDist, indexDist, middleDist, ringDist, pinkyDist },
    depthFeatures: {
      avgDepth,
      depthVariance
    }
  };
}

function distance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Update aslData.ts with generated templates
 */
async function updateAslData(templatesPath) {
  console.log('\n' + '='.repeat(50));
  console.log('Integration Instructions');
  console.log('='.repeat(50));

  console.log('\nTo integrate the generated templates into your ASL classifier:');
  console.log('\n1. The templates have been saved to:', templatesPath);
  console.log('\n2. Import them in your code:');
  console.log('   import wlaslTemplates from "./src/data/wlaslTemplates.json"');
  console.log('\n3. Use them for template matching in aslClassifier.ts');
  console.log('\n4. The templates include:');
  console.log('   - Average landmark positions');
  console.log('   - Position-specific tolerances');
  console.log('   - Key features for quick matching');
  console.log('   - Depth (z-coordinate) statistics');

  console.log('\n' + '='.repeat(50));
}

/**
 * Main function
 */
async function main() {
  const flags = parseArgs();

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     WLASL Dataset Import Tool for ASL Recognition      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\nDataset: WLASL (Word-Level American Sign Language)');
  console.log('Source: https://github.com/dxli94/WLASL');
  console.log('Papers: https://arxiv.org/abs/1910.11019\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Handle different modes
  if (flags['from-processed']) {
    // Process pre-extracted landmarks
    const inputPath = flags['from-processed'];
    const outputPath = flags['output'] || CONFIG.outputTraining;

    await processPreExtracted(inputPath, outputPath);

    if (flags['generate-templates'] !== false) {
      const templatesPath = flags['templates'] || CONFIG.outputTemplates;
      const templates = await generateTemplates(outputPath, templatesPath);
      if (templates) {
        await updateAslData(templatesPath);
      }
    }
  } else if (flags['video-dir'] && flags['json']) {
    // Extract from videos
    const videoDir = flags['video-dir'];
    const metadataPath = flags['json'];
    const outputPath = flags['output'] || CONFIG.outputTraining;

    const success = await runExtraction(videoDir, metadataPath, outputPath);

    if (success && flags['generate-templates'] !== false) {
      const templatesPath = flags['templates'] || CONFIG.outputTemplates;
      const templates = await generateTemplates(outputPath, templatesPath);
      if (templates) {
        await updateAslData(templatesPath);
      }
    }
  } else if (flags['download-metadata']) {
    // Download metadata
    const outputPath = flags['output'] || './data/wlasl/WLASL_v0.3.json';
    await downloadWLASLMetadata(outputPath);
  } else {
    // Show usage
    console.log('Usage:\n');
    console.log('1. Download WLASL metadata:');
    console.log('   node scripts/importWlaslDataset.js --download-metadata\n');
    console.log('2. Extract landmarks from videos:');
    console.log('   node scripts/importWlaslDataset.js --video-dir=./data/wlasl/videos --json=./data/wlasl/WLASL_v0.3.json\n');
    console.log('3. Process pre-extracted landmarks:');
    console.log('   node scripts/importWlaslDataset.js --from-processed=./landmarks.json\n');
    console.log('4. Options:');
    console.log('   --output=PATH        Output file for training data (default: ./src/data/trainingData.json)');
    console.log('   --templates=PATH     Output file for templates (default: ./src/data/wlaslTemplates.json)');
    console.log('   --generate-templates=false  Skip template generation');
    console.log('\nFor more information, see:');
    console.log('  - Dataset: https://github.com/dxli94/WLASL');
    console.log('  - Paper: https://arxiv.org/abs/1910.11019');
  }

  rl.close();
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateTemplates,
  calculateAverageTemplate,
  extractKeyFeatures
};
