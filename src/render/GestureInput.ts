import type { GestureFrame, TrackedHand } from '../types';
import { dist, speed } from './utils/math';

export function composeGestureFrame(hands: TrackedHand[], face: GestureFrame['face'], pointer: TrackedHand | null, mirrored: boolean, demo = false): GestureFrame {
  const source = hands.length ? hands : pointer ? [pointer] : [];
  const primary = source[0];
  const twoHandDistance = source.length > 1 ? dist(source[0].palm, source[1].palm) : 0;
  const swipeVelocity = primary ? Math.max(speed(primary.velocity), speed(primary.indexVelocity)) : 0;
  let activeGesture = demo ? 'auto demo' : 'idle';
  if (source.length > 1 && twoHandDistance > .18) activeGesture = 'two-hand portal';
  else if (primary?.pinchStrength && primary.pinchStrength > .45) activeGesture = 'pinch vortex';
  else if (swipeVelocity > 1.25) activeGesture = 'fast swipe';
  else if (primary) activeGesture = 'finger pan';
  if (face?.isKissy) activeGesture = 'kissy burst';
  const charge = primary && speed(primary.indexVelocity) < .08 ? Math.min(1, (primary.pinchStrength + .35)) : 0;
  return { hands: source, face, pointer, activeGesture, swipeVelocity, twoHandDistance, charge, demo, mirrored };
}
