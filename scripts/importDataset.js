/**
 * ASL Dataset Import Script
 *
 * This script helps import ASL datasets for training/improving the classifier.
 * Supports:
 * - Kaggle ASL Alphabet Dataset
 * - Custom ASL image datasets
 * - MediaPipe landmark data exports
 *
 * Usage:
 *   node scripts/importDataset.js --source=kaggle --path=./data/asl_alphabet_train
 *   node scripts/importDataset.js --source=custom --path=./my_asl_data
 *   node scripts/importDataset.js --source=landmarks --path=./landmarks.json
 */

const fs = require('fs').promises
const path = require('path')
const { createWorker, PSM } = require('tesseract.js')

// Dataset configurations
const DATASET_SOURCES = {
  kaggle: {
    name: 'Kaggle ASL Alphabet',
    expectedStructure: 'folders by letter (A, B, C, ...)',
    process: processKaggleDataset
  },
  custom: {
    name: 'Custom Images',
    expectedStructure: 'folders by sign name',
    process: processCustomDataset
  },
  landmarks: {
    name: 'MediaPipe Landmarks',
    expectedStructure: 'JSON file with landmark data',
    process: processLandmarksDataset
  }
}

/**
 * Process Kaggle-style ASL Alphabet dataset
 * Expected structure: root/A/img1.jpg, root/B/img2.jpg, etc.
 */
async function processKaggleDataset(datasetPath, outputPath) {
  console.log('Processing Kaggle ASL Alphabet dataset...')

  const signCategories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                          'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
                          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

  const trainingData = []
  let processedCount = 0

  for (const sign of signCategories) {
    const signPath = path.join(datasetPath, sign)

    try {
      const files = await fs.readdir(signPath)
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))

      // Limit images per sign to prevent memory issues
      const samplesToProcess = imageFiles.slice(0, 100)

      for (const file of samplesToProcess) {
        const filePath = path.join(signPath, file)

        // Extract landmarks from image
        const landmarks = await extractLandmarksFromImage(filePath)

        if (landmarks) {
          trainingData.push({
            sign,
            landmarks,
            source: filePath
          })
          processedCount++
        }

        if (processedCount % 10 === 0) {
          console.log(`Processed ${processedCount} images...`)
        }
      }
    } catch (error) {
      console.warn(`Could not process sign ${sign}:`, error.message)
    }
  }

  // Save training data
  await fs.writeFile(
    outputPath,
    JSON.stringify(trainingData, null, 2)
  )

  console.log(`Dataset import complete! Processed ${processedCount} images.`)
  console.log(`Data saved to: ${outputPath}`)

  return trainingData
}

/**
 * Process custom dataset with user-defined sign folders
 */
async function processCustomDataset(datasetPath, outputPath) {
  console.log('Processing custom ASL dataset...')

  const trainingData = []

  try {
    const entries = await fs.readdir(datasetPath, { withFileTypes: true })
    const signFolders = entries.filter(e => e.isDirectory())

    console.log(`Found ${signFolders.length} sign categories`)

    for (const folder of signFolders) {
      const sign = folder.name
      const signPath = path.join(datasetPath, sign)
      const files = await fs.readdir(signPath)
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))

      console.log(`Processing ${sign}: ${imageFiles.length} images`)

      for (const file of imageFiles.slice(0, 50)) {
        const filePath = path.join(signPath, file)
        const landmarks = await extractLandmarksFromImage(filePath)

        if (landmarks) {
          trainingData.push({
            sign,
            landmarks,
            source: filePath
          })
        }
      }
    }

    await fs.writeFile(outputPath, JSON.stringify(trainingData, null, 2))
    console.log(`Processed ${trainingData.length} samples`)
    console.log(`Data saved to: ${outputPath}`)

  } catch (error) {
    console.error('Error processing custom dataset:', error)
    throw error
  }

  return trainingData
}

/**
 * Process existing landmarks JSON file
 */
async function processLandmarksDataset(datasetPath, outputPath) {
  console.log('Processing landmarks dataset...')

  try {
    const content = await fs.readFile(datasetPath, 'utf8')
    const data = JSON.parse(content)

    // Validate and clean data
    const cleanedData = data.filter(item => {
      return item.sign && item.landmarks && Array.isArray(item.landmarks)
    })

    console.log(`Loaded ${cleanedData.length} landmark samples`)

    // Analyze data
    const signCounts = {}
    cleanedData.forEach(item => {
      signCounts[item.sign] = (signCounts[item.sign] || 0) + 1
    })

    console.log('Samples per sign:')
    Object.entries(signCounts).sort((a, b) => b[1] - a[1]).forEach(([sign, count]) => {
      console.log(`  ${sign}: ${count}`)
    })

    // Save cleaned data
    await fs.writeFile(outputPath, JSON.stringify(cleanedData, null, 2))
    console.log(`Cleaned data saved to: ${outputPath}`)

    return cleanedData

  } catch (error) {
    console.error('Error processing landmarks dataset:', error)
    throw error
  }
}

