import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

const client = await Client.connect("guymorlan/levanti_he_ar");
// const client = await Client.connect("https://levantitranslate.com/");

const ANSWER_COMPARE_PERCENT = 85;

let sentences = [];
let shuffledSentences = [];
let currentSentenceIndex = 0;
let currentSentence = {
    hebrew: '',
    arabic: '',
    diacritized: '',
    taatik: '',
    audio: new Audio()
};
let nextSentence = null;
let score = 0;
let levelupScore = 5;
let level = 1;

const progressBar = document.getElementById('progress');
const playAudioButton = document.getElementById('play-audio');
const playAudioIcon = document.getElementById('play-audio-icon');
const audioLoadingElement = document.getElementById('audio-loading');
const textarea = document.getElementById('write-sentence');
const checkButton = document.getElementById('check');
const correctAnswerContainer = document.getElementById('correct-answer-container')
const correctAnswerHeader = document.getElementById('correct-answer-header');
const correctAnswerElement = document.getElementById('correct-answer');
const correctAnswerTaatikElement = document.getElementById('correct-answer-taatik');
const answerTranslationElement = document.getElementById('answer-translation');

startGame();

textarea.addEventListener('input', updateCheckButtonState);
textarea.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        checkButton.click();
    }
});
playAudioButton.addEventListener('click', () => currentSentence.audio.play());
checkButton.addEventListener('click', checkAnswer);

async function startGame() {
    textarea.value = '';
    toggleInputDisabled();

    if (sentences.length === 0) {
        sentences = await fetchSentences();
        shuffledSentences = shuffleArray([...sentences]);
    }
    
    if (nextSentence) {
        currentSentence = nextSentence;
        nextSentence = null;
    } else {
        currentSentence.hebrew = shuffledSentences[currentSentenceIndex].trim();
        currentSentence.arabic = await translateSentence(currentSentence.hebrew);
        currentSentence.diacritized = await diacritizeSentence(currentSentence.arabic);
        currentSentence.taatik = await generateTaatik(currentSentence.diacritized);
        currentSentence.audio.src = await generateSentenceAudio(currentSentence.diacritized);
    }
    toggleInputDisabled();

    currentSentence.audio.play();
    
    preloadNextSentence();
}

function updateCheckButtonState() {
    checkButton.disabled = textarea.value.trim() === '';
}

function toggleInputDisabled(onoff) {
    textarea.disabled = !textarea.disabled;
    playAudioIcon.hidden = !playAudioIcon.hidden;
    audioLoadingElement.hidden = !audioLoadingElement.hidden;
}

function checkAnswer() {
    let userAnswer = textarea.value.trim().replace('?', '');
    let correctAnswer = currentSentence.arabic.replace('?', '');

    if (userAnswer === correctAnswer ||
        userAnswer === currentSentence.hebrew.trim().replace('?', '')
    ) {
        correctAnswerContainer.classList.add('correct');
        correctAnswerHeader.hidden = true;
        correctAnswerElement.hidden = true;
        correctAnswerTaatikElement.hidden = true;
    
        document.body.style.backgroundColor = '#f6fef6';

        score++;
    } else if (similarity(userAnswer, correctAnswer) >= ANSWER_COMPARE_PERCENT ||
                similarity(userAnswer, currentSentence.hebrew) >= ANSWER_COMPARE_PERCENT) {
        correctAnswerContainer.classList.add('correct');
        correctAnswerHeader.hidden = false;
        correctAnswerElement.hidden = false;
        correctAnswerTaatikElement.hidden = true;
    
        document.body.style.backgroundColor = '#f6fef6';

        score++;
    } else {
        checkButton.style.backgroundColor = '#C22B27';
        correctAnswerContainer.classList.add('incorrect');
        correctAnswerHeader.hidden = false;
        correctAnswerElement.hidden = false;
        correctAnswerTaatikElement.hidden = false;

        document.body.style.backgroundColor = '#fdf7f6';

        if (score > 0) score--; // Prevent negative score
    }
    
    updateProgressBar();

    correctAnswerElement.textContent = correctAnswer;
    correctAnswerTaatikElement.textContent = currentSentence.taatik;
    answerTranslationElement.textContent = currentSentence.hebrew;
    correctAnswerContainer.classList.add('show');

    checkButton.innerText = 'המשך'
    checkButton.removeEventListener('click', checkAnswer);
    checkButton.addEventListener('click', nextQuestion);
}

function nextQuestion() {
    textarea.value = '';
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

async function preloadNextSentence() {
    const nextIndex = (currentSentenceIndex + 1) % shuffledSentences.length;
    const sentence = shuffledSentences[nextIndex].trim();
    const translated = await translateSentence(sentence);
    const diacritized = await diacritizeSentence(translated);
    const taatik = await generateTaatik(diacritized);
    const audioUrl = await generateSentenceAudio(diacritized);
    nextSentence = { hebrew: sentence, arabic: translated, diacritizedArabic: diacritized, taatik, audio: new Audio(audioUrl) };
}

function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = [];

    // Create the matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[len1][len2];
}

function similarity(s1, s2) {
    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return (1 - distance / maxLen) * 100;
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
        return await response.json();
    } catch (error) {
        console.error('Error fetching Hebrew sentences:', error);
        return [];
    }
}

async function translateSentence(sentence) {
    const result = await client.predict("/run_translate", { 		
        // text: sentence[0],
        text: 'P',
        input_text: sentence,
        hidden_arabic: "",
        dialect: "P",
    });

    return result.data[1];
}

async function diacritizeSentence(arabicSentence) {
    const result = await client.predict("/diacritize", { 		
        // text: arabicSentence[0],
        text: 'P',
        input_text: arabicSentence,
        hidden_arabic: "",
    });

    return result.data[0];
}

async function generateSentenceAudio(sentence) {
    const result = await client.predict("/get_audio", { 		
        // text: sentence[0], 
        text: 'P', 
        input_text: sentence,
        hidden_arabic: ''
    });

    return result.data[0].url;
}

async function generateTaatik(diacritizedSentence) {
    const result = await client.predict("/taatik", { 		
        // text: diacritizedSentence[0], 
        text: 'P', 
        input_text: diacritizedSentence,
        hidden_arabic: ''
    });

    return result.data[0];
}