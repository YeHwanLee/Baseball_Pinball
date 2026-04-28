// App.jsx
import React, { useState, useEffect } from 'react';
import MatterGame from './MatterGame';
import './App.css';

import pitcherImg from './assets/pitcher.png';
import batterImg from './assets/batter.png';

const UI_CONFIG = {
  pitcher: { top: '40%', left: '50%', width: '60px' },
  batter: { bottom: '8%', left: '35%', width: '80px' },
};

function App() {
  const [score, setScore] = useState(0);
  const [outs, setOuts] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameState, setGameState] = useState('READY');
  const [message, setMessage] = useState('');

  const handleHit = (type) => {
    if (gameState !== 'PLAYING') return;

    if (['HR', '3B', '2B', '1B'].includes(type)) {
      if (type === 'HR') {
        setScore((s) => s + 100);
        setMessage('홈런!!');
      } else if (type === '3B') {
        setScore((s) => s + 30);
        setMessage('3루타!');
      } else if (type === '2B') {
        setScore((s) => s + 20);
        setMessage('2루타!');
      } else if (type === '1B') {
        setScore((s) => s + 10);
        setMessage('안타!');
      }
      setStrikes(0);
    } else if (type === 'FOUL') {
      if (strikes < 2) {
        setStrikes((s) => s + 1);
        setMessage('파울! (스트라이크)');
      } else {
        setMessage('파울! (투스트라이크 유지)');
      }
    } else if (type === 'STRIKE') {
      const nextStrikes = strikes + 1;
      if (nextStrikes >= 3) {
        setMessage('삼진 아웃!');
        setStrikes(0);
        processOut();
      } else {
        setMessage('스트라이크!');
        setStrikes(nextStrikes);
      }
    } else if (type === 'OUT') {
      setMessage('플라이 아웃!');
      processOut();
    }
  };

  const processOut = () => {
    setOuts((o) => {
      const newOuts = o + 1;
      if (newOuts >= 3) setGameState('GAMEOVER');
      return newOuts;
    });
    setStrikes(0);
  };

  const handleStartOrRetry = () => {
    setScore(0);
    setOuts(0);
    setStrikes(0);
    setMessage('플레이!');
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleStartInput = (e) => {
      if (e.key === 'Enter' || e.type === 'touchstart') {
        if (gameState !== 'PLAYING') handleStartOrRetry();
      }
    };
    window.addEventListener('keydown', handleStartInput);
    window.addEventListener('touchstart', handleStartInput);
    return () => {
      window.removeEventListener('keydown', handleStartInput);
      window.removeEventListener('touchstart', handleStartInput);
    };
  }, [gameState]);

  return (
    <div className="game-wrapper">
      {/* 💡 [핵심 해결] 게임판에 종속되지 않는 무적의 전체 화면 오버레이! */}
      {gameState === 'READY' && (
        <div className="fullscreen-overlay">
          <h2 className="overlay-text">엔터를 눌러서 시작하세요</h2>
        </div>
      )}
      {gameState === 'GAMEOVER' && (
        <div className="fullscreen-overlay">
          <h2 className="overlay-text">
            게임 오버!
            <br />
            엔터로 재시작
          </h2>
        </div>
      )}

      <div className="scoreboard-panel">
        <div className="score-info">
          <h1>SCORE: {score}</h1>
          <p className="game-msg">{message}</p>
        </div>
        <div className="counts">
          {gameState === 'GAMEOVER' ? (
            <h2 className="game-over-text">GAME OVER</h2>
          ) : (
            <div className="led-counts">
              <div className="count-row">
                <span className="count-label">S:</span>
                <span className="count-icons">{'🟡'.repeat(strikes)}</span>
              </div>
              <div className="count-row">
                <span className="count-label">O:</span>
                <span className="count-icons">{'🔴'.repeat(outs)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="canvas-panel">
        <div className="infield-dirt"></div>
        <img
          src={pitcherImg}
          alt="투수"
          className="pitcher-img"
          style={UI_CONFIG.pitcher}
        />
        <img
          src={batterImg}
          alt="타자"
          className="batter-img"
          style={UI_CONFIG.batter}
        />

        <MatterGame onHit={handleHit} gameState={gameState} />
      </div>
    </div>
  );
}

export default App;
