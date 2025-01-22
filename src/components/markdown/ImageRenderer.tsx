import { Box, Typography } from '@mui/material';
import Image from 'next/image';
import React, { ImgHTMLAttributes } from 'react';

interface ImageProps {
    src: string;
    alt?: string;
    className?: string;
}

const videos = ['avi', 'mp4', 'mpeg', 'mpg', 'webm'];

/*
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
        
    ),

*/

const ImageRenderer = ({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => {
    const ext = src?.split('.').pop() || '';
    const external = src?.startsWith('http');

    return (
        <Box component={'div'} maxWidth={'100%'} marginX={'auto'}>
            {videos.includes(ext) ? (
                <video
                    controls
                    style={{
                        width: '100%',
                        height: 'auto',
                    }}
                >
                    <source src={src} type={`video/${ext}`} />
                </video>
            ) : (
                <Box
                    component='img'
                    maxWidth='100%'
                    display='block'
                    my={2}
                    mx={'auto'}
                    src={src}
                    alt={alt || ''}
                    // 기본 maxWidth 100%로 설정해, 반응형 이미지
                    {...props}
                />
            )}
            {alt && (
                <Typography variant='caption' component={'p'} align='center' sx={{ marginTop: 1 }}>
                    {alt}
                </Typography>
            )}
        </Box>
    );
    // ({ src, alt, ...props }) => {
    /*
    

    return (
        <figure style={{ margin: 0 }}>
            <Box sx={{ maxWidth: 1000, marginX: 'auto' }}>
                {videos.includes(ext) ? (
                    <video
                        controls
                        style={{
                            width: '100%',
                            height: 'auto',
                        }}
                    >
                        <source src={src} type={`video/${ext}`} />
                    </video>
                ) : (
                    <Box sx={{ position: 'relative', width: '100%', height: 'auto' }}>
                        {external && <Image src={src} alt={alt || ''} width={1000} height={1000} />}
                        {!external && (
                            <Image
                                src={src}
                                alt={alt || ''}
                                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                            />
                        )}
                    </Box>
                )}
            </Box>
           
        </figure>
    );
    */
};

export default ImageRenderer;
