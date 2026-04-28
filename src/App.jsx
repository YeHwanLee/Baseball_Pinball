// App.jsx
import React, { useState, useEffect } from 'react';
import MatterGame from './MatterGame';
import './App.css';

function App() {
  const [score, setScore] = useState(0);
  const [outs, setOuts] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameState, setGameState] = useState('READY');
  const [message, setMessage] = useState('');

  // 💡 상태 업데이트를 밖으로 빼서 독립적으로 처리합니다.
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
      setStrikes(0); // 안타 시 스트라이크 초기화
    } else if (type === 'FOUL') {
      // 💡 파울 규칙: 2스트라이크 전까지만 카운트 증가
      if (strikes < 2) {
        setStrikes((s) => s + 1);
        setMessage('파울! (스트라이크)');
      } else {
        setMessage('파울! (투스트라이크 유지)');
      }
    } else if (type === 'STRIKE') {
      // 💡 삼진 아웃 로직: 먼저 판단 후 상태 변경
      const nextStrikes = strikes + 1;
      if (nextStrikes >= 3) {
        setMessage('삼진 아웃!');
        setStrikes(0);
        processOut(); // 아웃 카운트 증가 함수 호출
      } else {
        setMessage('스트라이크!');
        setStrikes(nextStrikes);
      }
    } else if (type === 'OUT') {
      setMessage('플라이 아웃!');
      processOut();
    }
  };

  // 아웃 카운트 증가 및 게임 오버 판단만 담당하는 함수
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
    <div className="game-container">
      <div className="scoreboard">
        <div className="score-area">
          <h1>SCORE: {score}</h1>
          <p className="game-msg">{message}</p>
        </div>
        <div className="out-area">
          {gameState === 'GAMEOVER' ? (
            <h2>GAME OVER</h2>
          ) : (
            <>
              <h2 style={{ color: '#f1c40f' }}>S: {'🟡'.repeat(strikes)}</h2>
              <h2 style={{ color: '#e74c3c' }}>O: {'🔴'.repeat(outs)}</h2>
            </>
          )}
        </div>
      </div>

      <div className="canvas-wrapper">
        {gameState === 'READY' && (
          <div className="overlay-message">
            <h2>엔터를 누르면 시작합니다</h2>
          </div>
        )}
        {gameState === 'GAMEOVER' && (
          <div className="overlay-message">
            <h2>
              게임 오버!
              <br />
              엔터로 재시작
            </h2>
          </div>
        )}
        <MatterGame onHit={handleHit} gameState={gameState} />
      </div>
    </div>
  );
}

export default App;
