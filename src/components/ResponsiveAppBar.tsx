'use client';

import { useThemeStore } from '@/stores/themeStore';
import { GitHub, LinkedIn, DarkMode, LightMode } from '@mui/icons-material';
import { AppBar, Box, Button, Container, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const pages = [
    {
        title: 'About',
        link: '/about',
    },
    {
        title: 'Category',
        link: '/category',
    },
    {
        title: 'Tags',
        link: '/tag',
    },
    {
        title: 'Map',
        link: '/map',
    },
];

const ResponsiveAppBar = () => {
    const router = useRouter();
    const [anchorElNav, setAnchorElNav] = useState<null>(null);
    const mode = useThemeStore((state) => state.mode);
    const toggleMode = useThemeStore((state) => state.toggleMode);
    const [isScrolled, setIsScrolled] = useState<boolean>(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10); // 스크롤이 10px 이상 내려가면 상태 변경
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const appBarBackground = isScrolled
        ? mode === 'dark'
            ? 'rgba(34, 34, 34, 0.9)' // Dark mode 배경색
            : 'rgba(255, 255, 255, 0.9)' // Light mode 배경색
        : 'transparent'; // 기본 투명

    const handleOpenNavMenu = (event: any) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                backgroundColor: appBarBackground,
                transition: 'background-color 0.3s ease', // 부드러운 전환
            }}
        >
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    {/* 메뉴 (Mobile) */}
                    <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                        <IconButton
                            size="large"
                            aria-label="menu"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleOpenNavMenu}
                            color="inherit"
                        >
                            <Image src={'/akita-inu.png'} alt="Yeppyshiba Blog" width={24} height={24} />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorElNav}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            open={Boolean(anchorElNav)}
                            onClose={handleCloseNavMenu}
                            sx={{
                                display: { xs: 'block', md: 'none' },
                            }}
                        >
                            <MenuItem onClick={handleCloseNavMenu}>
                                <Typography textAlign="center">
                                    <Link href={'/'} passHref>
                                        {'Blog'}
                                    </Link>
                                </Typography>
                            </MenuItem>
                            {pages.map((page) => (
                                <MenuItem key={page.title} onClick={handleCloseNavMenu}>
                                    <Typography textAlign="center">
                                        <Link href={page.link} passHref>
                                            {page.title}
                                        </Link>
                                    </Typography>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>

                    {/* 홈 로고 */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
                        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            <Image src={'/akita-inu.png'} alt="Yeppyshiba Blog" width={24} height={24} />
                            <Typography variant="h6" noWrap component="div" ml={1}>
                                Yeppyshiba Blog
                            </Typography>
                        </Link>
                    </Box>

                    {/* 메뉴 (Desktop) */}
                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                        {pages.map((page) => (
                            <Button
                                key={page.title}
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

                    {/* 외부 링크 */}
                    <Box sx={{ flexGrow: 0 }}>
                        <IconButton
                            component="a"
                            href="https://github.com/qlazzarus"
                            target="_blank"
                            rel="noopener noreferrer"
                            color="inherit"
                        >
                            <GitHub />
                        </IconButton>
                        <IconButton
                            component="a"
                            href="https://www.linkedin.com/in/yeppyshiba/"
                            target="_blank"
                            rel="noopener noreferrer"
                            color="inherit"
                        >
                            <LinkedIn />
                        </IconButton>
                        <IconButton onClick={toggleMode} color="inherit">
                            {mode && mode === 'light' ? <DarkMode /> : <LightMode />}
                        </IconButton>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default ResponsiveAppBar;
