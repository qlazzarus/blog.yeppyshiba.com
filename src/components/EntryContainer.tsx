import { Grid2 as Grid } from '@mui/material';
import Link from 'next/link';
import React from 'react';

import { PostData } from '@/libraries/PostManager';

const EntryContainer = ({ entries }: { entries: PostData[] }) => {
    return <Grid container spacing={2}></Grid>;
};

export default EntryContainer;
