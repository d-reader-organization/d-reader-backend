import { TreeConfigData } from '../types/compression';

export function getTreeConfig(supply: number): TreeConfigData {
  const exponent = nearestPowerOf2(supply);
  switch (exponent) {
    case 5:
      return { canopyDepth: 0, maxBufferSize: 8, maxDepth: exponent };
    case 10:
      return { canopyDepth: 5, maxBufferSize: 32, maxDepth: exponent };
    case 14:
      return { canopyDepth: 9, maxBufferSize: 256, maxDepth: exponent };
  }
}

function nearestPowerOf2(number: number) {
  const bitCount = Math.floor(Math.log2(number)) + 1;
  // Find the nearest power of 2 greater than or equal to the number
  const nearestGreater = 2 ** bitCount;
  // Find the nearest power of 2 less than the number
  const nearestLess = 2 ** (bitCount - 1);
  // Return the nearest power of 2 by choosing the closer one
  return nearestGreater - number < number - nearestLess
    ? bitCount
    : bitCount - 1;
}
