'use client';

import { Pagination, PaginationItem } from '@mui/material';
import Link from 'next/link';

const PaginationContainer = ({
    page,
    linkPrefix,
    totalPages,
}: {
    page: number;
    linkPrefix: string;
    totalPages: number;
}) => {
    return (
        <Pagination
            count={totalPages}
            page={page}
            sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}
            siblingCount={5}
            renderItem={(item) => (
                <PaginationItem component={Link} href={`${linkPrefix}${item.page}`} {...item} />
            )}
        />
    );
};

export default PaginationContainer;
