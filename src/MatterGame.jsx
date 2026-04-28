// MatterGame.jsx
import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const CONFIG = {
  pitcher: { x: 300, y: 400 },
  hrZone: [
    { x: 200, y: 100, radius: 20 },
    { x: 400, y: 100, radius: 20 },
  ],
  tripleZones: [
    { x: 150, y: 200, radius: 25 },
    { x: 450, y: 200, radius: 25 },
  ],
  doubleZones: [
    { x: 100, y: 400, radius: 20 },
    { x: 500, y: 400, radius: 20 },
  ],
  singleZones: [
    { x: 70, y: 600, radius: 20 },
    { x: 530, y: 600, radius: 20 },
  ],
  foulZones: [
    { x: 35, y: 810, radius: 30 },
    { x: 565, y: 810, radius: 30 },
  ],

  // 💡 [새로운 기능] 좌우로 움직이는 수비수 설정! (기존 flyOutZones 대체)
  defenders: [
    // x, y: 중심 좌표 / radius: 크기 / range: 좌우로 이동하는 픽셀 범위 / speed: 왕복 속도
    { x: 150, y: 300, radius: 25, range: 60, speed: 0.05 }, // 좌익수 느낌
    { x: 450, y: 300, radius: 25, range: 60, speed: 0.05 }, // 우익수 느낌
  ],

  rails: [
    { x: 100, y: 900, width: 250, angle: 35 },
    { x: 500, y: 900, width: 250, angle: -35 },
  ],
  bat: { pivot: { x: 220, y: 920 }, angleUp: -35, angleDown: 20, speed: 0.16 },
};

