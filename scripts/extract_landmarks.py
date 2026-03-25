#!/usr/bin/env python3
"""
ASL Landmark Extraction Script

This script extracts hand landmarks from ASL dataset images using MediaPipe.
The extracted landmarks can be used to train/improve the ASL classifier.

Requirements:
    pip install mediapipe opencv-python numpy tqdm

Usage:
    python extract_landmarks.py --input ./data/asl_alphabet_train --output ./src/data/trainingData.json
    python extract_landmarks.py --input ./my_asl_data --output landmarks.json --limit 50
"""

import os
import json
import argparse
import numpy as np
from pathlib import Path
from tqdm import tqdm
import cv2
import mediapipe as mp


class LandmarkExtractor:
    """Extract hand landmarks from images using MediaPipe Hands"""

    def __init__(self, max_hands=1, min_detection_confidence=0.5, min_tracking_confidence=0.5):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            max_num_hands=max_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        self.mp_draw = mp.solutions.drawing_utils

    def extract_from_image(self, image_path):
        """
        Extract landmarks from a single image

        Args:
            image_path: Path to the image file

        Returns:
            List of landmarks (21 points with x, y, z coordinates) or None if no hand detected
        """
        # Read image
        image = cv2.imread(str(image_path))
        if image is None:
            return None

        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Process with MediaPipe
        results = self.hands.process(image_rgb)

        # Extract landmarks
        if results.multi_hand_landmarks:
            # Get the first hand detected
            hand_landmarks = results.multi_hand_landmarks[0]

            # Convert to list of dicts
            landmarks = []
            for lm in hand_landmarks.landmark:
                landmarks.append({
                    'x': float(lm.x),
                    'y': float(lm.y),
                    'z': float(lm.z)
                })

            return landmarks

        return None

    def process_dataset(self, input_dir, output_file, limit_per_sign=None):
        """
        Process an entire dataset directory

        Expected structure:
            input_dir/
                A/
                    img1.jpg
                    img2.jpg
                B/
                    img3.jpg
                ...

        Args:
            input_dir: Root directory of the dataset
            output_file: Path to save the output JSON
            limit_per_sign: Maximum number of images to process per sign
        """
        input_path = Path(input_dir)

        if not input_path.exists():
            raise FileNotFoundError(f"Input directory not found: {input_dir}")

        # Find all sign categories (subdirectories)
        sign_dirs = [d for d in input_path.iterdir() if d.is_dir()]
        sign_dirs.sort()

        print(f"Found {len(sign_dirs)} sign categories")
        print(f"Processing dataset from: {input_dir}")

        training_data = []
        total_processed = 0
        total_failed = 0

        # Process each sign category
        for sign_dir in tqdm(sign_dirs, desc="Processing signs"):
            sign = sign_dir.name

            # Get image files
            image_files = []
            for ext in ['*.jpg', '*.jpeg', '*.png', '*.webp', '*.JPG', '*.JPEG', '*.PNG']:
                image_files.extend(sign_dir.glob(ext))

            # Apply limit if specified
            if limit_per_sign:
                image_files = image_files[:limit_per_sign]

            # Process images for this sign
            for image_path in tqdm(image_files, desc=f"  {sign}", leave=False):
                landmarks = self.extract_from_image(image_path)

                if landmarks:
                    training_data.append({
                        'sign': sign,
                        'landmarks': landmarks,
                        'source': str(image_path)
                    })
                    total_processed += 1
                else:
                    total_failed += 1

        # Save to JSON
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(training_data, f, indent=2)

        # Print statistics
        print(f"\n{'='*50}")
        print(f"Processing complete!")
        print(f"{'='*50}")
        print(f"Total processed: {total_processed}")
        print(f"Total failed: {total_failed}")
        print(f"Success rate: {total_processed/(total_processed+total_failed)*100:.1f}%")

        # Count samples per sign
        sign_counts = {}
        for item in training_data:
            sign = item['sign']
            sign_counts[sign] = sign_counts.get(sign, 0) + 1

        print(f"\nSamples per sign:")
        for sign, count in sorted(sign_counts.items()):
            print(f"  {sign}: {count}")

        print(f"\nOutput saved to: {output_file}")

        return training_data

    def close(self):
        """Clean up resources"""
        self.hands.close()


def analyze_dataset(json_file):
    """Analyze a training data JSON file"""
    with open(json_file, 'r') as f:
        data = json.load(f)

    print(f"\nDataset Analysis: {json_file}")
    print(f"{'='*50}")

    # Count signs
    sign_counts = {}
    for item in data:
        sign = item['sign']
        sign_counts[sign] = sign_counts.get(sign, 0) + 1

    print(f"Total samples: {len(data)}")
    print(f"Unique signs: {len(sign_counts)}")

    # Calculate statistics
    counts = list(sign_counts.values())
    print(f"Mean samples per sign: {np.mean(counts):.1f}")
    print(f"Median samples per sign: {np.median(counts):.1f}")
    print(f"Min samples: {min(counts)}")
    print(f"Max samples: {max(counts)}")

    print(f"\nSign distribution:")
    for sign, count in sorted(sign_counts.items()):
        bar = '█' * (count // 5)
        print(f"  {sign}: {count:3d} {bar}")

    return sign_counts


def merge_datasets(input_files, output_file):
    """Merge multiple training data JSON files"""
    merged_data = []

    for input_file in input_files:
        with open(input_file, 'r') as f:
            data = json.load(f)
            merged_data.extend(data)
            print(f"Loaded {len(data)} samples from {input_file}")

    # Remove duplicates based on source path
    seen = set()
    unique_data = []
    for item in merged_data:
        source = item.get('source', '')
        if source not in seen:
            seen.add(source)
            unique_data.append(item)

    print(f"\nTotal merged: {len(merged_data)}")
    print(f"Total unique: {len(unique_data)}")

    with open(output_file, 'w') as f:
        json.dump(unique_data, f, indent=2)

    print(f"Saved to: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Extract hand landmarks from ASL dataset images',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process Kaggle ASL Alphabet dataset
  python extract_landmarks.py --input ./data/asl_alphabet_train --output trainingData.json

  # Process with limit per sign (for testing)
  python extract_landmarks.py --input ./data/asl_alphabet_train --output test_data.json --limit 10

  # Analyze existing dataset
  python extract_landmarks.py --analyze trainingData.json

  # Merge multiple datasets
  python extract_landmarks.py --merge data1.json data2.json --output merged.json
        """
    )

    parser.add_argument('--input', '-i', type=str, help='Input directory containing sign folders')
    parser.add_argument('--output', '-o', type=str, default='trainingData.json', help='Output JSON file')
    parser.add_argument('--limit', '-l', type=int, help='Limit images per sign')
    parser.add_argument('--analyze', '-a', type=str, help='Analyze existing dataset JSON')
    parser.add_argument('--merge', '-m', nargs='+', help='Merge multiple JSON files')
    parser.add_argument('--min-confidence', type=float, default=0.5, help='Minimum detection confidence')

    args = parser.parse_args()

    # Analysis mode
    if args.analyze:
        analyze_dataset(args.analyze)
        return

    # Merge mode
    if args.merge:
        merge_datasets(args.merge, args.output)
        return

    # Extraction mode
    if not args.input:
        parser.error('--input is required for extraction mode")

    extractor = LandmarkExtractor(min_detection_confidence=args.min_confidence)

    try:
        extractor.process_dataset(args.input, args.output, args.limit)
    finally:
        extractor.close()


if __name__ == '__main__':
    main()
