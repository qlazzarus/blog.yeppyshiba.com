import React, { FunctionComponent } from 'react';
import { Link } from 'gatsby';
import { Button, Flex, Stack, Text, useColorMode, useColorModeValue, useBreakpointValue } from '@chakra-ui/react';
import { BsSun, BsMoonStarsFill } from 'react-icons/bs';
import { Layout } from '@/constants';

interface NavigationProps {
  siteMetadata: {
    [index: string]: any;
  };
}

const Navigation: FunctionComponent<NavigationProps> = ({ siteMetadata: { title } }) => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Flex
      as={'header'}
      bg={useColorModeValue('white', 'gray.800')}
      color={useColorModeValue('gray.600', 'white')}
      w={'100%'}
      h={Layout.navigationHeight}
      py={{ base: 2 }}
      px={{ base: 4 }}
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.900')}
      align={'center'}
      position={'fixed'}
    >
      <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
        <Text
          textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
          fontFamily={'heading'}
          color={useColorModeValue('gray.800', 'white')}
        >
          <Link to={'/'}>{title}</Link>
        </Text>
      </Flex>

      <Stack
        flex={{ base: 1, md: 0 }}
        justify={'flex-end'}
        direction={'row'}
        spacing={6}>
        <Button
          aria-label="Toggle Color Mode"
          onClick={toggleColorMode}
          _focus={{ boxShadow: 'none' }}
          w="fit-content">
            {colorMode === 'light' ? <BsMoonStarsFill /> : <BsSun />}
        </Button>
      </Stack>
    </Flex>
  );
};

export default Navigation;