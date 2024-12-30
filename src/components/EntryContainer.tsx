import { Card, CardMedia, Grid2 as Grid, styled } from '@mui/material';
import Image from 'next/image';
import React from 'react';

import { PostData } from '@/libraries/PostManager';

import SyledCard from './StyledCard';

const EntryContainer = ({ entries }: { entries: PostData[] }) => {
    return (
        <Grid container spacing={2}>
            {entries.map((entry, index) => {
                if (index === 0) console.log(entry);
                return (
                    <Grid size={{ xs: 12, md: 6, xl: 4 }} key={index}>
                        <SyledCard variant="outlined">
                            {/* CardMedia 대신 직접 Image 사용 */}
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                                <Image
                                    src={(entry.image || entry.embeddedImagesLocal) as string}
                                    alt={entry.title || 'image'}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                                />
                            </div>
                        </SyledCard>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default EntryContainer;
