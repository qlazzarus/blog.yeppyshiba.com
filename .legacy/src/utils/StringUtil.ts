import { slugify } from 'transliteration';

class StringUtil {
    static readonly allowedChars = 'a-zA-Z0-9';

    public static slugify(slug: string): string {
      return slugify(slug, { allowedChars: StringUtil.allowedChars });
    }
  }
  
  export default StringUtil;
  