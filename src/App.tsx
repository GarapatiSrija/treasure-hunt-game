
import React, { useState, useEffect, useCallback } from 'react';
import { Compass, Heart, Crown, Package, Skull, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trophy, X } from 'lucide-react';

type RoomType = 'empty' | 'relic' | 'trap' | 'final' | 'start';
type EventType = 'heal' | 'damage' | 'nothing' | 'hint';
type PuzzleType = 'riddle' | 'scramble' | 'quiz';

interface Room {
  type: RoomType;
  discovered: boolean;
  puzzleType?: PuzzleType;
  relicId?: number;
  event?: EventType;
}

interface Puzzle {
  type: PuzzleType;
  question: string;
  answer: string;
  options?: string[];
  hint?: string;
}

interface Reward {
  gold: number;
  experience: number;
  title: string;
}

interface GameState {
  playerPos: { x: number; y: number };
  health: number;
  maxHealth: number;
  relicsCollected: number;
  gold: number;
  experience: number;
  playerTitle: string;
  gameWon: boolean;
  gameOver: boolean;
  currentStory: string;
  showPuzzle: boolean;
  currentPuzzle: Puzzle | null;
  currentRelicId: number | null;
  showRewards: boolean;
  finalReward: Reward | null;
}

const GRID_SIZE = 5;
const MAX_HEALTH = 100;
const TRAP_DAMAGE = 20;

const puzzles: Record<number, Puzzle> = {
  1: {
    type: 'riddle',
    question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
    answer: "echo",
    hint: "Sound that bounces back..."
  },
  2: {
    type: 'scramble',
    question: "Unscramble this word: DARGNO",
    answer: "dragon",
    hint: "A mythical fire-breathing creature"
  },
  3: {
    type: 'quiz',
    question: "Which planet is known as the Red Planet?",
    answer: "mars",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    hint: "Named after the Roman god of war"
  }
};

const finalPuzzle: Puzzle = {
  type: 'quiz',
  question: "ULTIMATE CHALLENGE: In this treasure hunt, what was the total number of rooms you could explore?",
  answer: "25",
  options: ["20", "25", "30", "16"],
  hint: "Think about the grid size... 5 x 5 = ?"
};

const bonusPuzzle: Puzzle = {
  type: 'riddle',
  question: "BONUS RIDDLE: I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
  answer: "map",
  hint: "You've been using one throughout this adventure..."
};

const finalRewards: Reward = {
  gold: 1000,
  experience: 500,
  title: "Legendary Treasure Hunter"
};

const randomEvents = [
  { type: 'heal' as EventType, message: "You find a magical spring! Health restored by 20.", value: 20 },
  { type: 'damage' as EventType, message: "You trip over debris and hurt yourself. Lost 10 health.", value: 10 },
  { type: 'nothing' as EventType, message: "The room is eerily quiet. Nothing happens.", value: 0 },
  { type: 'hint' as EventType, message: "Ancient runes on the wall whisper secrets of nearby treasures.", value: 0 }
];

