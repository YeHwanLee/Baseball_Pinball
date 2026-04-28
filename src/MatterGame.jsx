// MatterGame.jsx
import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const CONFIG = {
  pitcher: { x: 300, y: 350 },
  hrZone: { x: 300, y: 100, radius: 40 },
  tripleZones: [
    { x: 120, y: 180, radius: 25 },
    { x: 480, y: 180, radius: 25 },
  ],
  doubleZones: [
    { x: 70, y: 350, radius: 20 },
    { x: 530, y: 350, radius: 20 },
  ],
  singleZones: [
    { x: 60, y: 550, radius: 20 },
    { x: 540, y: 550, radius: 20 },
  ],
  flyOutZones: [
    { x: 220, y: 250, radius: 25 },
    { x: 380, y: 250, radius: 25 },
  ],
  rails: [
    { x: 100, y: 750, width: 250, angle: 35 },
    { x: 500, y: 750, width: 250, angle: -35 },
  ],

  bat: {
    pivot: { x: 250, y: 720 },
    angleUp: -35, // 스윙 최대 각도 (음수가 반시계, 즉 위로 올라감)
    angleDown: 15, // 대기 각도 (양수가 시계, 즉 아래로 처짐)
    speed: 0.25, // 스윙 속도
  },
};

const MatterGame = ({ onHit, isGameOver, onRetry }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const isSwinging = useRef(false);

  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

    const engine = Engine.create();
    engineRef.current = engine;

    // 벽 뚫기 방지 세팅
    engine.positionIterations = 10;
    engine.velocityIterations = 10;
    engine.gravity.y = 1.2;

    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: 600,
        height: 800,
        wireframes: false,
        background: 'transparent',
      },
    });

    const walls = [
      Bodies.rectangle(-10, 400, 40, 800, {
        isStatic: true,
        render: { fillStyle: '#2c3e50' },
      }),
      Bodies.rectangle(610, 400, 40, 800, {
        isStatic: true,
        render: { fillStyle: '#2c3e50' },
      }),
      Bodies.rectangle(300, -10, 600, 40, {
        isStatic: true,
        render: { fillStyle: '#2c3e50' },
      }),
    ];

    const createHole = (pos, label, color) =>
      Bodies.circle(pos.x, pos.y, pos.radius, {
        isSensor: true,
        isStatic: true,
        label,
        render: { fillStyle: color },
      });

    const holes = [
      createHole(CONFIG.hrZone, 'HR', '#f1c40f'),
      ...CONFIG.tripleZones.map((p) => createHole(p, '3B', '#e67e22')),
      ...CONFIG.doubleZones.map((p) => createHole(p, '2B', '#3498db')),
      ...CONFIG.singleZones.map((p) => createHole(p, '1B', '#9b59b6')),
      ...CONFIG.flyOutZones.map((p) => createHole(p, 'OUT', '#e74c3c')),
    ];

    const rails = CONFIG.rails.map((r) =>
      Bodies.rectangle(r.x, r.y, r.width, 20, {
        isStatic: true,
        angle: r.angle * (Math.PI / 180),
        render: { fillStyle: '#c0392b' },
      })
    );

    const outZone = Bodies.rectangle(300, 840, 600, 60, {
      isSensor: true,
      isStatic: true,
      label: 'OUT',
    });

    // 💡 [수정됨] 배트를 처음 생성할 때부터 0도가 아닌 '대기 각도(angleDown)'로 맞춰서 생성합니다.
    const batRadius = 60;
    const initialAngleRad = CONFIG.bat.angleDown * (Math.PI / 180);
    const initialX = CONFIG.bat.pivot.x + batRadius * Math.cos(initialAngleRad);
    const initialY = CONFIG.bat.pivot.y + batRadius * Math.sin(initialAngleRad);

    const bat = Bodies.rectangle(initialX, initialY, 140, 24, {
      label: 'bat',
      isStatic: true,
      angle: initialAngleRad, // 시작부터 완벽한 각도 부여!
      render: { fillStyle: '#d35400' },
    });

    Composite.add(engine.world, [...walls, ...holes, ...rails, outZone, bat]);

    const pitchBall = () => {
      if (isGameOver) return;
      const ball = Bodies.circle(
        CONFIG.pitcher.x + (Math.random() * 40 - 20),
        CONFIG.pitcher.y,
        14,
        {
          label: 'ball',
          restitution: 0.5,
          friction: 0.01,
          isBullet: true,
          render: { fillStyle: '#ffffff' },
        }
      );
      Composite.add(engine.world, ball);
    };

    if (!isGameOver) pitchBall();

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('ball')) {
          const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
          const sensor = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;

          if (['HR', '3B', '2B', '1B', 'OUT'].includes(sensor.label)) {
            Composite.remove(engine.world, ball);
            onHit(sensor.label);
            if (!isGameOver) setTimeout(pitchBall, 1200);
          }
        }
      });
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (isGameOver) {
          onRetry();
          return;
        }
        isSwinging.current = true;
      }
      if (e.code === 'Space' && !isGameOver) pitchBall();
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Enter') isSwinging.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 내부 계산용 변수도 초기 시작 각도와 똑같이 맞춰줍니다.
    let currentAngle = initialAngleRad;

    Events.on(engine, 'beforeUpdate', () => {
      const targetAngle = isSwinging.current
        ? CONFIG.bat.angleUp * (Math.PI / 180)
        : CONFIG.bat.angleDown * (Math.PI / 180);

      const speed = CONFIG.bat.speed;
      let nextAngle = currentAngle;

      if (currentAngle > targetAngle) {
        nextAngle = Math.max(currentAngle - speed, targetAngle);
      } else if (currentAngle < targetAngle) {
        nextAngle = Math.min(currentAngle + speed, targetAngle);
      }

      if (nextAngle !== currentAngle) {
        const prevX = bat.position.x;
        const prevY = bat.position.y;

        const newX = CONFIG.bat.pivot.x + batRadius * Math.cos(nextAngle);
        const newY = CONFIG.bat.pivot.y + batRadius * Math.sin(nextAngle);

        Body.setPosition(bat, { x: newX, y: newY });
        Body.setAngle(bat, nextAngle);

        Body.setVelocity(bat, { x: newX - prevX, y: newY - prevY });
        Body.setAngularVelocity(bat, nextAngle - currentAngle);

        currentAngle = nextAngle;
      } else {
        Body.setVelocity(bat, { x: 0, y: 0 });
        Body.setAngularVelocity(bat, 0);
      }
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, [isGameOver, onHit, onRetry]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default MatterGame;
