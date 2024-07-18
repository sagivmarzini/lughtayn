import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";
const client = await Client.connect("guymorlan/levanti_he_ar");

let sentences = [];
let shuffledSentences = [];
let currentSentenceIndex = 0;
let currentSentence = '';
let arabicSentence = '';
let diacritizedArabic = '';
let nextSentence = null;
let sentenceAudio = null;
let score = 0;
let levelupScore = 5;
let level = 1;

const sentenceConstructArea = document.getElementById('construct-sentence');
const wordBankArea = document.getElementById('word-bank');
const checkButton = document.getElementById('check');
const sentenceDisplay = document.getElementById('sentence');
const correctAnswerContainer = document.getElementById('correct-answer-container');
const correctAnswer = document.getElementById('correct-answer');
const progressBar = document.getElementById('progress');

checkButton.addEventListener('click', checkAnswer);

startGame();

async function fetchSentences() {
    try {
        const response = await fetch('../api/hebrew-sentences.json');
        const sentences = await response.json();
        // Use the sentences array here
        return sentences;
      } catch (error) {
        console.error('Error fetching Hebrew sentences:', error);
      }
}

function updateCheckButtonState() {
    checkButton.disabled = sentenceConstructArea.children.length === 0;
}

function handleWordMovement() {
    const words = document.querySelectorAll('.word');

    words.forEach(word => {
        word.addEventListener('click', () => {
            if (word.parentElement == wordBankArea) {
                wordBankArea.removeChild(word);
                sentenceConstructArea.appendChild(word);
            } else if (word.parentElement == sentenceConstructArea) {
                sentenceConstructArea.removeChild(word);
                wordBankArea.appendChild(word);
            }
            updateCheckButtonState();
        })
    })
}

async function startGame() {
    if (sentences.length === 0) {
        // if (loadGameState()) {
        //     console.log("Loaded saved game");
        // } else {
            console.log("No save found, starting new game...")
            sentences = await fetchSentences();
            shuffledSentences = shuffleArray([...sentences]);
        // }
    }
    
    if (nextSentence) {
        currentSentence = nextSentence.original;
        arabicSentence = nextSentence.translated;
        diacritizedArabic = nextSentence.diacritized;
        sentenceAudio = nextSentence.audio;
        nextSentence = null;
    } else {
        currentSentence = shuffledSentences[currentSentenceIndex].trim();
        arabicSentence = await translateSentence(currentSentence);
        diacritizedArabic = await diacritizeSentence(arabicSentence);
        sentenceAudio = await generateSentenceAudio(diacritizedArabic);
    }

    saveGameState();
    
    loadGameContents();
    
    preloadNextSentence();
}

function loadGameContents() {
    updateCheckButtonState();
    updateProgressBar();
    sentenceDisplay.innerText = currentSentence;
    populateWordBank(arabicSentence);
}

function checkAnswer() {
    new Audio(sentenceAudio).play();

    const constructWords = [...sentenceConstructArea.children].map(word => word.textContent);
    const userSentence = constructWords.join(' ');

    // Disable clicking on the words
    document.querySelectorAll('.word').forEach(word => { word.style.pointerEvents = 'none' });

    // if (compareSentenceWithWordArray(arabicSentence.replace('؟', ''), constructWords)) { // Correct answer
    if (arabicSentence.replace('؟', '') === userSentence) { // Correct answer
        correctAnswerContainer.classList.add('correct');
        document.body.style.backgroundColor = '#f6fef6';

        score++;
    } else {
        checkButton.style.backgroundColor = '#C22B27';
        correctAnswerContainer.classList.add('incorrect');
        document.body.style.backgroundColor = '#fdf7f6';

        if (score > 0) score--; // Prevent negative score
    }

    updateProgressBar();

    correctAnswer.innerText = diacritizedArabic;
    correctAnswerContainer.classList.add('show');


    checkButton.innerText = 'המשך'
    checkButton.removeEventListener('click', checkAnswer);
    checkButton.addEventListener('click', nextQuestion);
    
    saveGameState();
}

