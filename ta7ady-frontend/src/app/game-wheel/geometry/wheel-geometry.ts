import type { GameId, GameOption } from '../../shared/game-catalog';

export interface WheelSegment {
  readonly game: GameOption;
  readonly path: string;
  readonly labelTransform: string;
  readonly labelLines: readonly WheelLabelLine[];
  readonly colorClass: string;
  readonly labelClass: string;
}

interface WheelLabelLine {
  readonly text: string;
  readonly dy: string;
}

const WHEEL_CENTER = 180;
const WHEEL_RADIUS = 168;
const LABEL_RADIUS = 112;
const POINTER_ANGLE = -90;
const FULL_CIRCLE = 360;
const SPIN_TURNS = 4;

function pointOnWheel(angle: number, radius: number): readonly [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [WHEEL_CENTER + Math.cos(radians) * radius, WHEEL_CENTER + Math.sin(radians) * radius];
}

function segmentPath(startAngle: number, endAngle: number): string {
  if (endAngle - startAngle >= FULL_CIRCLE) {
    return `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${WHEEL_CENTER} ${WHEEL_CENTER - WHEEL_RADIUS} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 1 1 ${WHEEL_CENTER} ${WHEEL_CENTER + WHEEL_RADIUS} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 1 1 ${WHEEL_CENTER} ${WHEEL_CENTER - WHEEL_RADIUS} Z`;
  }

  const [startX, startY] = pointOnWheel(startAngle, WHEEL_RADIUS);
  const [endX, endY] = pointOnWheel(endAngle, WHEEL_RADIUS);
  const largeArc = endAngle - startAngle > FULL_CIRCLE / 2 ? 1 : 0;
  return `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${startX} ${startY} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

function createLabelLines(name: string): readonly WheelLabelLine[] {
  const words = name.split(/\s+/);
  const firstLineOffset = -((words.length - 1) / 2);
  return words.map((text, index) => ({
    text,
    dy: index === 0 ? `${firstLineOffset}em` : '1em',
  }));
}

export function createWheelSegments(games: readonly GameOption[]): readonly WheelSegment[] {
  if (games.length === 0) return [];

  const sliceAngle = FULL_CIRCLE / games.length;
  return games.map((game, index) => {
    const startAngle = POINTER_ANGLE + index * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const middleAngle = (startAngle + endAngle) / 2;
    const [labelX, labelY] = pointOnWheel(middleAngle, LABEL_RADIUS);

    return {
      game,
      path: segmentPath(startAngle, endAngle),
      labelTransform: `translate(${labelX} ${labelY})`,
      labelLines: createLabelLines(game.name),
      colorClass: `sector-${index % 2}`,
      labelClass: `label-${index % 2}`,
    };
  });
}

export function rotationForWinner(
  games: readonly GameOption[],
  winnerId: GameId,
  currentRotation: number,
): number | null {
  const winnerIndex = games.findIndex((game) => game.id === winnerId);
  if (winnerIndex === -1 || games.length === 0) return null;

  const sliceAngle = FULL_CIRCLE / games.length;
  const winnerCenterAngle = POINTER_ANGLE + (winnerIndex + 0.5) * sliceAngle;
  const targetAngle = (POINTER_ANGLE - winnerCenterAngle + FULL_CIRCLE) % FULL_CIRCLE;
  const currentRemainder = ((currentRotation % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
  const finalTurn = (targetAngle - currentRemainder + FULL_CIRCLE) % FULL_CIRCLE;
  return currentRotation + SPIN_TURNS * FULL_CIRCLE + finalTurn;
}
