import { extendTheme } from '@chakra-ui/react';
import "@fontsource/sunflower";
import { Layout } from '@/constants';

export default extendTheme({
  fonts: {
    body: "Sunflower",
  },
  colors: {
    primary: 'rebeccapurple',
  },
  styles: {
    global: {
      html: {
        scrollPaddingTop: Layout.navigationHeight
      }
    }
  }
});
