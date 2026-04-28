// App.jsx
import React, { useState, useEffect } from 'react';
import MatterGame from './MatterGame';
import './App.css';

function App() {
  const [score, setScore] = useState(0);
  const [outs, setOuts] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const handleHit = (type) => {
    if (gameOver) return;

    if (type === 'HR') setScore((s) => s + 100);
    else if (type === '3B') setScore((s) => s + 30);
    else if (type === '2B') setScore((s) => s + 20);
    else if (type === '1B') setScore((s) => s + 10);
    else if (type === 'OUT') {
      setOuts((o) => {
        const newOuts = o + 1;
        if (newOuts >= 3) setGameOver(true);
        return newOuts;
      });
    }
  };

  // 🔄 [신규] 리트라이 함수: 점수와 아웃을 0으로 초기화
  const handleRetry = () => {
    setScore(0);
    setOuts(0);
    setGameOver(false);
  };

  useEffect(() => {
    const handleSecretKeys = (e) => {
      if (e.key === 'h' || e.key === 'H') setScore((s) => s + 100);
      if (e.key === 'r' || e.key === 'R') handleRetry();
      if (e.key === 'o' || e.key === 'O') setOuts((o) => Math.min(o + 1, 3));
    };

    window.addEventListener('keydown', handleSecretKeys);
    return () => window.removeEventListener('keydown', handleSecretKeys);
  }, []);

  return (
    <div className="game-container">
      <div className="scoreboard">
        <div className="score-area">
          <h1>SCORE: {score}</h1>
        </div>
        <div className="out-area">
          <h2>{gameOver ? "GAME OVER" : "O".repeat(outs)}</h2>
        </div>
      </div>

      <div className="canvas-wrapper">
        <img src="/pitcher.png" alt="투수" className="pitcher-img" />
        <img src="/batter.png" alt="타자" className="batter-img" />
        
        {/* onRetry 속성을 새로 전달합니다 */}
        <MatterGame onHit={handleHit} isGameOver={gameOver} onRetry={handleRetry} />
      </div>
    </div>
  );
}

export default App;