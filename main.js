const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const brain = require('brain.js');
const fs = require('fs');

const net = new brain.NeuralNetwork();
let mainWindow;

var keepTraining = true;

// Saves the past boards and the computers decisions for future trainings
const moves = [];

// Listen for app to be ready
app.on('ready', () => {
    // Create new window
    mainWindow = new BrowserWindow({
        title: "Tic-Tac-Toe Master",
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Prevents the user from changing the window size
    mainWindow.setResizable(false);
    
    //Load HTML into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file:',
        slashes: true
    })); 

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

    // Quit app when closed
    mainWindow.on('closed', () => app.quit());

    // Insert the menu onto the window
    Menu.setApplicationMenu(mainMenu);
});

checkBoard = unformated => {
    var board = [];
    unformated = unformated.map(cell => !cell ? 0 : cell === 'X' ? 1 : -1);

    while(unformated.length) 
        board.push(unformated.splice(0, 3));

    // Checks each row and column for victories
    for(var i = 2; i >= 0; i--) {
        var rowSum = 0,
            colSum = 0;

        for(var j = 2; j >= 0; j--) {
            rowSum += board[i][j];
            colSum += board[j][i];
        }

        if(rowSum === 3 || colSum === 3) {
            mainWindow.send('Winner', "CROSSES");
            return true;
        }
        else if(rowSum === -3 || colSum === -3) {
            mainWindow.send('Winner', "CIRCLES");
            return true;
        }
    }

    // Checks diagnols
    var points = board[0][0] + board[1][1] + board[2][2];
    if(points === 3) {
        mainWindow.send('Winner', "CROSSES");
        return true;
    }
    else if(points === -3) {
        mainWindow.send('Winner', "CIRCLES");
        return true;
    }
    
    points = board[2][0] + board[1][1] + board[0][2];
    if(points === 3) {
        mainWindow.send('Winner', "CROSSES");
        return true;
    }
    else if(points === -3) {
        mainWindow.send('Winner', "CIRCLES");
        return true;
    }

    return false;
}

// Checks the board to see if there's a winner
ipcMain.on('board:check', (e, unformated, auto) => {
    var aiBoard = [...unformated.map(cell => !cell ? 0.5 : cell === "X" ? 1 : 0)];

    // Check if the player won, if so inverse the moves for the future
    if(checkBoard(unformated)) {
        moves.map(move => {
            for(var i = 0; i < 8; i++) {
                // Checks against the input to ensure the moves the computer didn't make were impossible
                if(move.output[i]){
                    move.output[i] = 0;
                    continue;
                }

                if(move.input[i] === 0.5)
                    move.output[i] = 1;
            }
        });
        saveData();
        return;
    }

    // No winner - allow AI to determine the next move and save that decision incase of a win later
    var output = net.run(aiBoard);
    var result = null;
    
    for(var i = aiBoard.length - 1; i >= 0; i--) {
        if(aiBoard[i] !== 0.5)
            continue;
        
        if(!result || output[i] > output[result])
            result = i
    }

    // Update the board with the AIs turn and save the decision
    mainWindow.send('npcTurn', result);
    unformated[result] = "O";

    moves.push({input: aiBoard, output: output.map((o, i) => i === result ? 1 : 0)});

    // Check if the computer won, if so save these moves for the future
    if(checkBoard(unformated)) {
        saveData();
        return;
    }
});

// Saves the moves to the training data for future training
saveData = () => {
    var data = JSON.parse(fs.readFileSync('./train.json'));
    data.push(...moves);
    fs.writeFile("./train.json", JSON.stringify(data), err => {
        if(err)
            throw err;

        retrain();
    });
}

// This removes all the data from the train.js
clearData = () => {
    var freshData = [{
        "input": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "output": [0, 0, 0, 0, 0, 0, 0, 0, 0],
    }]
    fs.writeFile('./train.json', JSON.stringify(freshData), err => {
        if(err)
            throw err;

        console.log('I.... forgot...');
        retrain();
    });
}

// Retrains the network
retrain = () => {
    net.train(JSON.parse(fs.readFileSync('./train.json')));
}

// Trains the network with the past moves
retrain();

// Create menu template
const mainMenuTemplate = [
    {
        label: "File",
        submenu: [
            {
                label: 'Restart',
                click() {
                   mainWindow.send('Reset');
                }
            },
            {
                label: "Train each game",
                click() {
                    keepTraining = !keepTraining;
                }
            },
            {
                label: "Clear Data",
                click() {
                    clearData();
                }
            },
            {
                label: 'Quit',
                accelerator: process.platform == 'darwin' ? "Command+Q" : "Ctrl+Q",
                click() {
                    app.quit();
                }
            }
        ]
    }
];

// If mac, add empty object to menu
if(process.platform == 'darwin')
    mainMenuTemplate.unshift({});

// Add developer tools item if not in production
if(process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [
            {
                label: 'Toggle DevTools',
                accelerator: process.platform == 'darwin' ? "Command+I" : "Ctrl+I",
                click(item, focusWindow) {
                    focusWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    })
}