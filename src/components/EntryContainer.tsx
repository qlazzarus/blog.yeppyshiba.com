import { Box, Chip, Grid2 as Grid, Typography } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { PostData } from '@/libraries/PostManager';

import CardFooter from './CardFooter';
import SyledCard from './StyledCard';
import StyledCardContent from './StyledCardContent';

const EntryContainer = ({ entries }: { entries: PostData[] }) => {
    return (
        <Grid container spacing={2}>
            {entries.map((entry, index) => {
                if (index === 0) console.log(entry);
                return (
                    <Grid size={{ xs: 12, md: 6, xl: 4 }} key={index}>
                        <Link
                            href={`/article/${entry.slug}`}
                            passHref
                            style={{ textDecoration: 'none' }}
                        >
                            <SyledCard variant='outlined'>
                                {/* CardMedia 대신 직접 Image 사용 */}
                                <div
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '16/9',
                                    }}
                                >
                                    <Image
                                        src={(entry.image || entry.embeddedImagesLocal) as string}
                                        alt={entry.title || 'image'}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        sizes='(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw'
                                    />
                                </div>
                                <StyledCardContent>
                                    {entry.category && (
                                        <Typography
                                            gutterBottom
                                            variant='caption'
                                            component={'div'}
                                            sx={{ textTransform: 'capitalize', color: 'inherit' }}
                                        >
                                            {entry.category}
                                        </Typography>
                                    )}

                                    <Typography gutterBottom variant='h6' component={'div'}>
                                        {entry.title}
                                    </Typography>
                                    <Typography gutterBottom variant='body2' color='text.secondary'>
                                        {entry.summary}
                                    </Typography>

                                    {/* 태그 목록 */}
                                    {entry.tags && entry.tags.length > 0 && (
                                        <Box
                                            sx={{
                                                mt: 1,
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 1,
                                            }}
                                        >
                                            {entry.tags.map((tag, index) => (
                                                <Chip
                                                    key={index}
                                                    label={tag}
                                                    clickable
                                                    component='a'
                                                    sx={{ textTransform: 'lowercase' }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </StyledCardContent>
                                <CardFooter date={entry.date} viewCount={entry.viewCount || 0} />
                            </SyledCard>
                        </Link>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default EntryContainer;
