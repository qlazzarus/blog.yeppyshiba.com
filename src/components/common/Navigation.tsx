import React, { FunctionComponent } from 'react';
import { Link } from 'gatsby';
import { Box, Flex, Text, useColorModeValue, useBreakpointValue } from '@chakra-ui/react';

interface NavigationProps {
  siteMetadata: {
    [index: string]: any;
  };
}

const Navigation: FunctionComponent<NavigationProps> = ({ siteMetadata }) => {
  return (
    <Box>
      <Flex
        bg={useColorModeValue('white', 'gray.800')}
        color={useColorModeValue('gray.600', 'white')}
        minH={'60px'}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={'solid'}
        borderColor={useColorModeValue('gray.200', 'gray.900')}
        align={'center'}
      >
        <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
          <Text
            textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
            fontFamily={'heading'}
            color={useColorModeValue('gray.800', 'white')}
          >
            <Link to={'/'}>{siteMetadata.title}</Link>
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Navigation;
