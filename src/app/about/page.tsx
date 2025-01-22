import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import RocketIcon from '@mui/icons-material/Rocket';
import {
    Avatar,
    Box,
    Card,
    CardActions,
    CardContent,
    Chip,
    IconButton,
    Link as MuiLink,
    Typography,
} from '@mui/material';
import getConfig from 'next/config';
import React from 'react';

import Footer from '@/components/Footer';
import Jumbotron from '@/components/Jumbotron';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';

// 필요 시 다른 소셜 아이콘들도 import

// Next.js Config 가져오기
const { publicRuntimeConfig } = getConfig();
const { siteMetadata } = publicRuntimeConfig;

export async function generateMetadata() {
    return {
        title: `About ${siteMetadata.author} - ${siteMetadata.title}`,
        description: `Learn more about ${siteMetadata.author}, a full-stack developer with expertise in various technologies like ${siteMetadata.description}.`,
        openGraph: {
            title: `About ${siteMetadata.author}`,
            description: `Discover more about ${siteMetadata.author} and the journey behind ${siteMetadata.title}.`,
            url: `${siteMetadata.siteUrl}/about`,
            images: [
                {
                    url: `${siteMetadata.siteUrl}/images/profile-yeppyshiba.png`,
                    width: 800,
                    height: 800,
                    alt: `${siteMetadata.author}'s profile picture`,
                },
            ],
            type: 'profile',
            profile: {
                firstName: 'Yeppyshiba',
            },
        },
    };
}

const about = () => {
    // 예시 데이터 (정적)
    const name = 'Yeppyshiba';
    const position = 'Full-stack Developer';
    const profileImage = '/images/profile-yeppyshiba.png'; // 자신의 프로필 이미지 (public 폴더 또는 외부 URL)
    const summary = `
    안녕하세요, ${name} 입니다. 주로 웹 개발과 3D 프린팅, 
    그리고 다양한 기술 스택에 관심이 있습니다. 
    이 블로그는 제가 개발하면서 배운 점들을 공유하고, 
    다른 분들과 소통하기 위해 운영하고 있습니다.
  `;
    const skills = [
        'Phaser',
        'Laravel',
        'Spring Boot',
        'NextJS',
        'React',
        'React Native',
        'PHP',
        'TypeScript',
        '3D Printing',
    ];

    const { social } = siteMetadata;

    // 소셜 아이콘 맵핑
    const socialIcons = {
        linkedin: LinkedInIcon,
        github: GitHubIcon,
        instagram: InstagramIcon,
        rocketpunch: RocketIcon,
    };

    return (
        <>
            <ResponsiveAppBar />
            <Jumbotron />
            <Box
                sx={{
                    width: '100%',
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {/* 소개 카드 */}
                <Card
                    sx={{
                        width: '100%',
                        maxWidth: 600,
                        mx: 'auto',
                    }}
                >
                    <CardContent
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                        <Avatar
                            src={profileImage}
                            alt={name}
                            sx={{ width: 120, height: 120, mb: 2 }}
                        />
                        <Typography variant='h5'>{name}</Typography>
                        <Typography variant='subtitle1' color='text.secondary'>
                            {position}
                        </Typography>

                        <Typography
                            variant='body2'
                            sx={{ mt: 2, textAlign: 'center', whiteSpace: 'pre-line' }}
                        >
                            {summary}
                        </Typography>

                        {/* 대표 기술 스택 */}
                        <Box
                            sx={{
                                mt: 2,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                justifyContent: 'center',
                            }}
                        >
                            {skills.map((skill) => (
                                <Chip
                                    key={skill}
                                    label={skill}
                                    color='primary'
                                    variant='outlined'
                                />
                            ))}
                        </Box>
                    </CardContent>

                    {/* CardActions: 소셜 링크 동적 생성 */}
                    <CardActions sx={{ justifyContent: 'center', mb: 2 }}>
                        {Object.entries(social).map(([key, url]) => {
                            const IconComponent = socialIcons[key as keyof typeof socialIcons];
                            if (!IconComponent) return null;

                            return (
                                <IconButton
                                    key={key}
                                    component={MuiLink}
                                    href={url as string}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    aria-label={`${key} profile`}
                                    color='primary'
                                >
                                    <IconComponent />
                                </IconButton>
                            );
                        })}
                    </CardActions>
                </Card>
            </Box>
            <Footer />
        </>
    );
};

export default about;
