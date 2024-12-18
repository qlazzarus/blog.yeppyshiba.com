import { interFont } from '@/fonts';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const darkTheme = createTheme({
    components: {
        MuiAppBar: {
            defaultProps: {
                color: 'transparent',
            },
        },
    },
    palette: {
        mode: 'dark',
    },
    typography: {
        fontFamily: interFont.style.fontFamily,
    },
});

export default responsiveFontSizes(darkTheme);
