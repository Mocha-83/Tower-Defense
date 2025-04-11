// Game state variables
let money = 200;
let lives = 20;
let wave = 0;
let waveInProgress = false;
let gameSpeed = 1;
let towers = [];
let monsters = [];
let currentMap = "simple";
let balloonIntervals = [];
let selectedTower = null;
let selectedCell = null;
let selectedIndex = null;
let projectiles = [];
const PROJECTILE_BASE_SPEED = 10;

// Tower configuration constants
const BASE_DAMAGE = 5;
const BASE_RANGE = 100;
const UPGRADE_COSTS = {
    2: 30, 3: 75, 4: 150, 5: 300, 6: 500, 7: 800, 8: 1500, 9: 3000
};
const POWER_MULTIPLIERS = {
    1: 1, 2: 1.5, 3: 2.5, 4: 4, 5: 6, 6: 9, 7: 13, 8: 25, 9: 40
};
const METAL_NAMES = {
    1: "Iron", 2: "Bronze", 3: "Sapphire", 4: "Silver",
    5: "Gold", 6: "Diamond", 7: "Platinum", 8: "Obsidian", 9: "Blood Ruby"
};

// Map path definitions
const paths = {
    simple: [0,1,2,3,4,5,6,7,8,9,19,29,39,49,59,69,79,89,99],
    intricate: [0,10,20,21,22,12,13,23,33,34,35,25,15,16,17,27,37,47,57,67,77,87,97],
    extraIntricate: [0,1,2,12,22,32,33,34,24,14,4,5,6,16,26,36,46,56,66,76,77,78,68,58,48,49,59,69,79,89,99]
};

// DOM element references
const grid = document.getElementById('grid');
const moneyDisplay = document.getElementById('money');
const livesDisplay = document.getElementById('lives');
const waveDisplay = document.getElementById('wave');
const startWaveBtn = document.getElementById('startWave');
const tower1Btn = document.getElementById('tower1');
const upgradeTowerBtn = document.getElementById('upgradeTower');
const mapDifficulty = document.getElementById('mapDifficulty');
const gameSpeedSelect = document.getElementById('gameSpeed');

// Initialize game on load
createGrid();
gameLoop();

// Event listeners for game controls
startWaveBtn.addEventListener('click', spawnMonsters);
tower1Btn.addEventListener('click', buyBasicTower);
upgradeTowerBtn.addEventListener('click', upgradeSelectedTower);
mapDifficulty.addEventListener('change', (e) => {
    currentMap = e.target.value;
    createGrid();
});
gameSpeedSelect.addEventListener('change', (e) => {
    gameSpeed = e.target.value === 'medium' ? 1 : e.target.value === 'fast' ? 1.5 : 2;
});

// Creates the 10x10 game grid with path visualization
function createGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');

        if (paths[currentMap].includes(i)) {
            cell.classList.add('path');
            if (i === paths[currentMap][0]) cell.classList.add('path-start');
            if (i === paths[currentMap][paths[currentMap].length - 1]) cell.classList.add('path-end');
        }

        cell.addEventListener('click', () => {
            selectedCell = cell;
            selectedIndex = i;
            document.querySelectorAll('#grid div').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            selectedTower = towers.find(t => t.position === i);
            updateTowerStats(selectedTower);
        });

        grid.appendChild(cell);
    }
    // Update existing towers' visual representation
    towers.forEach(tower => {
        grid.children[tower.position].classList.add('tower');
        grid.children[tower.position].setAttribute('data-level', tower.level);
    });
}

