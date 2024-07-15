module.exports = {
    apps: [
        {
            name: 'discord-bot',
            script: 'index.js',
            watch: true,
            max_restarts: 5,
            restart_delay: 5000,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};
