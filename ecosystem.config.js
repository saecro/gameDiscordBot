module.exports = {
    apps: [
        {
            name: 'discord-bot',
            script: 'index.js',
            watch: true,
            ignore_watch: [
                "notes.json",
                '.git',
                'node_modules'
            ],
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
