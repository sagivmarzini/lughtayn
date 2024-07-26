const gameButtons = document.querySelectorAll('.game-btn');
const popover = document.getElementById('game-info');
const popoverOverlay = document.getElementById('overlay');
const popoverTitle = document.getElementById('game-title');
const popoverDescription = popover.querySelector('p');
const popoverButton = popover.querySelector('button');

const gameContent = {
    sentences: {
        title: "בניית משפטים",
        description: "המשחק נותן בכל פעם משפט בעברית, ועליך לבנות את התרגום באמצעות המילים הניתנות",
    },
    listening: {
        title: "האזנה וכתיבה",
        description: "האזן למשפטים בערבית וכתוב את מה שאתה שומע בערבית, או את התרגום בעברית",
    }
};

gameButtons.forEach(button => {
    button.addEventListener('click', event => showPopover(event.target));
});

popoverOverlay.addEventListener('click', hidePopover);

function showPopover(button) {
    const gameType = button.dataset.gameType;
    updatePopoverContent(gameType);

    const buttonY = getElementYPosition(button);
    const popoverPosition = buttonY + button.offsetHeight + window.scrollY - 20;

    popoverOverlay.style.display = 'block';

    popover.style.top = popoverPosition + 'px';
    popover.style.transform = 'translateX(-50%) scale(1)';
    popover.style.opacity = '1';
}

function updatePopoverContent(gameType) {
    const content = gameContent[gameType];
    popoverTitle.textContent = content.title;
    popoverDescription.textContent = content.description;
}

function getElementYPosition(element) {
    const rect = element.getBoundingClientRect();
    return rect.top;
}

function hidePopover() {
    popover.style.transform = 'translateX(-50%) scale(0)';
    popoverOverlay.style.display = 'none';
}