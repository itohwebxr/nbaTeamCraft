import { Position } from "@/types";

const POS_ORDER: Position[] = ["PG", "SG", "SF", "PF", "C"];

export function positionPenaltyMultiplier(
  nativePositions: Position[],
  assignedPos: Position
): number {
  const assignedIdx = POS_ORDER.indexOf(assignedPos);
  const minDist = Math.min(
    ...nativePositions.map((p) => Math.abs(POS_ORDER.indexOf(p) - assignedIdx))
  );
  if (minDist === 0) return 1.0;
  if (minDist === 1) return 0.98;
  if (minDist === 2) return 0.94;
  return 0.88;
}
