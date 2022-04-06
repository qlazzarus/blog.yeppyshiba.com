class MathUtil {
    public static getRandomValue(values: any[]): any {
        const index = Math.floor(Math.random() * values.length);
        return values[index];
    }
}

export default MathUtil;