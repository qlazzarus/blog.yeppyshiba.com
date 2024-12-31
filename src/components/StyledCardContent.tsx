import { CardContent } from '@mui/material';
import React from 'react';

const StyledCardContent = ({ children, ...props }: React.ComponentProps<typeof CardContent>) => {
    return (
        <CardContent
            {...props}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: 16,
                flexGrow: 1,
                '&:last-child': {
                    paddingBottom: 16,
                },
            }}
        >
            {children}
        </CardContent>
    );
};

export default StyledCardContent;
