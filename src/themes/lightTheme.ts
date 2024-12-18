import { interFont } from '@/fonts';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const lightTheme = createTheme({
    components: {
        MuiAppBar: {
            defaultProps: {
                color: 'transparent',
            },
        },
    },
    palette: {
        mode: 'light',
    },
    typography: {
        fontFamily: interFont.style.fontFamily,
    },
});

export default responsiveFontSizes(lightTheme);
