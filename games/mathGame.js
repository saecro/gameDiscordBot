const operations = ["+", "-", "*", "/"];

async function startMathGame(message) {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = operations[Math.floor(Math.random() * operations.length)];

    const question = `${num1} ${operation} ${num2}`;
    let answer;
    switch (operation) {
        case "+":
            answer = num1 + num2;
            break;
        case "-":
            answer = num1 - num2;
            break;
        case "*":
            answer = num1 * num2;
            break;
        case "/":
            answer = num1 / num2;
            break;
    }

    message.channel.send(`Solve: ${question}`);

    const filter = response => {
        return response.content == answer && response.author.id === message.author.id;
    };

    message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
        .then(collected => {
            message.channel.send(`${collected.first().author} got the correct answer!`);
        })
        .catch(collected => {
            message.channel.send(`Time's up! The correct answer was ${answer}`);
        });
}

module.exports = { startMathGame };
