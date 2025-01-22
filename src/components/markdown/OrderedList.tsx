import { List, ListProps } from '@mui/material';
import React from 'react';

const OrderedList = (props: ListProps) => (
    <List
        component='ol'
        sx={{
            listStyleType: 'decimal', // 번호 스타일
            pl: 3,
            '& > li': {
                display: 'list-item', // 리스트 항목 스타일 유지
            },
        }}
        {...props}
    />
);

export default OrderedList;
