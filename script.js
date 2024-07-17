import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let sentences = [];
let shuffledSentences = [];
let currentSentenceIndex = 0;
let currentSentence = '';
let translatedSentence = '';
let nextSentence = null;

const sentenceConstructArea = document.getElementById('construct-sentence');
const wordBankArea = document.getElementById('word-bank');
const checkButton = document.getElementById('check');
const sentenceDisplay = document.getElementById('sentence');
const correctAnswerContainer = document.getElementById('correct-answer-container');
const correctAnswer = document.getElementById('correct-answer');

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
    if (sentences.length === 0) {
        sentences = await fetchSentences();
        shuffledSentences = shuffleArray([...sentences]);
    }

    if (nextSentence) {
        currentSentence = nextSentence.original;
        translatedSentence = nextSentence.translated;
        nextSentence = null;
    } else {
        currentSentence = shuffledSentences[currentSentenceIndex].trim();
        translatedSentence = await translateSentence(currentSentence);
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

async function diacritizeSentence(sentence) {
    const client = await Client.connect("guymorlan/levanti_he_ar");
    const result = await client.predict("/diacritize", { 		
        text: result.data[1][0],
        input_text: result.data[1], 
    });

    return result.data[0]
}

function populateWordBank(translatedSentence) {
    clearWords();

    const words = translatedSentence.split(' ');
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

    if (userSentence === translatedSentence) { // Correct answer
        // checkButton.innerHTML = '<img src=assets/tick.svg style="height: 30px; color: white;"></img>';
        correctAnswerContainer.classList.add('correct');

        document.body.style.backgroundColor = '#f6fef6';
    } else {
        checkButton.style.backgroundColor = '#C22B27';
        // checkButton.innerHTML = '<img src=assets/x.svg style="height: 30px; color: white;"></img>';
        correctAnswerContainer.classList.add('incorrect');

        document.body.style.backgroundColor = '#fdf7f6';
    }

    correctAnswer.innerText = translatedSentence;
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
    nextSentence = { original: sentence, translated };
}