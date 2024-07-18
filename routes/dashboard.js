const express = require('express');
const router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

router.use(ensureAuthenticated);

function hasAdminPermission(permissions) {
    const ADMINISTRATOR = 0x8;
    return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
}

router.get('/', async (req, res) => {
    const user = req.user;
    const db = req.app.locals.db;

    // Fetch the guilds the bot is in
    const botGuilds = await db.collection('botGuilds').find().toArray();
    console.log('Bot Guilds:', botGuilds);

    // Log user guilds
    console.log('User Guilds:', user.guilds);

    // Filter user guilds based on bot guilds and admin status
    const userGuilds = user.guilds.filter(guild => {
        const botGuild = botGuilds.find(botGuild => botGuild.id === guild.id);
        console.log(`Checking guild: ${guild.name} (ID: ${guild.id})`);
        console.log(`Is in bot guilds: ${!!botGuild}`);
        console.log(`Is admin: ${hasAdminPermission(parseInt(guild.permissions_new))}`);
        return botGuild && hasAdminPermission(parseInt(guild.permissions_new));
    }).map(guild => {
        const botGuild = botGuilds.find(botGuild => botGuild.id === guild.id);
        return {
            id: guild.id,
            name: guild.name,
            icon: botGuild ? botGuild.icon : null,
            banner: botGuild ? botGuild.banner : null
        };
    });

    console.log('Filtered User Guilds:', userGuilds);

    res.render('dashboard', { user, userGuilds });
});

module.exports = router;
