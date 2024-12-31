import { Box, Typography } from '@mui/material';
import React from 'react';

const CardFooter = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 2,
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                Views
            </Box>
            <Typography variant='caption'>July 14, 2021</Typography>
        </Box>
    );
};

export default CardFooter;