function nextQuestion() {
    sentenceDisplay.innerHTML = '';
    clearWords();
    correctAnswerContainer.classList = '';

    // Reset button styles and content
    checkButton.innerHTML = 'בדיקה';
    checkButton.style = '';
    updateCheckButtonState();
    document.body.style.backgroundColor = 'var(--background)';
    
    currentSentenceIndex = (currentSentenceIndex + 1) % shuffledSentences.length;
    
    // Start the game again with the next sentence
    startGame();
    
    // Switch back to checkAnswer listener
    checkButton.removeEventListener('click', nextQuestion);
    checkButton.addEventListener('click', checkAnswer);
}

function clearWords() {
    wordBankArea.innerHTML = '';
    sentenceConstructArea.innerHTML = '';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function preloadNextSentence() {
    const nextIndex = (currentSentenceIndex + 1) % shuffledSentences.length;
    const sentence = shuffledSentences[nextIndex].trim();
    const translated = await translateSentence(sentence);
    const diacritized = await diacritizeSentence(translated);
    const audioUrl = await generateSentenceAudio(diacritized);
    nextSentence = { original: sentence, translated, diacritized, audio: audioUrl };
}

function updateProgressBar() {
    const progressPercentage = (score / levelupScore) * 100;

    progressBar.style.width = `${progressPercentage}%`;

    if (score >= levelupScore) {
        progressBar.style.width = '100%';

        setTimeout(() => {
            levelUp();
        }, 1000);
    }
}

function levelUp() {
    level++;

    score = 0;

    // Calculate new words required for next level
    levelupScore = Math.pow(level, 2);

    updateProgressBar();
}

function compareSentenceWithWordArray(sentence, wordArray) {
    // Split the sentence into words
    const sentenceWords = sentence.trim().split(/\s+/);
    
    // Check if the lengths are too different
    if (Math.abs(sentenceWords.length - wordArray.length) > 0) {
        return false;
    }
    
    // Count matching words
    let matchCount = 0;
    let usedIndices = new Set();
    
    for (let i = 0; i < sentenceWords.length; i++) {
        for (let j = 0; j < wordArray.length; j++) {
            if (sentenceWords[i] === wordArray[j] && !usedIndices.has(j)) {
                matchCount++;
                usedIndices.add(j);
                break;
            }
        }
    }
    
    // Allow for one word to be out of place or missing/extra
    return matchCount >= Math.max(sentenceWords.length, wordArray.length) - 1;
}

function saveGameState() {
    const gameState = {
        sentences,
        shuffledSentences: shuffledSentences,
        currentSentenceIndex,
        currentSentence,
        arabicSentence,
        diacritizedArabic,
        nextSentence,
        sentenceAudio,
        score,
        levelupScore,
        level
    };
    localStorage.setItem('LughtaynGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('LughtaynGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        ({
            sentences,
            shuffledSentences,
            currentSentenceIndex,
            currentSentence,
            arabicSentence,
            diacritizedArabic,
            nextSentence,
            sentenceAudio,
            score,
            levelupScore,
            level
        } = gameState);
        return true;
    }
    return false;
}

async function translateSentence(sentence) {
    const result = await client.predict("/run_translate", { 		
        text: sentence[0],
        input_text: sentence,
        hidden_arabic: "",
        dialect: "פלסטיני",
    });

    return result.data[1];
}

async function diacritizeSentence(arabicSentence) {
    const result = await client.predict("/diacritize", { 		
        text: arabicSentence[0],
        input_text: arabicSentence,
        hidden_arabic: "",
    });

    return result.data[0];
}

async function generateSentenceAudio(sentence) {
    const result = await client.predict("/get_audio", { 		
        text: sentence[0], 
        input_text: sentence,
        hidden_arabic: ''
    });

    return result.data[0].url;
}

function populateWordBank(translatedSentence) {
    clearWords();

    const words = translatedSentence.replace('؟', '').split(' ');
    const shuffledWords = shuffleArray(words);

    words.forEach(word => {
        const newButton = document.createElement('button');
        newButton.classList = 'word';
        newButton.textContent = word;

        wordBankArea.appendChild(newButton);
    })

    handleWordMovement();
}