// Spawns waves of balloon monsters
// Spawns waves of balloon monsters with moderated difficulty scaling
function spawnMonsters() {
    if (waveInProgress) return;
    wave++;
    waveInProgress = true;
    updateUI();

    // Moderated exponential health: 10 * (1.3 ^ (wave-1))
    // Wave 1: 10, Wave 2: 13, Wave 3: 17, Wave 4: 22, Wave 5: 28, Wave 10: 113
    const baseHealth = Math.floor(10 * Math.pow(1.3, wave - 1));
    // Toned-down monster count: wave^1.3 + wave * 2
    // Wave 1: 3, Wave 5: 26, Wave 10: 95, Wave 15: 197
    const count = Math.floor(Math.pow(wave, 1.3) + wave * 2);
    // Slightly relaxed spawn delay: starts at 1200ms, min 400ms
    const spawnDelay = Math.max(400, 1200 - wave * 50);

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const balloon = {
                path: [...paths[currentMap]],
                position: 0,
                layers: baseHealth, // Moderated health scaling
                regenerating: wave >= 7, // Regeneration starts at wave 7
                cell: null,
                interval: null
            };

            balloon.cell = grid.children[balloon.path[0]];
            balloon.cell.classList.add("balloon");
            balloon.cell.style.opacity = '0';
            setTimeout(() => balloon.cell.style.opacity = '1', 10);

            monsters.push(balloon);

            balloon.interval = setInterval(() => {
                // Moderated regeneration: 3% chance, +1 health per tick, cap at 50
                if (balloon.regenerating && Math.random() < 0.03) {
                    balloon.layers = Math.min(balloon.layers + 1, 50);
                }

                balloon.cell.style.transition = 'opacity 0.3s ease';
                balloon.cell.style.opacity = '0';

                setTimeout(() => {
                    balloon.cell.classList.remove("balloon");

                    if (balloon.position >= balloon.path.length - 1) {
                        clearInterval(balloon.interval);
                        lives -= balloon.layers;
                        monsters = monsters.filter(m => m !== balloon);
                        updateUI();

                        if (lives <= 0) {
                            alert("Game Over!");
                            resetGame();
                        }

                        if (monsters.length === 0) {
                            waveInProgress = false;
                            money += 20 + wave * 5; // Unchanged rewards for now
                            updateUI();
                        }
                        return;
                    }

                    balloon.position++;
                    balloon.cell = grid.children[balloon.path[balloon.position]];
                    balloon.cell.classList.add("balloon");
                    balloon.cell.style.opacity = '0';
                    setTimeout(() => balloon.cell.style.opacity = '1', 10);
                }, 250); // Slightly slower movement (was 200ms)

            }, 350 / gameSpeed); // Slightly slower base speed (was 300ms)

            balloonIntervals.push(balloon.interval);
        }, i * spawnDelay / gameSpeed);
    }
}

// Main game loop handling tower attacks and projectiles
function gameLoop() {
    towers.forEach(tower => {
        if (!tower.cooldown) tower.cooldown = 0; // Initialize cooldown if undefined
        tower.cooldown--;

        if (tower.cooldown <= 0) {
            tower.target = monsters.find(monster => {
                const monsterPos = monster.path[monster.position];
                const towerX = tower.position % 10;
                const towerY = Math.floor(tower.position / 10);
                const monsterX = monsterPos % 10;
                const monsterY = Math.floor(monsterPos / 10);
                const distance = Math.sqrt(
                    Math.pow(monsterX - towerX, 2) +
                    Math.pow(monsterY - towerY, 2)
                );
                return distance * 50 <= tower.range;
            });

            if (tower.target) {
                createProjectile(tower);
                tower.cooldown = tower.attackSpeed / gameSpeed;
            }
        }
    });

    if (waveInProgress && monsters.length === 0) {
        waveInProgress = false;
    }

    updateProjectiles();
    requestAnimationFrame(gameLoop);
}

// Creates a projectile from tower to target
function createProjectile(tower) {
    const projectile = document.createElement('div');
    projectile.className = 'projectile';
    projectile.setAttribute('data-tier', tower.level);
    projectile.style.left = `${(tower.position % 10) * 50 + 25}px`;
    projectile.style.top = `${Math.floor(tower.position / 10) * 50 + 25}px`;
    document.getElementById('game').appendChild(projectile);
    
    const speedMultiplier = 1 + (tower.level * 0.3);
    
    projectiles.push({
        element: projectile,
        x: (tower.position % 10) * 50 + 25,
        y: Math.floor(tower.position / 10) * 50 + 25,
        target: tower.target,
        damage: tower.damage,
        speed: PROJECTILE_BASE_SPEED * speedMultiplier,
        splash: tower.splashDamage || false,
        lifeSteal: tower.lifeSteal || 0
    });
}

// Handles purchasing basic towers
function buyBasicTower() {
    if (money < 50 || !selectedCell || selectedCell.classList.contains('path') || 
        towers.some(t => t.position === selectedIndex)) {
        return;
    }

    money -= 50;
    const tower = {
        position: selectedIndex,
        level: 1,
        damage: BASE_DAMAGE,
        range: BASE_RANGE,
        attackSpeed: 60, // Frames between attacks
        cooldown: 0
    };
    towers.push(tower);
    selectedCell.classList.add('tower');
    selectedCell.setAttribute('data-level', '1');
    updateUI();
    selectedTower = tower;
    updateTowerStats(tower);
}

