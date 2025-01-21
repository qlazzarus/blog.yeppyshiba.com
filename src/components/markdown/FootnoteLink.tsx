'use client';

import { Link, LinkProps } from '@mui/material';
import React, { useState } from 'react';

import FootnoteModal from './FootnoteModal';

const FootnoteLink = ({ href, children, ...props }: LinkProps) => {
    const [open, setOpen] = useState(false);

    // href="#fn1" 형태일 테니, footnote id = 'fn1'
    // 보통 href가 #fn1 이면 footnoteId는 fn1
    const footnoteId = href?.replace(/^#/, '') || '';

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // a 태그의 기본 스크롤 이동 막기
        e.preventDefault();
        // 모달 열기
        setOpen(true);
    };

    return (
        <>
            <Link onClick={handleClick} color='primary' {...props}>
                {children}
            </Link>
            {/* 클릭 시 표시할 모달 */}
            <FootnoteModal open={open} onClose={() => setOpen(false)} footnoteId={footnoteId} />
        </>
    );
};

export default FootnoteLink;
