// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import MatterGame from './MatterGame';
import './App.css';

import pitcherImg from './assets/pitcher.png';
import batterImg from './assets/batter.png';

const UI_CONFIG = {
  pitcher: { top: '40%', left: '50%', width: '60px' },
  batter: { bottom: '8%', left: '35%', width: '80px' },
};

// 🎮 [프로콘 설정창] 집에 가셔서 이 숫자들만 바꾸면서 테스트하시면 됩니다!
export const PROCON_CONFIG = {
  // 웹 브라우저에서 프로콘을 연결했을 때 일반적인 버튼 번호 (OS마다 다를 수 있음)
  // 0: B 버튼 (오른쪽 패드 아래)
  // 1: A 버튼 (오른쪽 패드 오른쪽)
  // 2: Y 버튼 (오른쪽 패드 왼쪽)
  // 3: X 버튼 (오른쪽 패드 위)
  // 6: ZL (왼쪽 뒤 트리거)
  // 7: ZR (오른쪽 뒤 트리거)

  // 배열 안에 원하는 버튼 번호를 다 적어두면, 그 중 하나만 눌러도 작동합니다.
  actionButtons: [0, 1, 7], // 기본값: B, A, ZR
};

function App() {
  const [score, setScore] = useState(0);
  const [outs, setOuts] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameState, setGameState] = useState('READY');
  const [message, setMessage] = useState('');
  const [canRestart, setCanRestart] = useState(true);

  // 패드 버튼이 계속 눌려있을 때 연타로 인식되는 것을 막기 위한 변수
  const wasGamepadPressed = useRef(false);

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
      if (newOuts >= 3) {
        setGameState('GAMEOVER');
        setCanRestart(false);
        setTimeout(() => {
          setCanRestart(true);
        }, 2500);
      }
      return newOuts;
    });
    setStrikes(0);
  };

  const handleStartOrRetry = () => {
    if (!canRestart) return;
    setScore(0);
    setOuts(0);
    setStrikes(0);
    setMessage('플레이!');
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleStartInput = (e) => {
      if (e.key === 'Enter' || e.type === 'touchstart') {
        if (gameState !== 'PLAYING' && canRestart) handleStartOrRetry();
      }
    };

    window.addEventListener('keydown', handleStartInput);
    window.addEventListener('touchstart', handleStartInput);

    // 💡 [추가] 프로콘 버튼 감지 루프 (게임 시작용)
    let animationFrameId;
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let isPressedNow = false;

      for (let gp of gamepads) {
        if (gp) {
          for (let btnIndex of PROCON_CONFIG.actionButtons) {
            if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
              isPressedNow = true;
              break;
            }
          }
        }
      }

      // 방금 막 눌렀을 때만(Edge Detection) 실행하여 무한 재시작 방지
      if (isPressedNow && !wasGamepadPressed.current) {
        if (gameState !== 'PLAYING' && canRestart) handleStartOrRetry();
      }
      wasGamepadPressed.current = isPressedNow;

      animationFrameId = requestAnimationFrame(pollGamepad);
    };
    pollGamepad(); // 루프 시작

    return () => {
      window.removeEventListener('keydown', handleStartInput);
      window.removeEventListener('touchstart', handleStartInput);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, canRestart]);

  return (
    <div className="game-wrapper">
      {gameState === 'READY' && (
        <div className="fullscreen-overlay">
          <h2 className="overlay-text">엔터로 시작</h2>
        </div>
      )}
      {gameState === 'GAMEOVER' && (
        <div className="fullscreen-overlay">
          <h2 className="overlay-text">
            {canRestart ? (
              <>
                게임 오버!
                <br />
                엔터를 눌러 재시작
              </>
            ) : (
              <>게임 오버!</>
            )}
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
