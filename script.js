document.addEventListener('DOMContentLoaded', () => {
    const daySelect = document.getElementById('daySelect');
    const questionText = document.getElementById('questionText');
    const answerText = document.getElementById('answerText');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const cardContent = document.getElementById('cardContent');

    let currentDayData = [];
    let currentIndex = 0;

    /**
     * Loads the quiz data for a selected day.
     * @param {string} day - The key for the day (e.g., "Day001 : ...")
     */
    function loadDay(day) {
        currentDayData = quizData[day] || [];
        currentIndex = 0;
        updateCard();
    }

    /**
     * Updates the card UI with the current question and answer.
     * Handles visibility reset and button states.
     */
    function updateCard() {
        // Reset state
        answerText.classList.remove('visible');
        cardContent.classList.remove('fade-in');
        void cardContent.offsetWidth; // Trigger reflow
        cardContent.classList.add('fade-in');

        if (currentDayData.length === 0) {
            questionText.textContent = "No questions for this day.";
            answerText.textContent = "";
            showAnswerBtn.style.display = 'none';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        const currentItem = currentDayData[currentIndex];
        questionText.textContent = currentItem.q;
        answerText.textContent = currentItem.a;
        showAnswerBtn.style.display = 'block';
        showAnswerBtn.textContent = 'Show Answer';

        // Update navigation buttons
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === currentDayData.length - 1;
    }

    // Event Listeners
    daySelect.addEventListener('change', (e) => {
        loadDay(e.target.value);
    });

    showAnswerBtn.addEventListener('click', () => {
        answerText.classList.add('visible');
        showAnswerBtn.style.display = 'none';
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCard();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < currentDayData.length - 1) {
            currentIndex++;
            updateCard();
        }
    });

    // Initial load
    if (daySelect.options.length > 0) {
        loadDay(daySelect.value);
    }
});
