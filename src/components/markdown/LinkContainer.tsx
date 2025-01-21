import { Link as MaterialLink, LinkProps as MaterialLinkProps } from '@mui/material';
import NextLink from 'next/link';
import React from 'react';

import FootnoteLink from './FootnoteLink';

// MaterialLinkProps를 상속(혹은 & 교차)하며, data-footnote-ref 속성도 허용
interface ExtendedLinkProps extends MaterialLinkProps {
    'data-footnote-ref'?: boolean;
}

const LinkContainer = (props: ExtendedLinkProps) => {
    const { children, href, className } = props;
    // 외부 링크( http://, https:// 등 )
    const isExternal = /^([a-zA-Z]{2,20}):\/\/.+/.test(href || '');
    // 앵커(#) 링크
    const isAnchor = (href || '').startsWith('#');

    // footnote label
    const isFootnote = props['data-footnote-ref'];

    // footnote-backref 처리: 렌더링하지 않음
    if (className === 'data-footnote-backref') {
        return null;
    }

    // 앵커 링크(#)는 페이지 내 스크롤 이동용
    if (isAnchor && !isFootnote) {
        return (
            <MaterialLink href={href} color='primary' {...props}>
                {children}
            </MaterialLink>
        );
    }

    if (isAnchor && isFootnote) {
        return <FootnoteLink {...props} />;
    }

    // 내부 링크: Next.js Link 사용
    if (!isExternal) {
        return (
            <NextLink href={href || ''} passHref legacyBehavior>
                <MaterialLink color='primary'>{children}</MaterialLink>
            </NextLink>
        );
    }

    // 외부 링크
    return (
        <MaterialLink
            href={href}
            color='primary'
            target='_blank'
            rel='noopener noreferrer'
            {...props}
        >
            {children}
        </MaterialLink>
    );
};

export default LinkContainer;
