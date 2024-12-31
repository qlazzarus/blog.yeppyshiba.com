import { Box, Typography } from '@mui/material';
import moment from 'moment';
import React from 'react';

const CardFooter = ({ date, viewCount }: { date: Date | string; viewCount: number }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 2,
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '16px',
            }}
        >
            <Typography variant='caption'>
                {moment(date).fromNow()}
                {viewCount > 0 && `, ${viewCount} Views`}
            </Typography>
        </Box>
    );
};

export default CardFooter;