function App() {
  const [grid, setGrid] = useState<Room[][]>([]);
  const [gameState, setGameState] = useState<GameState>({
    playerPos: { x: 2, y: 2 },
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    relicsCollected: 0,
    gold: 0,
    experience: 0,
    playerTitle: "Novice Explorer",
    gameWon: false,
    gameOver: false,
    currentStory: "Welcome, brave adventurer! You stand in the center of an ancient dungeon. Three mystical relics await discovery, but danger lurks in every shadow. Use the directional controls to explore, but beware of traps that could end your quest. May fortune favor your journey!",
    showPuzzle: false,
    currentPuzzle: null,
    currentRelicId: null,
    showRewards: false,
    finalReward: null
  });
  const [playerAnswer, setPlayerAnswer] = useState('');

  const initializeGrid = useCallback(() => {
    const newGrid: Room[][] = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => ({ type: 'empty', discovered: false }))
    );

    // Set starting position
    newGrid[2][2] = { type: 'start', discovered: true };

    // Place relic chests
    const relicPositions = [
      { x: 0, y: 0, id: 1 },
      { x: 4, y: 0, id: 2 },
      { x: 0, y: 4, id: 3 }
    ];

    relicPositions.forEach(({ x, y, id }) => {
      const puzzleTypes: PuzzleType[] = ['riddle', 'scramble', 'quiz'];
      newGrid[y][x] = {
        type: 'relic',
        discovered: false,
        puzzleType: puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)],
        relicId: id
      };
    });

    // Place final treasure
    newGrid[4][4] = { type: 'final', discovered: false };

    // Place traps randomly
    const trapCount = 4;
    for (let i = 0; i < trapCount; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
      } while (newGrid[y][x].type !== 'empty');

      newGrid[y][x] = { type: 'trap', discovered: false };
    }

    // Add random events to some empty rooms
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (newGrid[y][x].type === 'empty' && Math.random() < 0.3) {
          const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
          newGrid[y][x].event = event.type;
        }
      }
    }

    setGrid(newGrid);
  }, []);

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  const movePlayer = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState.gameOver || gameState.gameWon || gameState.showPuzzle) return;

    setGameState(prev => {
      const { x, y } = prev.playerPos;
      let newX = x;
      let newY = y;

      switch (direction) {
        case 'up': newY = Math.max(0, y - 1); break;
        case 'down': newY = Math.min(GRID_SIZE - 1, y + 1); break;
        case 'left': newX = Math.max(0, x - 1); break;
        case 'right': newX = Math.min(GRID_SIZE - 1, x + 1); break;
      }

      if (newX === x && newY === y) return prev; // No movement

      return { ...prev, playerPos: { x: newX, y: newY } };
    });
  };

  const handleRoomEnter = useCallback(() => {
    const { x, y } = gameState.playerPos;
    const currentRoom = grid[y]?.[x];
    
    if (!currentRoom || currentRoom.discovered) return;

    // Mark room as discovered
    setGrid(prevGrid => {
      const newGrid = [...prevGrid];
      newGrid[y][x] = { ...newGrid[y][x], discovered: true };
      return newGrid;
    });

    setGameState(prev => {
      let newState = { ...prev };

      switch (currentRoom.type) {
        case 'relic':
          if (currentRoom.relicId && puzzles[currentRoom.relicId]) {
            newState.showPuzzle = true;
            newState.currentPuzzle = puzzles[currentRoom.relicId];
            newState.currentRelicId = currentRoom.relicId;
            newState.currentStory = `You've discovered a Relic Chest! Ancient magic emanates from within. Solve the puzzle to claim your reward.`;
          }
          break;

        case 'trap':
          const trapDamage = TRAP_DAMAGE + Math.floor(Math.random() * 10);
          newState.health = Math.max(0, newState.health - trapDamage);
          newState.currentStory = `💀 TRAP ACTIVATED! The room fills with poison gas. You lose ${trapDamage} health!`;
          
          if (newState.health <= 0) {
            newState.gameOver = true;
            newState.currentStory = "Your health has been depleted. The darkness claims you... Game Over!";
          }
          break;

        case 'final':
          if (newState.relicsCollected >= 3) {
            newState.showPuzzle = true;
            newState.currentPuzzle = finalPuzzle;
            newState.currentStory = `👑 THE FINAL TREASURE CHEST! The ultimate prize awaits those clever enough to solve the master puzzle.`;
          } else {
            newState.currentStory = `A magnificent treasure chest sits before you, but ancient magic keeps it sealed. You need all 3 relics to unlock it. (${newState.relicsCollected}/3 collected)`;
          }
          break;

        case 'empty':
          if (currentRoom.event) {
            const event = randomEvents.find(e => e.type === currentRoom.event);
            if (event) {
              newState.currentStory = event.message;
              if (event.type === 'heal') {
                newState.health = Math.min(newState.maxHealth, newState.health + event.value);
              } else if (event.type === 'damage') {
                newState.health = Math.max(0, newState.health - event.value);
                if (newState.health <= 0) {
                  newState.gameOver = true;
                  newState.currentStory = "Your health has been depleted. Game Over!";
                }
              }
            }
          } else {
            const emptyMessages = [
              "The room is empty, but you sense adventure nearby.",
              "Dust motes dance in the dim light. Nothing of interest here.",
              "Your footsteps echo in the hollow chamber.",
              "Ancient stone walls hold their secrets."
            ];
            newState.currentStory = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
          }
          break;
      }

      return newState;
    });
  }, [gameState.playerPos, grid]);

  useEffect(() => {
    handleRoomEnter();
  }, [handleRoomEnter]);

  const handlePuzzleAnswer = () => {
    if (!gameState.currentPuzzle) return;

    const isCorrect = playerAnswer.toLowerCase().trim() === gameState.currentPuzzle.answer.toLowerCase();

    if (isCorrect) {
      setGameState(prev => {
        if (prev.currentPuzzle === finalPuzzle) {
          // After solving final puzzle, show bonus puzzle
          return {
            ...prev,
            currentPuzzle: bonusPuzzle,
            currentStory: "🎯 EXCELLENT! One more challenge awaits. Solve this bonus riddle to claim the ultimate rewards!",
          };
        } else if (prev.currentPuzzle === bonusPuzzle) {
          // Final victory with rewards
          return {
            ...prev,
            gameWon: true,
            gold: prev.gold + finalRewards.gold,
            experience: prev.experience + finalRewards.experience,
            playerTitle: finalRewards.title,
            currentStory: "🎉 ULTIMATE VICTORY! You have conquered all challenges and earned the title of Legendary Treasure Hunter!",
            showPuzzle: false,
            currentPuzzle: null,
            showRewards: true,
            finalReward: finalRewards
          };
        } else {
          // Regular relic puzzle solved
          const newRelicsCollected = prev.relicsCollected + 1;
          const goldReward = 100 + (prev.currentRelicId || 0) * 50;
          const expReward = 50 + (prev.currentRelicId || 0) * 25;
          return {
            ...prev,
            relicsCollected: newRelicsCollected,
            gold: prev.gold + goldReward,
            experience: prev.experience + expReward,
            health: Math.min(prev.maxHealth, prev.health + 15), // Reward health
            currentStory: `✨ Puzzle solved! You've claimed a mystical relic! Gained ${goldReward} gold, ${expReward} XP, and restored health. (${newRelicsCollected}/3 relics collected)`,
            showPuzzle: false,
            currentPuzzle: null,
            currentRelicId: null
          };
        }
      });
    } else {
      // Wrong answer - lose health or game over
      setGameState(prev => ({
        ...prev,
        health: Math.max(0, prev.health - 10),
        currentStory: prev.health > 10 
          ? "❌ Incorrect answer! The ancient magic punishes failure. Lost 10 health. Try again?"
          : "❌ Incorrect answer! Your final mistake... Game Over!",
        gameOver: prev.health <= 10,
        showPuzzle: prev.health <= 10 ? false : prev.showPuzzle,
        currentPuzzle: prev.health <= 10 ? null : prev.currentPuzzle
      }));
    }

    setPlayerAnswer('');
  };

  const resetGame = () => {
    setGameState({
      playerPos: { x: 2, y: 2 },
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      relicsCollected: 0,
      gold: 0,
      experience: 0,
      playerTitle: "Novice Explorer",
      gameWon: false,
      gameOver: false,
      currentStory: "Welcome back, brave adventurer! A new dungeon awaits your exploration.",
      showPuzzle: false,
      currentPuzzle: null,
      currentRelicId: null,
      showRewards: false,
      finalReward: null
    });
    setPlayerAnswer('');
    initializeGrid();
  };

  const getRoomIcon = (room: Room, x: number, y: number) => {
    if (gameState.playerPos.x === x && gameState.playerPos.y === y) {
      return <Compass className="w-6 h-6 text-yellow-400 animate-spin" />;
    }

    if (!room.discovered) return null;

    switch (room.type) {
      case 'relic':
        const isCollected = room.relicId && room.relicId <= gameState.relicsCollected;
        return <Package className={`w-5 h-5 ${isCollected ? 'text-green-400' : 'text-purple-400'}`} />;
      case 'trap':
        return <Skull className="w-5 h-5 text-red-500" />;
      case 'final':
        return <Crown className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getRoomClass = (room: Room, x: number, y: number) => {
    const isCurrentPos = gameState.playerPos.x === x && gameState.playerPos.y === y;
    const baseClasses = "w-16 h-16 border-2 border-gray-600 flex items-center justify-center transition-all duration-300 hover:border-purple-400";

    if (isCurrentPos) {
      return `${baseClasses} bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300 shadow-lg shadow-yellow-400/50 scale-110`;
    }

    if (!room.discovered) {
      return `${baseClasses} bg-gray-800 cursor-pointer`;
    }

    switch (room.type) {
      case 'relic':
        const isCollected = room.relicId && room.relicId <= gameState.relicsCollected;
        return `${baseClasses} ${isCollected ? 'bg-green-700' : 'bg-purple-700'} shadow-lg`;
      case 'trap':
        return `${baseClasses} bg-red-700 shadow-lg shadow-red-500/30`;
      case 'final':
        return `${baseClasses} bg-gradient-to-br from-yellow-600 to-amber-600 shadow-lg shadow-yellow-500/30`;
      case 'start':
        return `${baseClasses} bg-blue-700 shadow-lg shadow-blue-500/30`;
      default:
        return `${baseClasses} bg-gray-700`;
    }
  };

  const getHealthColor = () => {
    const percentage = (gameState.health / gameState.maxHealth) * 100;
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-400 mb-2">
            Treasure Hunt Adventure
          </h1>
          <div className="flex items-center justify-center gap-4 text-white flex-wrap">
            <div className="text-sm text-purple-300">
              {gameState.playerTitle}
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span>{gameState.health}/{gameState.maxHealth}</span>
              <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getHealthColor()}`}
                  style={{ width: `${(gameState.health / gameState.maxHealth) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>Relics: {gameState.relicsCollected}/3</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-400">
              <span>💰 {gameState.gold}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <span>⭐ {gameState.experience} XP</span>
            </div>
          </div>
        </div>

        {/* Story Text */}
        <div className="mb-8">
          <div className="bg-gray-700 rounded-lg p-4 min-h-20 flex items-center justify-center">
            <p className="text-center text-gray-100 leading-relaxed animate-fadeIn">
              {gameState.currentStory}
            </p>
          </div>
        </div>

        {/* Game Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          <div className="grid grid-cols-5 gap-2 bg-gray-900 p-4 rounded-lg">
            {grid.map((row, y) =>
              row.map((room, x) => (
                <div
                  key={`${x}-${y}`}
                  className={getRoomClass(room, x, y)}
                >
                  {getRoomIcon(room, x, y)}
                </div>
              ))
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-center mb-4">
              <h3 className="text-xl font-semibold mb-2">Controls</h3>
              <p className="text-sm text-gray-300">Navigate the dungeon</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div></div>
              <button
                onClick={() => movePlayer('up')}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={gameState.gameOver || gameState.gameWon || gameState.showPuzzle}
              >
                <ArrowUp className="w-6 h-6 text-white" />
              </button>
              <div></div>

              <button
                onClick={() => movePlayer('left')}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={gameState.gameOver || gameState.gameWon || gameState.showPuzzle}
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div></div>
              <button
                onClick={() => movePlayer('right')}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={gameState.gameOver || gameState.gameWon || gameState.showPuzzle}
              >
                <ArrowRight className="w-6 h-6 text-white" />
              </button>

              <div></div>
              <button
                onClick={() => movePlayer('down')}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={gameState.gameOver || gameState.gameWon || gameState.showPuzzle}
              >
                <ArrowDown className="w-6 h-6 text-white" />
              </button>
              <div></div>
            </div>

            {(gameState.gameOver || gameState.gameWon) && (
              <button
                onClick={resetGame}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg"
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Puzzle Modal */}
      {gameState.showPuzzle && gameState.currentPuzzle && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl border border-purple-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400">
                {gameState.currentPuzzle === finalPuzzle ? '👑 Final Challenge' : 
                 gameState.currentPuzzle === bonusPuzzle ? '🎯 Bonus Challenge' : '🧩 Puzzle Challenge'}
              </h2>
              <button
                onClick={() => setGameState(prev => ({ ...prev, showPuzzle: false, currentPuzzle: null }))}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-white mb-4 leading-relaxed">{gameState.currentPuzzle.question}</p>
              
              {gameState.currentPuzzle.type === 'quiz' && gameState.currentPuzzle.options && (
                <div className="space-y-2 mb-4">
                  {gameState.currentPuzzle.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setPlayerAnswer(option.toLowerCase())}
                      className={`w-full p-2 rounded-lg text-left transition-colors ${
                        playerAnswer === option.toLowerCase()
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {gameState.currentPuzzle.type !== 'quiz' && (
                <input
                  type="text"
                  value={playerAnswer}
                  onChange={(e) => setPlayerAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePuzzleAnswer()}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none"
                  placeholder="Your answer..."
                  autoFocus
                />
              )}

              {gameState.currentPuzzle.hint && (
                <p className="text-sm text-gray-400 mt-2 italic">💡 Hint: {gameState.currentPuzzle.hint}</p>
              )}
            </div>

            <button
              onClick={handlePuzzleAnswer}
              disabled={!playerAnswer.trim()}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-200"
            >
              Submit Answer
            </button>
          </div>
        </div>
      )}

      {/* Rewards Modal */}
      {gameState.showRewards && gameState.finalReward && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-yellow-800 to-purple-800 rounded-xl p-8 max-w-md w-full shadow-2xl border-2 border-yellow-400">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">🏆 VICTORY REWARDS! 🏆</h2>
              
              <div className="bg-black bg-opacity-30 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">You have earned:</h3>
                <div className="space-y-3 text-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-300">💰 Gold:</span>
                    <span className="text-yellow-400 font-bold">+{gameState.finalReward.gold}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-300">⭐ Experience:</span>
                    <span className="text-blue-400 font-bold">+{gameState.finalReward.experience}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300">🎖️ Title:</span>
                    <span className="text-purple-400 font-bold">{gameState.finalReward.title}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setGameState(prev => ({ ...prev, showRewards: false }))}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg"
              >
                Continue Adventure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;