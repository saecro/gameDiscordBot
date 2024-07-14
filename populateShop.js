const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongo = new MongoClient(process.env.MONGO_URI);
const database = mongo.db('discordGameBot');
const shopItemsCollection = database.collection('shopItems');

async function addShopItems() {
    
    await shopItemsCollection.deleteMany({});

    
    const items = [
        
        { name: 'Crystal Sabre', description: 'A powerful sword made of shimmering crystals.', price: 500, emoji: '💎' },
        { name: 'Mystic Apple', description: 'Gives you powerful buffs.', price: 1000, emoji: '🍏' },
        { name: 'Glider Wings', description: 'Wings that let you glide through the air.', price: 2000, emoji: '🕊️' },
        { name: 'Obsidian Pickaxe', description: 'An unbreakable pickaxe.', price: 750, emoji: '⛏️' },
        { name: 'Titan Cleaver', description: 'A massive sword for great damage.', price: 1200, emoji: '⚔️' },
        { name: 'Mega Hammer', description: 'A hammer that mines large areas.', price: 1000, emoji: '🔨' },
    
        
        { name: 'Eternal Blade', description: 'A legendary sword forged from mystical metals.', price: 1500, emoji: '🗡️' },
        { name: 'Moon Amulet', description: 'Grants immense power during the night.', price: 1200, emoji: '🌜' },
        { name: 'Dragon Wings', description: 'Allows you to fly for a short period.', price: 1800, emoji: '🐉' },
        { name: 'Vampire Daggers', description: 'Daggers that steal health from enemies.', price: 1300, emoji: '🗡️' },
        { name: 'Starlight Armor', description: 'Armor made from the strongest material.', price: 2000, emoji: '🛡️' },
    
        
        { name: 'Endless Bag', description: 'A magical bag with unlimited storage.', price: 500, emoji: '👜' },
        { name: 'Shadow Cloak', description: 'Grants invisibility in darkness.', price: 700, emoji: '🕶️' },
        { name: 'Phoenix Feather', description: 'A feather that can revive the dead.', price: 1500, emoji: '🪶' },
        { name: 'Dragon Scale Shield', description: 'An indestructible shield.', price: 1200, emoji: '🛡️' },
        { name: 'Wizard Staff', description: 'A staff that enhances magical abilities.', price: 1300, emoji: '✨' },
        { name: 'Healing Potion', description: 'Restores a large amount of health.', price: 300, emoji: '🧪' },
    
        
        { name: 'Excalibur Replica', description: 'A replica of the legendary sword.', price: 1000, emoji: '⚔️' },
        { name: 'Gorgon Shield', description: 'A shield that can turn enemies to stone.', price: 1400, emoji: '🛡️' },
        { name: 'Thor’s Hammer', description: 'A hammer that controls thunder.', price: 2000, emoji: '🔨' },
        { name: 'Pegasus Boots', description: 'Boots that grant the wearer the ability to fly.', price: 1700, emoji: '👢' },
        { name: 'Hermes Sandals', description: 'Sandals that grant super speed.', price: 900, emoji: '👡' },
        { name: 'Medusa’s Gaze', description: 'An artifact that can petrify foes.', price: 1500, emoji: '🪞' },
    
        
        { name: 'Rubber Chicken', description: 'Why did the chicken cross the road?', price: 75, emoji: '🐔' },
        { name: 'Magic Wand', description: 'A stick of wonder.', price: 200, emoji: '✨' },
        { name: 'Invisibility Cloak', description: 'Now you see me, now you don\'t!', price: 500, emoji: '🧥' },
        { name: 'Fart Bomb', description: 'Clear the room.', price: 20, emoji: '💨' },
        { name: 'Banana Peel', description: 'Watch your step!', price: 10, emoji: '🍌' },
        { name: 'Unicorn Horn', description: 'Majestic and magical.', price: 300, emoji: '🦄' },
        { name: 'Fake Moustache', description: 'For that distinguished look.', price: 30, emoji: '👨' },
        { name: 'Whoopee Cushion', description: 'Classic prank.', price: 25, emoji: '🎈' },
        { name: 'Nerf Blaster', description: 'Soft projectiles, hard fun.', price: 100, emoji: '🔫' },
        { name: 'Glitter Bomb', description: 'Sparkly mess.', price: 60, emoji: '🎉' },
        { name: 'Joy Buzzer', description: 'Shocking!', price: 40, emoji: '🔋' },
        { name: 'Sneezing Powder', description: 'Achoo!', price: 35, emoji: '😷' },
        { name: 'Gag Glasses', description: 'Funny eyewear.', price: 50, emoji: '👓' },
        { name: 'Fake Spider', description: 'Scary!', price: 15, emoji: '🕷️' },
        { name: 'Prank Call App', description: 'Ring ring!', price: 75, emoji: '📞' },
        { name: 'Tiny Violin', description: 'Play a sad tune.', price: 50, emoji: '🎻' },
        { name: 'Laughter Potion', description: 'Giggles guaranteed.', price: 80, emoji: '😂' },
        { name: 'Silly Hat', description: 'Wear it with pride.', price: 45, emoji: '🎩' },
        { name: 'Stink Bomb', description: 'Pew!', price: 55, emoji: '💣' },
        { name: 'Fake Dog Poop', description: 'Eww!', price: 20, emoji: '💩' },
        { name: 'Invisible Ink', description: 'Secret messages.', price: 65, emoji: '🖋️' },
        { name: 'Trick Gum', description: 'Surprise!', price: 10, emoji: '🍬' },
        { name: 'Hand Buzzer', description: 'Shocking handshake.', price: 35, emoji: '🤝' },
        { name: 'Fake Vomit', description: 'Gross!', price: 25, emoji: '🤮' },
        { name: 'Sneeze Spray', description: 'Achoo again!', price: 30, emoji: '🤧' },
        { name: 'Giant Underpants', description: 'Comically large.', price: 90, emoji: '🩲' },
        { name: 'Pie to the Face', description: 'Classic prank.', price: 50, emoji: '🥧' },
        { name: 'Lucky Coin', description: 'Increase your luck.', price: 100, emoji: '🍀' },
        { name: 'Strength Amulet', description: 'Increase your strength.', price: 500, emoji: '💪' },
        { name: 'Ring of Invisibility', description: 'Become invisible.', price: 1200, emoji: '💍' },
        { name: 'Flying Carpet', description: 'Fly through the skies.', price: 1500, emoji: '🕌' },
    ];    

    
    await shopItemsCollection.insertMany(items);
    console.log('Shop items added.');
    process.exit();
}

addShopItems();