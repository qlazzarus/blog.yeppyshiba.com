import React, { FunctionComponent } from 'react';
import { Badge, Box, Button, Flex, useClipboard } from '@chakra-ui/react';
import Highlight, { defaultProps, Language } from 'prism-react-renderer';
import dracula from 'prism-react-renderer/themes/dracula';

type CodeBlockProps = {
  children: string;
  className: string;
};

const CodeBlock: FunctionComponent<CodeBlockProps> = (props) => {
  const language = props.className?.replace('language-', '') as Language;
  const { hasCopied, onCopy } = useClipboard(props.children);
  return (
    <Highlight {...defaultProps} code={props.children} language={language} theme={dracula}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <Box
          as="pre"
          className={className}
          style={style}
          padding={2}
          overflowX={'auto'}
          marginY={'4'}
          textAlign={'left'}
          fontSize={'sm'}
          borderRadius={'base'}
        >
          <Flex justifyContent="space-between" alignContent="center">
            <Box as="div" marginLeft={1}>
              <Badge variant="outline" colorScheme="teal">
                {language}
              </Badge>
            </Box>
            <Button colorScheme="teal" size="xs" onClick={onCopy}>
              {hasCopied ? 'Copied' : 'Copy'}
            </Button>
          </Flex>

          {tokens
              .filter((l, i) => i < tokens.length - 1)
              .map((line, index) => (
                <Box
                  key={index}
                  {...getLineProps({ line, key: index })}
                  display="table-row"
                >
                  <Box
                    as="span"
                    display="table-cell"
                    textAlign="right"
                    paddingRight={4}
                    userSelect="none"
                    opacity={0.5}
                  >
                    {index + 1}
                  </Box>
                  <Box as="span" display="table-cell">
                    {line.map((token, key) => (
                      <Box
                        as="span"
                        key={key}
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
