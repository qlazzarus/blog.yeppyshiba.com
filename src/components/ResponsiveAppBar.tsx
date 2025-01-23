'use client';

import { DarkMode, GitHub, LightMode, LinkedIn, Menu as MenuIcon } from '@mui/icons-material';
import {
    AppBar,
    Box,
    Button,
    Container,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
    useColorScheme,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE;

const pages = [
    { title: 'About', link: '/about' },
    { title: 'Category', link: '/category' },
    { title: 'Tags', link: '/tag' },
    { title: 'Map', link: '/map' },
];

const ResponsiveAppBar = () => {
    const router = useRouter();
    const { mode, setMode, systemMode } = useColorScheme();
    const [isScrolled, setIsScrolled] = useState<boolean>(false);
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);

    const activeMode = mode === 'system' ? systemMode : mode;

    const handleToggleMode = () => {
        setMode(activeMode === 'light' ? 'dark' : 'light');
    };

    const handleToggleDrawer = (open: boolean) => () => {
        setDrawerOpen(open);
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <>
            {/* AppBar */}
            <AppBar
                position='fixed'
                enableColorOnDark
                sx={[
                    (theme) => ({
                        transition: 'background-color 0.3s ease',
                        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                    }),
                    (theme) =>
                        theme.applyStyles('dark', {
                            transition: 'background-color 0.3s ease',
                            backgroundColor: isScrolled ? 'rgba(34, 34, 34, 0.9)' : 'transparent',
                        }),
                ]}
            >
                <Container maxWidth='xl'>
                    <Toolbar disableGutters>
                        {/* 모바일: 햄버거 메뉴 */}
                        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                            <IconButton
                                size='large'
                                edge='start'
                                color='inherit'
                                aria-label='menu'
                                onClick={handleToggleDrawer(true)}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Box>

                        {/* 홈 로고 */}
                        <Box
                            sx={{
                                display: { xs: 'none', md: 'flex' },
                                alignItems: 'center',
                                mr: 2,
                            }}
                        >
                            <Typography variant='h6' noWrap component='h1'>
                                <Link
                                    href='/'
                                    style={{
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Image
                                        src={'/images/akita-inu.png'}
                                        alt={siteTitle || ''}
                                        width={24}
                                        height={24}
                                    />
                                    <Typography ml={1}>{siteTitle}</Typography>
                                </Link>
                            </Typography>
                        </Box>

                        {/* 데스크탑 메뉴 */}
                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                            {pages.map((page) => (
                                <Button
                                    key={page.title}
                                    size='small'
                                    sx={{
                                        display: 'block',
                                        textTransform: 'none',
                                        textDecoration: 'none',
                                    }}
                                    onClick={() => router.push(page.link)}
                                >
                                    {page.title}
                                </Button>
                            ))}
                        </Box>

                        {/* 외부 링크 및 다크모드 토글 */}
                        <Box sx={{ flexGrow: 0 }}>
                            <IconButton
                                component='a'
                                href='https://github.com/qlazzarus'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                <GitHub />
                            </IconButton>
                            <IconButton
                                component='a'
                                href='https://www.linkedin.com/in/yeppyshiba/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                <LinkedIn />
                            </IconButton>
                            <IconButton onClick={handleToggleMode}>
                                {activeMode === 'light' ? <DarkMode /> : <LightMode />}
                            </IconButton>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* 모바일 드로어 */}
            <Drawer anchor='left' open={isDrawerOpen} onClose={handleToggleDrawer(false)}>
                <Box
                    sx={{ width: 250 }}
                    role='presentation'
                    onClick={handleToggleDrawer(false)}
                    onKeyDown={handleToggleDrawer(false)}
                >
                    <List>
                        <ListItem>
                            <Typography variant='h6'>
                                <Link
                                    href='/'
                                    style={{
                                        textDecoration: 'none',
                                    }}
                                >
                                    {siteTitle}
                                </Link>
                            </Typography>
                        </ListItem>
                        {pages.map((page) => (
                            <ListItem key={page.title} disablePadding>
                                <ListItemButton component={Link} href={page.link}>
                                    <ListItemText primary={page.title} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
        </>
    );
};

export default ResponsiveAppBar;
