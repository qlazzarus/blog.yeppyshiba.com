import React, { FunctionComponent } from 'react';
import { Box, Container, Stack, Text, useColorModeValue } from '@chakra-ui/react';

interface FooterProps {
  siteMetadata: {
    [index: string]: any;
  };
}

const Footer: FunctionComponent<FooterProps> = ({ siteMetadata }) => {
  const since = 2022;
  const year = new Date().getFullYear();
  const displayYear = since === year ? since : `${since}-${year}`;

  return (
    <Box bg={useColorModeValue('gray.50', 'gray.900')} color={useColorModeValue('gray.700', 'gray.200')}>
      <Container
        as={Stack}
        maxW={'6xl'}
        py={4}
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <Text>
          &copy; {displayYear} {siteMetadata.title}. All rights reserved
        </Text>
      </Container>
    </Box>
  );
};

export default Footer;
