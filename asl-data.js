// ASL Data - Reference information for alphabet, numbers, and simple sentences

const ASL_DATA = {
    // Alphabet A-Z with descriptions and key features for recognition
    alphabet: {
        'A': {
            description: 'Fist with thumb on side',
            tips: 'Make a fist, place your thumb beside your index finger',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false], // index, middle, ring, pinky
                thumbPosition: 'side'
            }
        },
        'B': {
            description: 'Flat hand, fingers together, thumb tucked',
            tips: 'Keep all fingers straight and together, thumb across palm',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, true, true],
                fingersTogether: true
            }
        },
        'C': {
            description: 'Curved hand, like holding a ball',
            tips: 'Curve fingers and thumb to form a C shape',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [false, false, false, false],
                handShape: 'curved'
            }
        },
        'D': {
            description: 'Index up, others curved, thumb extended',
            tips: 'Point index finger up, curve other fingers, thumb out to side',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, false, false, false],
                indexStraight: true
            }
        },
        'E': {
            description: 'Fingers bent down, thumb across fingers',
            tips: 'Bend all fingers down, thumb resting on top',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false],
                fingersBent: true
            }
        },
        'F': {
            description: 'OK sign, other fingers up',
            tips: 'Make OK sign with thumb and index, other fingers up',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, true, true, true],
                thumbTouchingIndex: true
            }
        },
        'G': {
            description: 'Pointing sideways, thumb parallel',
            tips: 'Point index and thumb sideways, like holding a plate',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, false, false, false],
                horizontal: true
            }
        },
        'H': {
            description: 'Index and middle pointing sideways',
            tips: 'Extend index and middle finger sideways, like peace sign sideways',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, false, false],
                horizontal: true
            }
        },
        'I': {
            description: 'Pinky finger up only',
            tips: 'Extend only your pinky finger',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, true]
            }
        },
        'J': {
            description: 'Like I, but with a motion',
            tips: 'Like I, but move your hand in a J shape',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, true],
                requiresMotion: true
            }
        },
        'K': {
            description: 'Index and middle up, thumb between',
            tips: 'Index and middle up, thumb between them',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, true, false, false],
                thumbBetweenFingers: true
            }
        },
        'L': {
            description: 'L shape with thumb and index',
            tips: 'Make L shape with thumb and index finger',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, false, false, false],
                lShape: true
            }
        },
        'M': {
            description: 'Three fingers over thumb',
            tips: 'Thumb under three fingers',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false],
                thumbUnderFingers: true
            }
        },
        'N': {
            description: 'Two fingers over thumb',
            tips: 'Thumb under index and middle fingers',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false],
                thumbUnderTwoFingers: true
            }
        },
        'O': {
            description: 'Fingers and thumb form O',
            tips: 'Touch all fingertips to thumb tip',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [false, false, false, false],
                allFingertipsTouchThumb: true
            }
        },
        'P': {
            description: 'Like K, pointing down',
            tips: 'Like K but pointing downward',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, true, false, false],
                pointingDown: true
            }
        },
        'Q': {
            description: 'Like G, pointing down',
            tips: 'Like G but pointing downward',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, false, false, false],
                pointingDown: true
            }
        },
        'R': {
            description: 'Index and middle crossed',
            tips: 'Cross index and middle fingers',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, false, false],
                crossedFingers: true
            }
        },
        'S': {
            description: 'Fist, thumb over fingers',
            tips: 'Make a fist with thumb over fingers',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false],
                thumbOverFingers: true
            }
        },
        'T': {
            description: 'Thumb under index finger',
            tips: 'Thumb tucked under index finger',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false],
                thumbUnderIndex: true
            }
        },
        'U': {
            description: 'Index and middle together pointing up',
            tips: 'Index and middle together, other fingers closed',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, false, false],
                firstTwoTogether: true
            }
        },
        'V': {
            description: 'Peace sign',
            tips: 'Index and middle spread apart in V shape',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, false, false],
                firstTwoSpread: true
            }
        },
        'W': {
            description: 'Three fingers up',
            tips: 'Index, middle, and ring fingers up',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, true, false]
            }
        },
        'X': {
            description: 'Index finger hooked, thumb curled',
            tips: 'Hook index finger like a claw',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false],
                indexHooked: true
            }
        },
        'Y': {
            description: 'Shaka sign - thumb and pinky out',
            tips: 'Thumb and pinky extended, other fingers closed',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [false, false, false, true]
            }
        },
        'Z': {
            description: 'Index finger drawing Z',
            tips: 'Draw Z shape with index finger',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, false, false, false],
                requiresMotion: true
            }
        }
    },

    // Numbers 0-9
    numbers: {
        '0': {
            description: 'Fist - like letter O but smaller',
            tips: 'Make a fist with thumb touching fingers',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [false, false, false, false]
            }
        },
        '1': {
            description: 'Index finger up',
            tips: 'Extend just your index finger straight up',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, false, false, false]
            }
        },
        '2': {
            description: 'Index and middle up (like V)',
            tips: 'Extend index and middle fingers',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, false, false]
            }
        },
        '3': {
            description: 'Three fingers up',
            tips: 'Extend index, middle, and ring fingers',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, true, false]
            }
        },
        '4': {
            description: 'All four fingers up',
            tips: 'Extend all four fingers, thumb tucked',
            keyFeatures: {
                thumbExtended: false,
                fingersExtended: [true, true, true, true]
            }
        },
        '5': {
            description: 'Open hand, all fingers spread',
            tips: 'Open your hand with all fingers spread',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [true, true, true, true]
            }
        },
        '6': {
            description: 'Thumb and pinky out (like Y)',
            tips: 'Extend thumb and pinky, like hang loose',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [false, false, false, true]
            }
        },
        '7': {
            description: 'Three fingers and thumb touching',
            tips: 'Touch thumb to index, middle, and ring fingertips',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [false, false, false, true],
                special: 'three-finger-pinch'
            }
        },
        '8': {
            description: 'Thumb and index touch, middle up',
            tips: 'Touch thumb to index, middle finger up',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [false, true, false, false],
                special: 'thumb-index-touch'
            }
        },
        '9': {
            description: 'Thumb touches index, index hooked',
            tips: 'Hook index finger and touch with thumb',
            keyFeatures: {
                thumbExtended: true,
                fingersExtended: [false, false, false, false],
                indexHooked: true
            }
        }
    },

    // Simple sentences with their sign sequences
    sentences: [
        {
            text: 'HELLO',
            signs: ['H', 'E', 'L', 'L', 'O'],
            tips: 'Wave hello after signing'
        },
        {
            text: 'THANK YOU',
            signs: ['T', 'H', 'A', 'N', 'K', 'Y', 'O', 'U'],
            tips: 'Move hand from chin outward'
        },
        {
            text: 'PLEASE',
            signs: ['P', 'L', 'E', 'A', 'S', 'E'],
            tips: 'Make circular motion on chest'
        },
        {
            text: 'GOOD MORNING',
            signs: ['G', 'O', 'O', 'D', 'M', 'O', 'R', 'N', 'I', 'N', 'G'],
            tips: 'Good: flat hand from chin forward. Morning: same as good'
        },
        {
            text: 'HOW ARE YOU',
            signs: ['H', 'O', 'W', 'A', 'R', 'E', 'Y', 'O', 'U'],
            tips: 'Both hands forward, palms up for "how"'
        },
        {
            text: 'MY NAME IS',
            signs: ['M', 'Y', 'N', 'A', 'M', 'E', 'I', 'S'],
            tips: 'Point to chest for "my", then fingerspell'
        },
        {
            text: 'NICE TO MEET YOU',
            signs: ['N', 'I', 'C', 'E', 'T', 'O', 'M', 'E', 'E', 'T', 'Y', 'O', 'U'],
            tips: 'Both hands flat, move forward then back'
        },
        {
            text: 'I LOVE YOU',
            signs: ['I', 'L', 'O', 'V', 'E', 'Y', 'O', 'U'],
            tips: 'Can also use "I love you" hand sign (pink, index, thumb up)'
        },
        {
            text: 'YES',
            signs: ['Y', 'E', 'S'],
            tips: 'Make fist and nod it like a head nodding'
        },
        {
            text: 'NO',
            signs: ['N', 'O'],
            tips: 'Tap thumb with first two fingers'
        }
    ]
};

