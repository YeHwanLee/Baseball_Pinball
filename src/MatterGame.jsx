// MatterGame.jsx
import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const CONFIG = {
  pitcher: { x: 300, y: 350 },
  hrZone: { x: 300, y: 80, radius: 40 },
  tripleZones: [
    { x: 150, y: 170, radius: 25 },
    { x: 450, y: 170, radius: 25 },
  ],
  doubleZones: [
    { x: 80, y: 320, radius: 20 },
    { x: 520, y: 320, radius: 20 },
  ],
  singleZones: [
    { x: 70, y: 500, radius: 20 },
    { x: 530, y: 500, radius: 20 },
  ],
  flyOutZones: [
    { x: 220, y: 250, radius: 25 },
    { x: 380, y: 250, radius: 25 },
  ],
  foulZones: [
    { x: 40, y: 600, radius: 30 },
    { x: 560, y: 600, radius: 30 },
  ],
  rails: [
    { x: 100, y: 750, width: 250, angle: 35 },
    { x: 500, y: 750, width: 250, angle: -35 },
  ],
  bat: {
    pivot: { x: 250, y: 720 },
    angleUp: -35,
    angleDown: 15,
    speed: 0.25,
  },
};

const MatterGame = ({ onHit, gameState }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const isSwinging = useRef(false);

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
        height: 800,
        wireframes: false,
        background: '#27ae60',
      },
    });

    const createArcWalls = (cx, cy, radius, startAngle, endAngle, segments) => {
      const walls = [];
      const angleStep = (endAngle - startAngle) / segments;
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + i * angleStep;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        walls.push(
          Bodies.rectangle(x, y, radius * angleStep + 10, 30, {
            isStatic: true,
            angle: angle + Math.PI / 2,
            render: { fillStyle: '#1e5f30' },
          })
        );
      }
      return walls;
    };

    const outfieldWalls = createArcWalls(
      300,
      750,
      680,
      Math.PI + 0.2,
      2 * Math.PI - 0.2,
      30
    );

    const sideWalls = [
      Bodies.rectangle(-10, 400, 40, 800, {
        isStatic: true,
        render: { visible: false },
      }),
      Bodies.rectangle(610, 400, 40, 800, {
        isStatic: true,
        render: { visible: false },
      }),
    ];

    const infieldDirt = Bodies.circle(300, 850, 300, {
      isStatic: true,
      isSensor: true,
      render: { fillStyle: '#e67e22' },
    });

    const createHole = (pos, label, color) =>
      Bodies.circle(pos.x, pos.y, pos.radius, {
        isSensor: true,
        isStatic: true,
        label,
        render: { fillStyle: color, strokeStyle: '#000', lineWidth: 2 },
      });

    const holes = [
      createHole(CONFIG.hrZone, 'HR', '#f1c40f'),
      ...CONFIG.tripleZones.map((p) => createHole(p, '3B', '#e67e22')),
      ...CONFIG.doubleZones.map((p) => createHole(p, '2B', '#3498db')),
      ...CONFIG.singleZones.map((p) => createHole(p, '1B', '#9b59b6')),
      ...CONFIG.flyOutZones.map((p) => createHole(p, 'OUT', '#e74c3c')),
      ...CONFIG.foulZones.map((p) => createHole(p, 'FOUL', '#ecf0f1')),
    ];

    const rails = CONFIG.rails.map((r) =>
      Bodies.rectangle(r.x, r.y, r.width, 20, {
        isStatic: true,
        angle: r.angle * (Math.PI / 180),
        render: { fillStyle: '#ecf0f1' },
      })
    );

    // 💡 [수정] 바닥으로 빠지는 구역의 라벨을 'STRIKE'로 변경
    const strikeZone = Bodies.rectangle(300, 840, 600, 60, {
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
      infieldDirt,
      ...outfieldWalls,
      ...holes,
      ...rails,
      strikeZone, // 💡 변경된 변수명 적용
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

    if (gameState === 'PLAYING') {
      pitchBall();
    }

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('ball')) {
          const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
          const sensor = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;

          // 💡 [수정] 충돌 감지 목록에 'STRIKE' 추가
          if (
            ['HR', '3B', '2B', '1B', 'FOUL', 'OUT', 'STRIKE'].includes(
              sensor.label
            ) &&
            sensor !== infieldDirt
          ) {
            Composite.remove(engine.world, ball);
            onHit(sensor.label);
            if (gameState === 'PLAYING') setTimeout(pitchBall, 1200);
          }
        }
      });
    });

    const handleInputDown = (e) => {
      if (e.key === 'Enter' || e.type === 'touchstart') {
        if (e.key === 'Enter') e.preventDefault();
        if (gameState === 'PLAYING') {
          isSwinging.current = true;
        }
      }
      if (e.code === 'Space' && gameState === 'PLAYING') pitchBall();
    };

    const handleInputUp = (e) => {
      if (e.key === 'Enter' || e.type === 'touchend') {
        isSwinging.current = false;
      }
    };

    window.addEventListener('keydown', handleInputDown, { passive: false });
    window.addEventListener('keyup', handleInputUp);

    const canvasEl = canvasRef.current;
    if (canvasEl) {
      canvasEl.addEventListener('touchstart', handleInputDown, {
        passive: false,
      });
      canvasEl.addEventListener('touchend', handleInputUp);
    }

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
      window.removeEventListener('keydown', handleInputDown);
      window.removeEventListener('keyup', handleInputUp);
      if (canvasEl) {
        canvasEl.removeEventListener('touchstart', handleInputDown);
        canvasEl.removeEventListener('touchend', handleInputUp);
      }
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, [gameState, onHit]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
      }}
    />
  );
};

export default MatterGame;
