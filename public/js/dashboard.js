const socket = io();

socket.on('botGuildsUpdated', (change) => {
    console.log('Received update:', change);
    // Handle the update: You can refresh the list of servers or perform any other UI updates
    location.reload(); // Simple approach: reload the page to fetch the latest data
});
