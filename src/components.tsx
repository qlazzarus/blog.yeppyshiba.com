import {
    Box,
    BoxProps,
    Divider,
    DividerProps,
    ListItem,
    ListItemProps,
    Table,
    TableBody,
    TableBodyProps,
    TableHead,
    TableHeadProps,
    TableProps,
    TableRow,
    TableRowProps,
    Typography,
    TypographyProps,
} from '@mui/material';
import { HTMLAttributes } from 'react';

import CodeBlock from '@/components/markdown/CodeBlock';
import ImageRenderer from '@/components/markdown/ImageRenderer';
import LinkContainer from '@/components/markdown/LinkContainer';

import FootnoteSection from './components/markdown/FootnoteSection';
import OrderedList from './components/markdown/OrderedList';
import UnOrderedList from './components/markdown/UnOrderedList';

export default {
    // 텍스트 관련
    p: ({ children }: TypographyProps) => {
        if (typeof children === 'object') {
            return (
                <Box my={4} component={'div'}>
                    {children}
                </Box>
            );
        }

        return <Typography my={4}>{children}</Typography>;
    },
    h1: (props: TypographyProps) => <Typography variant='h1' my={3} {...props} />,
    h2: (props: TypographyProps) => <Typography variant='h2' my={3} {...props} />,
    h3: (props: TypographyProps) => <Typography variant='h3' my={3} {...props} />,
    h4: (props: TypographyProps) => <Typography variant='h4' my={3} {...props} />,
    h5: (props: TypographyProps) => <Typography variant='h5' my={3} {...props} />,
    h6: (props: TypographyProps) => <Typography variant='h6' my={3} {...props} />,

    // 구분선, 블럭 요소
    hr: (props: DividerProps) => <Divider {...props} />,

    // 블록 인용문
    blockquote: (props: BoxProps) => (
        <Box
            component='blockquote'
            sx={{
                borderLeft: '4px solid #ccc',
                pl: 2,
                ml: 0,
                my: 2,
                color: 'text.secondary',
            }}
            {...props}
        />
    ),

    // 인라인 code
    code: CodeBlock,

    a: LinkContainer,

    // 리스트
    ol: OrderedList,
    ul: UnOrderedList,

    li: (props: ListItemProps) => <ListItem {...props} />,

    // 테이블
    table: (props: TableProps) => <Table {...props} />,
    thead: (props: TableHeadProps) => <TableHead {...props} />,
    tbody: (props: TableBodyProps) => <TableBody {...props} />,
    tr: (props: TableRowProps) => <TableRow {...props} />,

    em: (props: TypographyProps) => (
        <Typography component={'span'} {...props} sx={{ fontStyle: 'italic' }} />
    ),
    delete: (props: TypographyProps) => (
        <Typography component={'span'} {...props} sx={{ textDecoration: 'line-through' }} />
    ),
    inlineCode: (props: TypographyProps) => (
        <Typography component={'kbd'} {...props} sx={{ fontFamily: 'monospace' }} />
    ),

    // 이미지
    img: ImageRenderer,

    section: ({ className, children }: HTMLAttributes<HTMLElement>) => {
        if (className === 'footnotes') {
            return <FootnoteSection>{children}</FootnoteSection>;
        }

        return <>{children}</>;
    },
};
