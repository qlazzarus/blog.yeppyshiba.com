import MathUtil  from "./MathUtil";

class ImageUtil {
  static readonly defaultImages = ['/images/cards/pexels-olia-danilevich-4974915.jpg'];

  public static getImage(image: string | null | '' | undefined): string {
    return image || MathUtil.getRandomValue(this.defaultImages);
  }
}

export default ImageUtil;
