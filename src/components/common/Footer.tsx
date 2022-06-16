import React, { FunctionComponent } from 'react';
import { Box, Container, Link, Stack, Text, useColorModeValue } from '@chakra-ui/react';
import { ThemeEnum } from '@/enums';

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
        maxW={'5xl'}
        py={4}
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <Text>
          &copy; {displayYear} {siteMetadata.title}. All rights reserved.
        </Text>
        <Text>
          <Link
            color={ThemeEnum.LINK_COLOR}
            href={'https://www.flaticon.com/free-icons/akita-inu'}
            isExternal
            title={'akita inu icons'}
          >
            Akita inu icons created by tulpahn - Flaticon
          </Link>
        </Text>
      </Container>
    </Box>
  );
};

export default Footer;
