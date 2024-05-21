const words = [
    "cat", "dog", "bird", "fish", "elephant"
];

async function startWordGame(message, args) {
    if (args.length < 3) {
        message.channel.send("Please provide at least 3 letters.");
        return;
    }

    const letters = args.join("");
    const possibleWords = words.filter(word => {
        return letters.split("").every(letter => word.includes(letter));
    });

    if (possibleWords.length === 0) {
        message.channel.send("No valid words can be formed with those letters.");
    } else {
        message.channel.send(`You can form the following words: ${possibleWords.join(", ")}`);
    }
}

module.exports = { startWordGame };
