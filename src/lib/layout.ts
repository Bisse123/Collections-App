/** How a grid of tiles is laid out for the current window. */
export interface GridLayout {
  /** True when the window is wider than it is tall (landscape phones, tablets, desktops). */
  landscape: boolean;
  /** Tiles per row. */
  columns: number;
}

/** What a grid needs to know to work out its layout. */
export interface GridOptions {
  /** Width of one tile in landscape layout. */
  tileWidth: number;
  /** Space between tiles in a row. */
  gap: number;
  /** Padding on each side of the grid. */
  padding: number;
  /** Tiles per row in portrait layout, where they stretch to fill the row. */
  portraitColumns: number;
}

/**
 * Works out a grid's layout. Portrait windows use `portraitColumns` stretched tiles; landscape
 * windows fit as many `tileWidth`-wide tiles per row as there is room for.
 * @param width The window's width.
 * @param height The window's height.
 * @param options The grid's tile size, spacing and portrait column count.
 * @returns Whether the layout is landscape, and the number of tiles per row (at least 1).
 */
export function gridLayout(width: number, height: number, options: GridOptions): GridLayout {
  const landscape = width > height;
  if (!landscape) {
    return { landscape, columns: options.portraitColumns };
  }
  const available = width - options.padding * 2;
  const columns = Math.floor((available + options.gap) / (options.tileWidth + options.gap));
  return { landscape, columns: Math.max(1, columns) };
}
