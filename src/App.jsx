// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import MatterGame from './MatterGame';
import './App.css';

import pitcherImg from './assets/pitcher.png';
import batterImg from './assets/batter.png';

const UI_CONFIG = {
  pitcher: { top: '38%', left: '50%', width: '20%' },
  batter: { bottom: '0%', left: '32%', width: '20%' },
};

export const PROCON_CONFIG = {
  actionButtons: [0, 1, 7],
};

function App() {
  const [score, setScore] = useState(0);
  const [outs, setOuts] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameState, setGameState] = useState('IDLE');
  const [message, setMessage] = useState('');

  const [canProceed, setCanProceed] = useState(true);
  const [effectType, setEffectType] = useState('NONE');

  const wasGamepadPressed = useRef(false);

  const triggerDelay = (nextState, currentEffect = 'NONE') => {
    setEffectType(currentEffect);
    setGameState(nextState);
    setCanProceed(false);
    setTimeout(() => {
      setCanProceed(true);
    }, 2500);
  };

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
      triggerDelay('TURN_RESULT', 'HIT');
    } else if (type === 'FOUL') {
      if (strikes < 2) {
        setStrikes((s) => s + 1);
        setMessage('파울! (스트라이크)');
      } else {
        setMessage('파울! (투스트라이크 유지)');
      }
      // 💡 [수정] 파울일 때 노란색 배경(STRIKE)을 띄웁니다!
      triggerDelay('TURN_RESULT', 'STRIKE');
    } else if (type === 'STRIKE') {
      const nextStrikes = strikes + 1;
      if (nextStrikes >= 3) {
        setMessage('삼진 아웃!');
        setStrikes(0);
        processOut(); // 삼진 아웃은 processOut을 타면서 OUT(빨간색)이 됩니다.
      } else {
        setMessage('스트라이크!');
        setStrikes(nextStrikes);
        // 💡 [수정] 1~2 스트라이크일 때 노란색 배경(STRIKE)을 띄웁니다!
        triggerDelay('TURN_RESULT', 'STRIKE');
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
        triggerDelay('GAMEOVER', 'OUT');
      } else {
        triggerDelay('TURN_RESULT', 'OUT');
      }
      return newOuts;
    });
    setStrikes(0);
  };

  const handleStartOrRetry = () => {
    if (!canProceed) return;
    setScore(0);
    setOuts(0);
    setStrikes(0);
    setMessage('플레이!');
    setEffectType('NONE');
    setGameState('PLAYING');
  };

  const handleContinueTurn = () => {
    if (!canProceed) return;
    setMessage('플레이!');
    setEffectType('NONE');
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleStartInput = (e) => {
      if (e.key === 'Enter' || e.type === 'touchstart') {
        if (e.key === 'Enter') e.preventDefault();

        if (gameState === 'IDLE') {
          setGameState('READY');
          setCanProceed(false);
          setTimeout(() => setCanProceed(true), 800);
        } else if (
          (gameState === 'READY' || gameState === 'GAMEOVER') &&
          canProceed
        ) {
          handleStartOrRetry();
        } else if (gameState === 'TURN_RESULT' && canProceed) {
          handleContinueTurn();
        }
      }
    };

    window.addEventListener('keydown', handleStartInput, { passive: false });
    window.addEventListener('touchstart', handleStartInput, { passive: false });

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

      if (isPressedNow && !wasGamepadPressed.current) {
        if (gameState === 'IDLE') {
          setGameState('READY');
          setCanProceed(false);
          setTimeout(() => setCanProceed(true), 800);
        } else if (
          (gameState === 'READY' || gameState === 'GAMEOVER') &&
          canProceed
        ) {
          handleStartOrRetry();
        } else if (gameState === 'TURN_RESULT' && canProceed) {
          handleContinueTurn();
        }
      }
      wasGamepadPressed.current = isPressedNow;

      animationFrameId = requestAnimationFrame(pollGamepad);
    };
    pollGamepad();

    return () => {
      window.removeEventListener('keydown', handleStartInput);
      window.removeEventListener('touchstart', handleStartInput);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, canProceed]);

  return (
    <div className="game-wrapper">
      {gameState === 'IDLE' && (
        <div
          className="fullscreen-overlay"
          style={{ backgroundColor: 'transparent', backdropFilter: 'none' }}
        >
          <span
            className="blink-prompt"
            style={{
              position: 'absolute',
              bottom: '15%',
              fontSize: '1.5rem',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            화면을 터치하거나 버튼을 눌러주세요
          </span>
        </div>
      )}

      {gameState === 'READY' && (
        <div className="fullscreen-overlay result-overlay">
          <h2 className="overlay-text">
            게임을 시작합니다!
            <br />
            <span
              style={{
                fontSize: '1.8rem',
                display: 'block',
                marginTop: '15px',
                color: '#ecf0f1',
                textShadow: 'none',
              }}
            >
              공이 날아올 때 타이밍에 맞춰 스윙하세요!
            </span>
            {canProceed ? (
              <span className="blink-prompt">엔터(버튼)를 눌러주세요</span>
            ) : (
              <span className="blink-prompt waiting">...</span>
            )}
          </h2>
        </div>
      )}

      {gameState === 'TURN_RESULT' && (
        <div
          className={`fullscreen-overlay result-overlay ${effectType.toLowerCase()}`}
        >
          <h2 className="overlay-text">
            {message}
            <br />
            {canProceed ? (
              <span className="blink-prompt">
                엔터(버튼)를 눌러 다음 타석에 들어서세요
              </span>
            ) : (
              <span className="blink-prompt waiting">...</span>
            )}
          </h2>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="fullscreen-overlay gameover-overlay">
          <h2 className="overlay-text">
            {canProceed ? (
              <>
                GAME OVER
                <br />
                <span className="blink-prompt">버튼을 눌러 재시작</span>
              </>
            ) : (
              <>GAME OVER</>
            )}
          </h2>
        </div>
      )}

      <div className="scoreboard-panel">
        <div className="score-info">
          <h1>
            SCORE: <span className="score-number">{score}</span>
          </h1>
          <p className="game-msg">{message}</p>
        </div>

        <div className="counts">
          {gameState === 'GAMEOVER' ? (
            <h2 className="game-over-text">GAME OVER</h2>
          ) : (
            <div className="led-counts">
              <div className="count-row">
                <span className="count-label">S</span>
                <span className="count-icons">
                  {[0, 1].map((i) => (
                    <div
                      key={`strike-${i}`}
                      className={`led-dot strike ${i < strikes ? 'on' : ''}`}
                    ></div>
                  ))}
                </span>
              </div>
              <div className="count-row">
                <span className="count-label">O</span>
                <span className="count-icons">
                  {[0, 1].map((i) => (
                    <div
                      key={`out-${i}`}
                      className={`led-dot out ${i < outs ? 'on' : ''}`}
                    ></div>
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="legend-box desktop-only">
          <h3>TARGET GUIDE</h3>
          <ul className="legend-list">
            <li>
              <span className="legend-color-ring ring-hr"></span> 홈런 (HR)
            </li>
            <li>
              <span className="legend-color-ring ring-3b"></span> 3루타 (3B)
            </li>
            <li>
              <span className="legend-color-ring ring-2b"></span> 2루타 (2B)
            </li>
            <li>
              <span className="legend-color-ring ring-1b"></span> 1루타 (1B)
            </li>
            <li>
              <span className="legend-color-ring ring-out"></span> 수비수 (OUT)
            </li>
            <li>
              <span className="legend-color-ring ring-foul"></span> 파울 (FOUL)
            </li>
          </ul>
        </div>
      </div>

      <div className="canvas-panel">
        <div className="field-container">
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
    </div>
  );
}

export default App;