/**
 * Extract landmarks from image using MediaPipe
 * Note: This requires running in a browser or using a node wrapper
 * For now, this is a placeholder that returns simulated data
 */
async function extractLandmarksFromImage(imagePath) {
  // In a real implementation, this would:
  // 1. Load the image
  // 2. Run MediaPipe Hands detection
  // 3. Extract and normalize landmarks
  // 4. Return the landmark array

  // For demonstration, return null
  // You would need to implement this using:
  // - @mediapipe/hands with a Node.js wrapper
  // - Or a Python script with opencv and mediapipe
  // - Or export pre-extracted landmarks

  console.warn(`Landmark extraction not implemented for ${imagePath}`)
  console.warn('Please use a pre-extracted landmarks dataset or implement extraction')

  return null
}

/**
 * Generate statistical summary of dataset
 */
async function generateDatasetStats(dataPath) {
  const content = await fs.readFile(dataPath, 'utf8')
  const data = JSON.parse(content)

  const stats = {
    totalSamples: data.length,
    signCounts: {},
    avgLandmarkCount: 0,
    issues: []
  }

  let totalLandmarks = 0

  data.forEach(item => {
    // Count signs
    stats.signCounts[item.sign] = (stats.signCounts[item.sign] || 0) + 1

    // Count landmarks
    if (item.landmarks) {
      totalLandmarks += item.landmarks.length || 0
    }

    // Check for issues
    if (!item.landmarks || item.landmarks.length !== 21) {
      stats.issues.push(`Invalid landmark count for ${item.sign}`)
    }
  })

  stats.avgLandmarkCount = totalLandmarks / data.length

  return stats
}

/**
 * Merge multiple datasets
 */
async function mergeDatasets(inputPaths, outputPath) {
  console.log('Merging datasets...')

  const mergedData = []

  for (const inputPath of inputPaths) {
    try {
      const content = await fs.readFile(inputPath, 'utf8')
      const data = JSON.parse(content)
      mergedData.push(...data)
      console.log(`Loaded ${data.length} samples from ${inputPath}`)
    } catch (error) {
      console.error(`Error loading ${inputPath}:`, error.message)
    }
  }

  await fs.writeFile(outputPath, JSON.stringify(mergedData, null, 2))
  console.log(`Merged ${mergedData.length} total samples to ${outputPath}`)

  return mergedData
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const flags = {}
  const positional = []

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      flags[key] = value || true
    } else {
      positional.push(arg)
    }
  }

  const source = flags.source || 'kaggle'
  const inputPath = flags.path || './data/asl_dataset'
  const outputPath = flags.output || './src/data/trainingData.json'

  console.log('='.repeat(50))
  console.log('ASL Dataset Import Tool')
  console.log('='.repeat(50))
  console.log(`Source: ${source}`)
  console.log(`Input: ${inputPath}`)
  console.log(`Output: ${outputPath}`)
  console.log('='.repeat(50))

  try {
    // Check if source is valid
    if (!DATASET_SOURCES[source]) {
      console.error(`Unknown source: ${source}`)
      console.log('Available sources:', Object.keys(DATASET_SOURCES).join(', '))
      process.exit(1)
    }

    // Process dataset
    const datasetInfo = DATASET_SOURCES[source]
    console.log(`\nProcessing ${datasetInfo.name} dataset...`)
    console.log(`Expected structure: ${datasetInfo.expectedStructure}\n`)

    const data = await datasetInfo.process(inputPath, outputPath)

    // Generate stats
    console.log('\nGenerating statistics...')
    const stats = await generateDatasetStats(outputPath)

    console.log('\n' + '='.repeat(50))
    console.log('Dataset Statistics:')
    console.log('='.repeat(50))
    console.log(`Total samples: ${stats.totalSamples}`)
    console.log(`Average landmarks per sample: ${stats.avgLandmarkCount.toFixed(1)}`)
    console.log(`Sign categories: ${Object.keys(stats.signCounts).length}`)

    if (stats.issues.length > 0) {
      console.log(`\n⚠️  Found ${stats.issues.length} issues`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('Import complete!')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('\n❌ Import failed:', error.message)
    process.exit(1)
  }
}

// Export functions for testing
module.exports = {
  processKaggleDataset,
  processCustomDataset,
  processLandmarksDataset,
  generateDatasetStats,
  mergeDatasets
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error)
}
