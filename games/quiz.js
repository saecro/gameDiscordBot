let currentQuestion = null;
let currentTimeout = null;
const trivia = require('trivia-api');

trivia.getQuestions()
    .then(questions => {
        console.log(questions);
    });

const questions = [
    { question: "What is the capital of France?", answer: "paris" },
    { question: "Who wrote 'To Kill a Mockingbird'?", answer: "harper lee" },
    { question: "What is the largest planet in our solar system?", answer: "jupiter" }
];

async function startQuiz(message) {
    if (currentQuestion) {
        message.channel.send("A quiz is already in progress!");
        return;
    }

    const question = questions[Math.floor(Math.random() * questions.length)];
    currentQuestion = question;

    message.channel.send(`Quiz Time! ${question.question}`);

    currentTimeout = setTimeout(() => {
        message.channel.send(`Time's up! The correct answer was ${question.answer}`);
        currentQuestion = null;
    }, 30000);
}

async function checkAnswer(message) {
    if (!currentQuestion) return;

    if (message.content.toLowerCase() === currentQuestion.answer) {
        clearTimeout(currentTimeout);
        message.channel.send(`Correct! The answer is ${currentQuestion.answer}`);
        currentQuestion = null;
    }
}

module.exports = { startQuiz, checkAnswer };
