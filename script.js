import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let sentences = [];
let shuffledSentences = [];
let currentSentenceIndex = 0;
let currentSentence = '';
let translatedSentence = '';
let diacritizedSentence = '';
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
        const response = await fetch('api/hebrew-sentences.json');
        const sentences = await response.json();
        // Use the sentences array here
        return sentences;
      } catch (error) {
        console.error('Error:', error);
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
    updateCheckButtonState();
    updateProgressBar();

    if (sentences.length === 0) {
        sentences = await fetchSentences();
        shuffledSentences = shuffleArray([...sentences]);
    }

    if (nextSentence) {
        currentSentence = nextSentence.original;
        translatedSentence = nextSentence.translated;
        diacritizedSentence = nextSentence.diacritized;
        sentenceAudio = nextSentence.audio;
        nextSentence = null;
    } else {
        currentSentence = shuffledSentences[currentSentenceIndex].trim();
        translatedSentence = await translateSentence(currentSentence);
        diacritizedSentence = await diacritizeSentence(translatedSentence);
        sentenceAudio = await generateSentenceAudio(diacritizedSentence);
    }

    sentenceDisplay.innerText = currentSentence;
    populateWordBank(translatedSentence);

    // Start preloading the next sentence
    preloadNextSentence();
}

async function translateSentence(sentence) {
    const client = await Client.connect("guymorlan/levanti_he_ar");
    const result = await client.predict("/run_translate", { 		
            text: sentence[0],
            input_text: sentence,
            hidden_arabic: "",
            dialect: "פלסטיני",
    });

    return result.data[1];
}

async function diacritizeSentence(arabicSentence) {
    const client = await Client.connect("guymorlan/levanti_he_ar");
    const result = await client.predict("/diacritize", { 		
        text: arabicSentence[0],
        input_text: arabicSentence,
        hidden_arabic: "",
    });

    return result.data[0];
}

async function generateSentenceAudio(sentence) {
    const client = await Client.connect("guymorlan/levanti_en_ar");
    const result = await client.predict("/get_audio", { 		
        text: translatedSentence[0], 
        input_text: translatedSentence, 
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

function checkAnswer() {
    const userSentence = [...sentenceConstructArea.children].map(word => word.textContent).join(' ');

    // Disable clicking on the words
    document.querySelectorAll('.word').forEach(word => {word.style.pointerEvents = 'none'});

    if (userSentence === translatedSentence.replace('؟', '')) { // Correct answer
        // checkButton.innerHTML = '<img src=assets/tick.svg style="height: 30px; color: white;"></img>';
        correctAnswerContainer.classList.add('correct');
        document.body.style.backgroundColor = '#f6fef6';

        score++;
    } else {
        checkButton.style.backgroundColor = '#C22B27';
        // checkButton.innerHTML = '<img src=assets/x.svg style="height: 30px; color: white;"></img>';
        correctAnswerContainer.classList.add('incorrect');
        document.body.style.backgroundColor = '#fdf7f6';

        if (score > 0) score--;
    }

    updateProgressBar();

    correctAnswer.innerText = diacritizedSentence;
    correctAnswerContainer.classList.add('show');

    checkButton.innerText = 'המשך'
    checkButton.removeEventListener('click', checkAnswer);
    checkButton.addEventListener('click', nextQuestion);
}

function nextQuestion() {
    sentenceDisplay.innerHTML = '';
    clearWords();
    correctAnswerContainer.classList = '';

    // Reset button styles and content
    checkButton.innerHTML = 'בדיקה';
    checkButton.style.backgroundColor = 'var(--primary)';
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
        }, 500);
    }
}

function levelUp() {
    level++;

    score = 0;

    // Calculate new words required for next level
    levelupScore = Math.pow(level, 2);

    updateProgressBar();
}