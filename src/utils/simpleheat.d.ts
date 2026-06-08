declare module 'simpleheat' {
  interface SimpleHeat {
    data(points: [number, number, number?][]): SimpleHeat;
    max(max: number): SimpleHeat;
    draw(minOpacity?: number): void;
    radius(r: number, blur?: number): SimpleHeat;
    gradient(grad: { [stop: number]: string }): SimpleHeat;
    clear(): void;
  }
  function simpleheat(canvas: HTMLCanvasElement | string): SimpleHeat;
  export default simpleheat;
}
