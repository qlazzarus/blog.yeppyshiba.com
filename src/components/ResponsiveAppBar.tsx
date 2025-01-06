'use client';

import { DarkMode, GitHub, LightMode, LinkedIn } from '@mui/icons-material';
import {
    AppBar,
    Box,
    Button,
    Container,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
    useColorScheme,
} from '@mui/material';
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
    const { mode, setMode, systemMode } = useColorScheme();
    const [isScrolled, setIsScrolled] = useState<boolean>(false);

    // 현재 실제로 적용 중인 모드를 계산 (system이면 systemMode 사용)
    const activeMode = mode === 'system' ? systemMode : mode;

    // 클릭 시 'light' ↔ 'dark' 로만 토글하도록 구현
    // (system을 그대로 유지하지 않고, 사용자가 토글하면 직접 'light'나 'dark'로 오버라이드)
    const handleToggle = () => {
        if (activeMode === 'light') {
            setMode('dark');
        } else {
            setMode('light');
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10); // 스크롤이 10px 이상 내려가면 상태 변경
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleOpenNavMenu = (event: any) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    return (
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
                <Toolbar variant='dense' disableGutters>
                    {/* 메뉴 (Mobile) */}
                    <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                        <IconButton
                            size='large'
                            aria-label='menu'
                            aria-controls='menu-appbar'
                            aria-haspopup='true'
                            onClick={handleOpenNavMenu}
                            color='inherit'
                        >
                            <Image
                                src={'/images/akita-inu.png'}
                                alt='Yeppyshiba Blog'
                                width={24}
                                height={24}
                            />
                        </IconButton>
                        <Menu
                            id='menu-appbar'
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
                                <Typography textAlign='center'>
                                    <Link href={'/'} passHref>
                                        {'Blog'}
                                    </Link>
                                </Typography>
                            </MenuItem>
                            {pages.map((page) => (
                                <MenuItem key={page.title} onClick={handleCloseNavMenu}>
                                    <Typography textAlign='center'>
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
                                    alt='Yeppyshiba Blog'
                                    width={24}
                                    height={24}
                                />
                                <Typography ml={1}>Yeppyshiba Blog</Typography>
                            </Link>
                        </Typography>
                    </Box>

                    {/* 메뉴 (Desktop) */}
                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                        {pages.map((page) => (
                            <Button
                                key={page.title}
                                size={'small'}
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
                        <IconButton
                            onClick={handleToggle}
                        >
                            {activeMode === 'light' ? <DarkMode /> : <LightMode />}
                        </IconButton>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default ResponsiveAppBar;
