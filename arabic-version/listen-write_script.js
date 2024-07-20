import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";
const client = await Client.connect("guymorlan/levanti_he_ar");

let sentences = [];
let shuffledSentences = [];
let currentSentenceIndex = 0;
let currentSentence = '';
let arabicSentence = '';
let diacritizedArabic = '';
let nextSentence = null;
let sentenceAudio = new Audio();
let score = 0;
let levelupScore = 5;
let level = 1;

const playAudioButton = document.getElementById('play-audio');
const textarea = document.getElementById('write-sentence');
const checkButton = document.getElementById('check');

window.addEventListener('DOMContentLoaded', event => {
    startGame();
});

textarea.addEventListener('input', updateCheckButtonState);

playAudioButton.addEventListener('click', event => sentenceAudio.play());

async function startGame() {
    if (sentences.length === 0) {
        sentences = await fetchSentences();
        shuffledSentences = shuffleArray([...sentences]);
    }
    
    if (nextSentence) {
        currentSentence = nextSentence.original;
        arabicSentence = nextSentence.translated;
        diacritizedArabic = nextSentence.diacritized;
        sentenceAudio.src = nextSentence.audio;
        nextSentence = null;
    } else {
        currentSentence = shuffledSentences[currentSentenceIndex].trim();
        arabicSentence = await translateSentence(currentSentence);
        diacritizedArabic = await diacritizeSentence(arabicSentence);
        sentenceAudio.src = await generateSentenceAudio(diacritizedArabic);
    }

    console.log(sentenceAudio)
    sentenceAudio.play();
    
    preloadNextSentence();
}

function updateCheckButtonState() {
    if (textarea.value.trim() !== '') {
        checkButton.disabled = false;
      } else {
        checkButton.disabled = true;
      }
}

async function preloadNextSentence() {
    const nextIndex = (currentSentenceIndex + 1) % shuffledSentences.length;
    const sentence = shuffledSentences[nextIndex].trim();
    const translated = await translateSentence(sentence);
    const diacritized = await diacritizeSentence(translated);
    const audioUrl = await generateSentenceAudio(diacritized);
    nextSentence = { original: sentence, translated, diacritized, audio: audioUrl };
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function fetchSentences() {
    try {
        const response = await fetch('../api/hebrew-sentences.json');
        const sentences = await response.json();

        return sentences;
      } catch (error) {
        console.error('Error fetching Hebrew sentences:', error);
      }
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

