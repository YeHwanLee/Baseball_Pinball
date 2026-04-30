// MatterGame.jsx
import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { PROCON_CONFIG } from './App';

const CONFIG = {
  pitcher: { x: 300, y: 400 },
  hrZone: [
    { x: 250, y: 100, radius: 20 },
    { x: 350, y: 100, radius: 20 },
  ],
  tripleZones: [
    { x: 150, y: 350, radius: 20 },
    { x: 450, y: 350, radius: 20 },
  ],
  doubleZones: [
    { x: 100, y: 450, radius: 20 },
    { x: 500, y: 450, radius: 20 },
  ],
  singleZones: [
    { x: 70, y: 550, radius: 20 },
    { x: 530, y: 550, radius: 20 },
  ],
  foulZones: [
    { x: 35, y: 710, radius: 30 },
    { x: 565, y: 710, radius: 30 },
  ],
  defenders: [
    { x: 150, y: 225, radius: 25, range: 60, speed: 0.05 },
    { x: 450, y: 225, radius: 25, range: 60, speed: 0.05 },
    // { x: 150, y: 500, radius: 12, range: 60, speed: 0.025 },
    // { x: 450, y: 500, radius: 12, range: 60, speed: 0.025 },
  ],
  rails: [
    { x: 100, y: 800, width: 250, angle: 35 },
    { x: 500, y: 800, width: 250, angle: -35 },
  ],
  bat: { pivot: { x: 220, y: 920 }, angleUp: -35, angleDown: 20, speed: 0.16 },
};

const MatterGame = ({ onHit, gameState }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const isSwinging = useRef(false);

  const pitchStateRef = useRef('WAITING_PITCH');
  const pitchTimeoutRef = useRef(null);

  const onHitRef = useRef(onHit);
  useEffect(() => {
    onHitRef.current = onHit;
  }, [onHit]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      pitchStateRef.current = 'PREPARING';
      const randomDelay = Math.random() * 2000 + 1000;
      pitchTimeoutRef.current = setTimeout(() => {
        pitchBall();
      }, randomDelay);
    } else {
      if (pitchTimeoutRef.current) clearTimeout(pitchTimeoutRef.current);
    }
  }, [gameState]);

  const pitchBallRef = useRef(null);

  const pitchBall = () => {
    if (pitchBallRef.current) pitchBallRef.current();
  };

  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;
    const engine = Engine.create();
    engineRef.current = engine;

    engine.positionIterations = 20;
    engine.velocityIterations = 20;
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
            45,
            {
              isStatic: true,
              angle: angle + Math.PI / 2,
              render: { fillStyle: '#144d22' },
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

    // 💡 테두리 굵기를 6으로 적당하게 줄임
    const createHole = (pos, label, color) =>
      Bodies.circle(pos.x, pos.y, pos.radius, {
        isSensor: true,
        isStatic: true,
        label,
        render: { fillStyle: '#111111', strokeStyle: color, lineWidth: 6 },
      });

    const defenderBodies = CONFIG.defenders.map((def) => {
      const body = Bodies.circle(def.x, def.y, def.radius, {
        isSensor: true,
        isStatic: true,
        label: 'OUT',
        render: { fillStyle: '#111111', strokeStyle: '#e74c3c', lineWidth: 6 },
      });
      return { body, config: def, time: Math.random() * Math.PI * 2 };
    });

    const holes = [
      ...CONFIG.hrZone.map((p) => createHole(p, 'HR', '#f1c40f')),
      ...CONFIG.tripleZones.map((p) => createHole(p, '3B', '#e67e22')),
      ...CONFIG.doubleZones.map((p) => createHole(p, '2B', '#3498db')),
      ...CONFIG.singleZones.map((p) => createHole(p, '1B', '#9b59b6')),
      ...CONFIG.foulZones.map((p) => createHole(p, 'FOUL', '#ecf0f1')), // 파울은 원래 흰색 유지
      ...defenderBodies.map((d) => d.body),
    ];

    const rails = CONFIG.rails.map((r) =>
      Bodies.rectangle(r.x, r.y, r.width, 20, {
        isStatic: true,
        angle: r.angle * (Math.PI / 180),
        render: { fillStyle: '#ffffff' },
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

    const bat = Bodies.rectangle(initialX, initialY, 140, 30, {
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

    // 💡 네온 밝기(shadowBlur)를 10으로 줄여서 은은하게
    Events.on(render, 'afterRender', () => {
      const ctx = render.context;

      holes.forEach((hole) => {
        ctx.beginPath();
        ctx.arc(
          hole.position.x,
          hole.position.y,
          hole.circleRadius,
          0,
          2 * Math.PI
        );
        ctx.lineWidth = hole.render.lineWidth;
        ctx.strokeStyle = hole.render.strokeStyle;

        ctx.shadowBlur = 10;
        ctx.shadowColor = hole.render.strokeStyle;

        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    });

    // 여기서부터 끊겼던 코드입니다!
    pitchBallRef.current = () => {
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
          render: { fillStyle: '#000000' },
        }
      );
      Composite.add(engine.world, ball);
      pitchStateRef.current = 'PITCHING';
    };

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

    Events.on(engine, 'beforeUpdate', () => {
      let isGamepadPressed = false;
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let gp of gamepads) {
        if (gp) {
          for (let btnIndex of PROCON_CONFIG.actionButtons) {
            if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
              isGamepadPressed = true;
              break;
            }
          }
        }
      }

      let isGamepadSwinging = false;
      if (isGamepadPressed && gameState === 'PLAYING') {
        isGamepadSwinging = true;
      }

      const isSwingingNow = isSwinging.current || isGamepadSwinging;

      const targetAngle = isSwingingNow
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

      defenderBodies.forEach((def) => {
        def.time += def.config.speed;
        const newX = def.config.x + Math.sin(def.time) * def.config.range;
        Body.setPosition(def.body, { x: newX, y: def.config.y });
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
      pitchBallRef.current = null;
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