const MatterGame = ({ onHit, gameState }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const isSwinging = useRef(false);

  const onHitRef = useRef(onHit);
  useEffect(() => {
    onHitRef.current = onHit;
  }, [onHit]);

  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;
    const engine = Engine.create();
    engineRef.current = engine;

    engine.positionIterations = 10;
    engine.velocityIterations = 10;
    engine.gravity.y = 1.2;

    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: 600,
        height: 1000,
        wireframes: false,
        background: 'transparent',
      },
    });

    const createArcWalls = (cx, cy, radius, startAngle, endAngle, segments) => {
      const walls = [];
      const angleStep = (endAngle - startAngle) / segments;
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + i * angleStep;
        walls.push(
          Bodies.rectangle(
            cx + radius * Math.cos(angle),
            cy + radius * Math.sin(angle),
            radius * angleStep + 10,
            30,
            {
              isStatic: true,
              angle: angle + Math.PI / 2,
              render: { fillStyle: '#1e5f30' },
            }
          )
        );
      }
      return walls;
    };

    const outfieldWalls = createArcWalls(
      300,
      950,
      880,
      Math.PI + 0.2,
      2 * Math.PI - 0.2,
      30
    );
    const sideWalls = [
      Bodies.rectangle(-10, 500, 40, 1500, {
        isStatic: true,
        render: { visible: false },
      }),
      Bodies.rectangle(610, 500, 40, 1500, {
        isStatic: true,
        render: { visible: false },
      }),
    ];

    const createHole = (pos, label, color) =>
      Bodies.circle(pos.x, pos.y, pos.radius, {
        isSensor: true,
        isStatic: true,
        label,
        render: { fillStyle: color, strokeStyle: '#000', lineWidth: 2 },
      });

    // 💡 수비수(Defender) 바디 생성 (각자 다른 타이밍에 움직이도록 초기 시간(time)을 랜덤으로 부여)
    const defenderBodies = CONFIG.defenders.map((def) => {
      const body = Bodies.circle(def.x, def.y, def.radius, {
        isSensor: true,
        isStatic: true,
        label: 'OUT',
        render: { fillStyle: '#c0392b', strokeStyle: '#fff', lineWidth: 3 }, // 눈에 띄는 빨간색 테두리
      });
      return { body, config: def, time: Math.random() * Math.PI * 2 };
    });

    const holes = [
      ...CONFIG.hrZone.map((p) => createHole(p, 'HR', '#f1c40f')),
      ...CONFIG.tripleZones.map((p) => createHole(p, '3B', '#e67e22')),
      ...CONFIG.doubleZones.map((p) => createHole(p, '2B', '#3498db')),
      ...CONFIG.singleZones.map((p) => createHole(p, '1B', '#9b59b6')),
      ...CONFIG.foulZones.map((p) => createHole(p, 'FOUL', '#ecf0f1')),
      // 💡 생성된 수비수 바디들을 월드에 추가하기 위해 배열에 합침
      ...defenderBodies.map((d) => d.body),
    ];

    const rails = CONFIG.rails.map((r) =>
      Bodies.rectangle(r.x, r.y, r.width, 20, {
        isStatic: true,
        angle: r.angle * (Math.PI / 180),
        render: { fillStyle: '#ecf0f1' },
      })
    );

    const strikeZone = Bodies.rectangle(300, 1060, 800, 100, {
      isSensor: true,
      isStatic: true,
      label: 'STRIKE',
    });

    const batRadius = 60;
    const initialAngleRad = CONFIG.bat.angleDown * (Math.PI / 180);
    const initialX = CONFIG.bat.pivot.x + batRadius * Math.cos(initialAngleRad);
    const initialY = CONFIG.bat.pivot.y + batRadius * Math.sin(initialAngleRad);

    const bat = Bodies.rectangle(initialX, initialY, 140, 24, {
      label: 'bat',
      isStatic: true,
      angle: initialAngleRad,
      render: { fillStyle: '#d35400' },
    });

    Composite.add(engine.world, [
      ...sideWalls,
      ...outfieldWalls,
      ...holes,
      ...rails,
      strikeZone,
      bat,
    ]);

    const pitchBall = () => {
      if (gameState !== 'PLAYING') return;
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

    if (gameState === 'PLAYING') pitchBall();

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('ball')) {
          const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
          const sensor = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;

          if (
            ['HR', '3B', '2B', '1B', 'FOUL', 'OUT', 'STRIKE'].includes(
              sensor.label
            )
          ) {
            Composite.remove(engine.world, ball);
            onHitRef.current(sensor.label);
            if (gameState === 'PLAYING') setTimeout(pitchBall, 1200);
          }
        }
      });
    });

    const handleInputDown = (e) => {
      if (e.key === 'Enter' || e.type === 'touchstart') {
        if (e.key === 'Enter') e.preventDefault();
        if (gameState === 'PLAYING') isSwinging.current = true;
      }
    };
    const handleInputUp = (e) => {
      if (e.key === 'Enter' || e.type === 'touchend')
        isSwinging.current = false;
    };

    window.addEventListener('keydown', handleInputDown, { passive: false });
    window.addEventListener('keyup', handleInputUp);

    const currentCanvas = canvasRef.current;
    if (currentCanvas) {
      currentCanvas.addEventListener('touchstart', handleInputDown, {
        passive: false,
      });
      currentCanvas.addEventListener('touchend', handleInputUp);
    }

    let currentAngle = initialAngleRad;

    // 💡 매 프레임마다 실행되는 업데이트 루프
    Events.on(engine, 'beforeUpdate', () => {
      // 1. 배트 회전 처리
      const targetAngle = isSwinging.current
        ? CONFIG.bat.angleUp * (Math.PI / 180)
        : CONFIG.bat.angleDown * (Math.PI / 180);
      const batSpeed = CONFIG.bat.speed;
      let nextAngle = currentAngle;

      if (currentAngle > targetAngle)
        nextAngle = Math.max(currentAngle - batSpeed, targetAngle);
      else if (currentAngle < targetAngle)
        nextAngle = Math.min(currentAngle + batSpeed, targetAngle);

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

      // 💡 2. 수비수 좌우 왕복 이동 처리
      defenderBodies.forEach((def) => {
        def.time += def.config.speed; // 시간에 속도를 더함
        // 삼각함수(sin)를 이용하여 중심축(config.x)을 기준으로 range만큼 왔다갔다 함
        const newX = def.config.x + Math.sin(def.time) * def.config.range;
        Body.setPosition(def.body, { x: newX, y: def.config.y }); // Y축은 고정
      });
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      window.removeEventListener('keydown', handleInputDown);
      window.removeEventListener('keyup', handleInputUp);
      if (currentCanvas) {
        currentCanvas.removeEventListener('touchstart', handleInputDown);
        currentCanvas.removeEventListener('touchend', handleInputUp);
      }
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        position: 'relative',
        zIndex: 10,
      }}
    />
  );
};

export default MatterGame;
