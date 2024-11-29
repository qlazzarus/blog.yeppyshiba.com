class MathUtil {
  public static getRandomValue(values: any[]): any {
    const index = Math.floor(Math.random() * values.length);
    return values[index];
  }

  public static easeInSine(x: number): number {
    return 1 - Math.cos((x * Math.PI) / 2);
  }
}

export default MathUtil;
