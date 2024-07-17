import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let sentences = [];
let shuffledSentences = [];
let currentSentenceIndex = 0;
let currentSentence = '';
let translatedSentence = '';

const sentenceConstructArea = document.getElementById('construct-sentence');
const wordBankArea = document.getElementById('word-bank');
const checkButton = document.getElementById('check');
const sentenceDisplay = document.getElementById('sentence');

checkButton.addEventListener('click', checkAnswer);

startGame();

async function fetchSentences() {
    try {
        const response = await fetch('api/hebrew-sentences.json');
        const sentences = await response.json();
        console.log(sentences); // You now have access to the array
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

    currentSentence = shuffledSentences[currentSentenceIndex].trim();
    translatedSentence = await translateSentence(currentSentence);

    sentenceDisplay.innerText = currentSentence;
    populateWordBank(translatedSentence);
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

    console.log(userSentence);
    if (userSentence === translatedSentence) {
        checkButton.innerHTML = '<img src=tick.svg style="height: 30px; color: white;"></img>';

        document.body.style.backgroundColor = '#eafbea';
    } else {
        checkButton.style.backgroundColor = '#C22B27';
        checkButton.innerHTML = '<img src=x.svg style="height: 30px; color: white;"></img>';

        document.body.style.backgroundColor = '#fbeae9';
    }

    checkButton.removeEventListener('click', checkAnswer);
    checkButton.addEventListener('click', nextQuestion);
}

function nextQuestion() {
    sentenceDisplay.innerHTML = '';
    clearWords();

    // Reset button styles and content
    checkButton.innerHTML = 'בדיקה';
    checkButton.style.backgroundColor = 'var(--primary)';
    document.body.style.backgroundColor = 'var(--background)';

    if (currentSentenceIndex >= shuffledSentences.length) {
        // If we've gone through all words, reshuffle and start over
        shuffledSentences = shuffleArray([...sentences]);
        currentWordIndex = 0;
    }

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