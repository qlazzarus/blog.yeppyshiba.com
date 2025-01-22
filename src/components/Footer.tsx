import { Box, Container, Link, Typography } from '@mui/material';
import getConfig from 'next/config';
import React from 'react';

// Next.js Config 가져오기
const { publicRuntimeConfig } = getConfig();
const { siteMetadata } = publicRuntimeConfig;

const Footer = () => {
    const since = 2022;
    const year = new Date().getFullYear();
    const displayYear = since === year ? since : `${since}-${year}`;

    return (
        <Box py={2} mt={4} component='footer'>
            <Container
                maxWidth='lg'
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'center', md: 'space-between' },
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <Typography variant='body2'>
                    &copy; {displayYear} {siteMetadata.title}. All rights reserved.
                </Typography>

                <Typography variant='body2'>
                    <Link
                        href='https://www.flaticon.com/free-icons/akita-inu'
                        target='_blank'
                        rel='noopener noreferrer'
                        title='akita inu icons'
                        underline='hover'
                        color='primary'
                    >
                        Akita inu icons created by tulpahn - Flaticon
                    </Link>
                </Typography>
            </Container>
        </Box>
    );
};

export default Footer;
