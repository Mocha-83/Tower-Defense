// script.js
console.log("Script loaded!"); // Debugging: Check if script is running

const grid = document.getElementById("grid");
const moneyDisplay = document.getElementById("money");
const livesDisplay = document.getElementById("lives");
const waveDisplay = document.getElementById("wave");
const startWaveButton = document.getElementById("startWave");
const mapDifficultySelect = document.getElementById("mapDifficulty");

console.log("Elements:", { grid, moneyDisplay, livesDisplay, waveDisplay, startWaveButton, mapDifficultySelect }); // Debugging: Check if elements are found

let money = 100;
let lives = 10;
let wave = 1;
let towers = [];
let monsters = [];
let waveInProgress = false;
let currentMap = "easy";

// Define maps (based on Bloons TD 1)
const maps = {
    easy: [90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 19, 29, 39, 49, 59, 69, 79, 89, 99], // Easy map path
    medium: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 89, 79, 69, 59, 49, 39, 29, 19, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90], // Medium map path
    hard: {
        path1: [90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 19, 29, 39, 49, 59, 69, 79, 89, 99], // Hard map path 1
        path2: [99, 98, 97, 96, 95, 94, 93, 92, 91, 81, 71, 61, 51, 41, 31, 21, 11, 1, 2, 3, 4, 5, 6, 7, 8, 9, 19, 29, 39, 49, 59, 69, 79, 89, 99] // Hard map path 2
    }
};

// Create the game grid
function createGrid() {
    console.log("Creating grid..."); // Debugging: Check if grid is being created
    grid.innerHTML = "";
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement("div");
        cell.addEventListener("click", () => placeTower(cell));
        if (currentMap === "hard") {
            if (maps.hard.path1.includes(i) || maps.hard.path2.includes(i)) {
                cell.classList.add("path");
            }
        } else if (maps[currentMap].includes(i)) {
            cell.classList.add("path");
        }
        grid.appendChild(cell);
    }
}

// Function to place a tower
function placeTower(cell) {
    if (money >= 50 && !cell.classList.contains("tower") && !cell.classList.contains("path")) {
        cell.classList.add("tower");
        const rangeIndicator = document.createElement("div");
        rangeIndicator.classList.add("range");
        cell.appendChild(rangeIndicator);
        towers.push({ cell, level: 1, damage: 10, range: 1 });
        money -= 50;
        updateUI();
    }
}

// Function to upgrade a tower
document.getElementById("upgradeTower").addEventListener("click", () => {
    if (money >= 30 && towers.length > 0) {
        const tower = towers[0]; // Upgrade the first tower (for simplicity)
        tower.level++;
        tower.damage += 10;
        tower.range += 1; // Increase range
        money -= 30;
        updateTowerRange(tower);
        updateUI();
    }
});

// Function to update tower range visualization
function updateTowerRange(tower) {
    const rangeIndicator = tower.cell.querySelector(".range");
    if (rangeIndicator) {
        rangeIndicator.style.width = `${tower.range * 100}%`;
        rangeIndicator.style.height = `${tower.range * 100}%`;
        rangeIndicator.style.transform = `translate(-${(tower.range - 1) * 50}%, -${(tower.range - 1) * 50}%)`;
    }
}

// Function to spawn monsters
function spawnMonsters() {
    console.log("Spawning monsters..."); // Debugging: Check if monsters are spawning
    const layers = wave; // Each wave adds one layer to monsters
    if (currentMap === "hard") {
        // Spawn monsters on both paths for hard mode
        for (let i = 0; i < 5; i++) {
            const monster1 = { layers, position: 0, cell: null, path: maps.hard.path1 };
            const monster2 = { layers, position: 0, cell: null, path: maps.hard.path2 };
            monsters.push(monster1, monster2);
            moveMonster(monster1);
            moveMonster(monster2);
        }
    } else {
        // Spawn monsters on a single path for easy/medium mode
        for (let i = 0; i < 5; i++) {
            const monster = { layers, position: 0, cell: null, path: maps[currentMap] };
            monsters.push(monster);
            moveMonster(monster);
        }
    }
}

// Function to move monsters
function moveMonster(monster) {
    const interval = setInterval(() => {
        if (monster.position >= monster.path.length - 1) {
            clearInterval(interval);
            lives -= monster.layers;
            if (lives <= 0) {
                alert("Game Over!");
                resetGame();
            }
            updateUI();
        } else {
            // Remove monster from current cell
            if (monster.cell) {
                monster.cell.classList.remove("monster");
            }

            // Move monster to next position
            monster.position++;
            const cellIndex = monster.path[monster.position];
            const cell = grid.children[cellIndex];
            cell.classList.add("monster");
            monster.cell = cell;

            // Check if monster is defeated
            if (Math.random() < 0.1) { // 10% chance to lose a layer
                monster.layers--;
                if (monster.layers <= 0) {
                    clearInterval(interval);
                    monsters = monsters.filter(m => m !== monster);
                    money += monster.layers + 1; // Earn money for each layer
                    updateUI();
                }
            }
        }
    }, 500); // Move every 500ms
}

// Function to start a wave
startWaveButton.addEventListener("click", () => {
    console.log("Start wave button clicked!"); // Debugging: Check if button click is registered
    if (!waveInProgress) {
        waveInProgress = true;
        spawnMonsters();
        wave++;
        updateUI();
    }
});

// Function to check if all monsters are defeated
function checkWaveCompletion() {
    if (monsters.length === 0 && waveInProgress) {
        waveInProgress = false;
        money += 20 + wave * 5; // Progressive coin reward after defeating a wave
        updateUI();
    }
}

// Function to update the UI
function updateUI() {
    moneyDisplay.textContent = money;
    livesDisplay.textContent = lives;
    waveDisplay.textContent = wave;
    checkWaveCompletion();
}

// Function to reset the game
function resetGame() {
    money = 100;
    lives = 10;
    wave = 1;
    towers = [];
    monsters = [];
    waveInProgress = false;
    updateUI();
    createGrid();
}

// Change map difficulty
mapDifficultySelect.addEventListener("change", (e) => {
    currentMap = e.target.value;
    resetGame();
});

// Initialize the game
createGrid();
updateUI();