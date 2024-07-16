const sentenceConstructArea = document.getElementById('construct-sentence');
const wordBankArea = document.getElementById('word-bank');
const words = document.querySelectorAll('.word');
const checkButton = document.getElementById('check');

function updateCheckButtonState() {
    checkButton.disabled = sentenceConstructArea.children.length === 0;
}

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