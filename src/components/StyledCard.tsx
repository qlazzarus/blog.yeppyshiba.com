import { Card } from '@mui/material';
import React from 'react';

const StyledCard = ({ children, ...props }: React.ComponentProps<typeof Card>) => {
    return (
        <Card
            {...props}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                height: '100%',
                backgroundColor: 'background.paper',
                '&:hover': {
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                },
                '&:focus-visible': {
                    outline: '3px solid',
                    outlineColor: 'hsla(210, 98%, 48%, 0.5)',
                    outlineOffset: '2px',
                },
            }}
        >
            {children}
        </Card>
    );
};

export default StyledCard;