// Get sequence of signs for a game mode
function getSignSequence(mode) {
    switch(mode) {
        case 'alphabet':
            return Object.keys(ASL_DATA.alphabet);
        case 'numbers':
            return Object.keys(ASL_DATA.numbers);
        case 'sentences':
            return ASL_DATA.sentences[Math.floor(Math.random() * ASL_DATA.sentences.length)].signs;
        case 'free':
            return Object.keys({...ASL_DATA.alphabet, ...ASL_DATA.numbers});
        default:
            return Object.keys(ASL_DATA.alphabet);
    }
}

// Get description for a sign
function getSignDescription(sign) {
    if (ASL_DATA.alphabet[sign]) {
        return ASL_DATA.alphabet[sign];
    }
    if (ASL_DATA.numbers[sign]) {
        return ASL_DATA.numbers[sign];
    }
    return { description: 'Unknown sign', tips: '' };
}

// Get all achievements definition
const ACHIEVEMENTS = [
    { id: 'first_steps', name: 'First Steps', icon: '🌟', requirement: 5, description: '5 correct signs' },
    { id: 'on_fire', name: 'On Fire!', icon: '🔥', requirement: 20, description: '20 correct signs' },
    { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', requirement: 10, description: '10 streak' },
    { id: 'asl_master', name: 'ASL Master', icon: '👑', requirement: 50, description: '50 correct signs' },
    { id: 'perfect_game', name: 'Perfect Game', icon: '💎', requirement: 100, description: '100% accuracy in a session' },
    { id: 'alphabet_complete', name: 'ABC Expert', icon: '📚', requirement: 26, description: 'Complete alphabet once' },
    { id: 'numbers_complete', name: 'Number Cruncher', icon: '🔢', requirement: 10, description: 'Complete numbers once' }
];
