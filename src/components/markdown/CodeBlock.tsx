'use client';

import { Box, Button, Chip, useColorScheme } from '@mui/material';
import { Highlight, themes } from 'prism-react-renderer';
import React, { useState } from 'react';

const CodeBlock = ({ className, children }: React.HTMLAttributes<HTMLElement>) => {
    const { mode, systemMode } = useColorScheme();
    // 현재 실제로 적용 중인 모드를 계산 (system이면 systemMode 사용)
    const activeMode = mode === 'system' ? systemMode : mode;

    const language = className ? className.replace('language-', '') : '';
    const theme = activeMode === 'dark' ? themes.vsDark : themes.vsLight;

    // 복사 상태 관리
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!children) return;

        // 클립보드 복사
        navigator.clipboard.writeText(children as string).then(() => {
            setCopied(true);

            // 2초 후에 'Copied' 상태 초기화
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <Box
            sx={{
                position: 'relative', // 상단 바 고정
                my: 4,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
            }}
        >
            {/* 상단 바 */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                }}
            >
                <Chip
                    label={language || 'Plain Text'}
                    variant='outlined'
                    size='small'
                    color='primary'
                />
                <Button
                    variant='contained'
                    size='small'
                    onClick={handleCopy}
                    sx={{
                        transition: 'background-color 0.3s, transform 0.3s',
                        backgroundColor: copied ? 'success.main' : 'primary.main',
                        transform: copied ? 'scale(1.1)' : 'scale(1)',
                    }}
                >
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </Box>

            {/* 코드 내용 */}
            <Box
                component='pre'
                sx={{
                    p: 2,
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    textAlign: 'left',
                    m: 0,
                }}
            >
                <Highlight language={language} code={children as string} theme={theme}>
                    {({ tokens, getLineProps, getTokenProps }) =>
                        tokens
                            .filter((_, i) => i < tokens.length - 1) // 빈 라인 필터링
                            .map((line, i) => (
                                <Box
                                    key={`line-${i}`}
                                    {...getLineProps({ line })}
                                    sx={{ display: 'table-row' }}
                                >
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
                                        {i + 1}
                                    </Box>
                                    <Box component='span' sx={{ display: 'table-cell' }}>
                                        {line.map((token, key) => (
                                            <Box
                                                component='span'
                                                key={`token-${i}-${key}`}
                                                {...getTokenProps({ token })}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            ))
                    }
                </Highlight>
            </Box>
        </Box>
    );
};

export default CodeBlock;
