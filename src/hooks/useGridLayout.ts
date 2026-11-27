import { useWindowDimensions } from 'react-native';

import { gridLayout, type GridLayout, type GridOptions } from '../lib/layout';

/**
 * Works out a grid's layout from the current window size, updating when the window is resized or
 * the device is rotated.
 * @param options The grid's tile size, spacing and portrait column count.
 * @returns Whether the layout is landscape, and the number of tiles per row.
 */
export function useGridLayout(options: GridOptions): GridLayout {
  const { width, height } = useWindowDimensions();
  return gridLayout(width, height, options);
}
