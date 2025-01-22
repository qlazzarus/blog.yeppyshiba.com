import { List, ListProps } from '@mui/material';
import React from 'react';

const UnOrderedList = (props: ListProps) => (
    <List
        component='ul'
        sx={{
            listStyle: 'disc',
            pl: 3,
            '& > li': {
                display: 'list-item', // 리스트 항목 스타일 유지
            },
        }}
        {...props}
    />
);

export default UnOrderedList;
