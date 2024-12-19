'use client';

import { Pagination } from '@mui/material';
import { useRouter } from 'next/navigation';

const PaginationContainer = ({
    page,
    linkPrefix,
    totalPages,
}: {
    page: number;
    linkPrefix: string;
    totalPages: number;
}) => {
    const router = useRouter(); // Next.js 라우터

    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        router.push(`${linkPrefix}${value}`); // 페이지 변경 시 링크로 이동
    };

    return (
        <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}
        />
    );
};

export default PaginationContainer;
