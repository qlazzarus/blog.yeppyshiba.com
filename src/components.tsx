import {
    Box,
    BoxProps,
    Divider,
    DividerProps,
    List,
    ListItem,
    ListItemProps,
    ListProps,
    Link as MuiLink,
    LinkProps as MuiLinkProps,
    Paper,
    PaperProps,
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

export default {
    // 텍스트 관련
    p: (props: TypographyProps) => <Typography variant='body1' my={3} {...props} />,
    h1: (props: TypographyProps) => <Typography variant='h1' my={3} {...props} />,
    h2: (props: TypographyProps) => <Typography variant='h2' my={3} {...props} />,
    h3: (props: TypographyProps) => <Typography variant='h3' my={3} {...props} />,
    h4: (props: TypographyProps) => <Typography variant='h4' my={3} {...props} />,
    h5: (props: TypographyProps) => <Typography variant='h5' my={3} {...props} />,
    h6: (props: TypographyProps) => <Typography variant='h6' my={3} {...props} />,

    // 리스트
    ul: (props: ListProps) => <List {...props} />,
    ol: (props: ListProps) => <List {...props} />,
    li: (props: ListItemProps) => <ListItem {...props} />,

    // 테이블
    table: (props: TableProps) => <Table {...props} />,
    thead: (props: TableHeadProps) => <TableHead {...props} />,
    tbody: (props: TableBodyProps) => <TableBody {...props} />,
    tr: (props: TableRowProps) => <TableRow {...props} />,

    // 구분선, 블럭 요소
    hr: (props: DividerProps) => <Divider {...props} />,
    pre: (props: PaperProps) => (
        <Paper
            elevation={1}
            sx={{
                p: 2,
                mb: 2,
                backgroundColor: '#f5f5f5',
                overflowX: 'auto',
                fontFamily: 'monospace',
            }}
            {...props}
        />
    ),

    // 링크
    a: (props: MuiLinkProps) => (
        <MuiLink
            {...props}
            // 원하는 스타일 추가
            sx={{ textDecoration: 'underline' }}
            // 외부 링크면 target, rel 처리
            target='_blank'
            rel='noopener noreferrer'
        />
    ),

    // 이미지
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <Box
            component='img'
            maxWidth='100%'
            display='block'
            my={2}
            // 기본 maxWidth 100%로 설정해, 반응형 이미지
            {...props}
        />
    ),

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
    code: (props: React.HTMLAttributes<HTMLElement>) => (
        <Typography
            component='code'
            sx={{
                fontFamily: 'monospace',
                backgroundColor: '#f5f5f5',
                px: 0.5,
                borderRadius: '4px',
            }}
            {...props}
        />
    ),
};