// Upgrades selected tower if possible
function upgradeSelectedTower() {
    if (!selectedTower || selectedTower.level >= 9) return;
    
    const nextLevel = selectedTower.level + 1;
    if (money < UPGRADE_COSTS[nextLevel]) return;
    
    money -= UPGRADE_COSTS[nextLevel];
    selectedTower.level = nextLevel;
    selectedTower.damage = BASE_DAMAGE * POWER_MULTIPLIERS[nextLevel];
    selectedTower.range = BASE_RANGE * (1 + nextLevel * 0.1);
    selectedCell.setAttribute('data-level', nextLevel);
    updateUI();
    updateTowerStats(selectedTower);
}

// Updates projectile positions and handles collisions
function updateProjectiles() {
    projectiles.forEach((proj, index) => {
        if (!proj.target || !proj.target.cell) {
            proj.element.remove();
            projectiles.splice(index, 1);
            return;
        }
        
        const targetPos = proj.target.path[proj.target.position];
        const targetX = (targetPos % 10) * 50 + 25;
        const targetY = Math.floor(targetPos / 10) * 50 + 25;
        const dx = targetX - proj.x;
        const dy = targetY - proj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < proj.speed) {
            proj.target.layers -= proj.damage;
            if (proj.lifeSteal > 0) lives += Math.floor(proj.damage * proj.lifeSteal);
            
            proj.target.cell.classList.add('balloon-hit');
            setTimeout(() => proj.target.cell?.classList.remove('balloon-hit'), 300);
            
            if (proj.splash) {
                monsters.forEach(m => {
                    if (m !== proj.target) {
                        const mPos = m.path[m.position];
                        const mX = (mPos % 10) * 50 + 25;
                        const mY = Math.floor(mPos / 10) * 50 + 25;
                        const splashDist = Math.sqrt(
                            Math.pow(mX - targetX, 2) + 
                            Math.pow(mY - targetY, 2)
                        );
                        if (splashDist < 75) {
                            m.layers -= proj.damage * 0.5;
                            m.cell.classList.add('balloon-hit');
                            setTimeout(() => m.cell.classList.remove('balloon-hit'), 300);
                        }
                    }
                });
            }
            
            proj.element.remove();
            projectiles.splice(index, 1);
            
            if (proj.target.layers <= 0) {
                const balloon = proj.target;
                clearInterval(balloon.interval);
                if (balloon.cell) {
                    balloon.cell.classList.remove("balloon");
                    balloon.cell.classList.remove('balloon-hit');
                }
                monsters = monsters.filter(m => m !== balloon);
                money += 10;
                updateUI();
                
                if (monsters.length === 0 && !waveInProgress) {
                    money += 30 + wave * 10;
                    updateUI();
                }
            }
        } else {
            proj.x += (dx / distance) * proj.speed;
            proj.y += (dy / distance) * proj.speed;
            proj.element.style.left = `${proj.x}px`;
            proj.element.style.top = `${proj.y}px`;
        }
    });
}

// Updates UI elements
function updateUI() {
    moneyDisplay.textContent = money;
    livesDisplay.textContent = lives;
    waveDisplay.textContent = wave;
}

// Updates tower stats display
function updateTowerStats(tower) {
    const levelDisplay = document.getElementById('towerLevel');
    const metalDisplay = document.getElementById('towerMetal');
    const damageDisplay = document.getElementById('towerDamage');
    const rangeDisplay = document.getElementById('towerRange');
    
    if (!tower) {
        levelDisplay.textContent = metalDisplay.textContent = '-';
        damageDisplay.textContent = rangeDisplay.textContent = '-';
        return;
    }
    
    levelDisplay.textContent = tower.level;
    metalDisplay.textContent = METAL_NAMES[tower.level];
    damageDisplay.textContent = tower.damage;
    rangeDisplay.textContent = tower.range;
}

// Resets game to initial state
function resetGame() {
    money = 200;
    lives = 20;
    wave = 0;
    towers = [];
    monsters = [];
    waveInProgress = false;
    balloonIntervals.forEach(clearInterval);
    balloonIntervals = [];
    projectiles.forEach(p => p.element.remove());
    projectiles = [];
    selectedTower = null;
    selectedCell = null;
    selectedIndex = null;
    updateUI();
    createGrid();
}