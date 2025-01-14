'use client';

import { Box, Button, Chip, useColorScheme } from '@mui/material';
import { Highlight, themes } from 'prism-react-renderer';
import React from 'react';

const CodeBlock = ({ className, children }: React.HTMLAttributes<HTMLElement>) => {
    const { mode, systemMode } = useColorScheme();
    // 현재 실제로 적용 중인 모드를 계산 (system이면 systemMode 사용)
    const activeMode = mode === 'system' ? systemMode : mode;

    const language = className ? className.replace('language-', '') : '';
    const theme = activeMode === 'dark' ? themes.vsDark : themes.vsLight;

    // TODO
    const copied = false;
    const handleCopy = () => {};
    return (
        <Highlight language={language} code={children as string} theme={theme}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <Box
                    component='pre'
                    className={className}
                    // Chakra의 style={style} → MUI에선 sx로 병합
                    sx={{
                        ...style,
                        p: 2,
                        overflowX: 'auto',
                        my: 4,
                        textAlign: 'left',
                        fontSize: '0.875rem', // Chakra "sm" ≈ 14px
                        border: '1px solid',
                        borderColor: 'grey.300',
                        borderRadius: 1,
                    }}
                >
                    {/* 상단에 언어 표시 + 복사 버튼 */}
                    <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
                        {language && (
                            <Chip
                                label={language}
                                variant='outlined'
                                size='small'
                                color='primary'
                            />
                        )}
                        <Button variant='contained' size='small' onClick={handleCopy}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </Box>

                    {/* 코드 라인 렌더링 */}
                    {tokens
                        // prism-react-renderer 마지막 줄이 종종 빈 배열이라 필터링
                        .filter((_, i) => i < tokens.length - 1)
                        .map((line, index) => (
                            <Box
                                key={`line-${index}`}
                                {...getLineProps({ line, key: index })}
                                sx={{ display: 'table-row' }}
                            >
                                {/* 행 번호 */}
                                <Box
                                    component='span'
                                    sx={{
                                        display: 'table-cell',
                                        textAlign: 'right',
                                        pr: 2,
                                        userSelect: 'none',
                                        opacity: 0.5,
                                    }}
                                >
                                    {index + 1}
                                </Box>
                                {/* 코드 내용 */}
                                <Box component='span' sx={{ display: 'table-cell' }}>
                                    {line.map((token, key) => (
                                        <Box
                                            component='span'
                                            key={`token-${index}-${key}`}
                                            {...getTokenProps({ token, key })}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ))}
                </Box>
            )}
        </Highlight>
    );
};

export default CodeBlock;
