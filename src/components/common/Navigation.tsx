import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import {
  Box,
  BoxProps,
  Button,
  Drawer,
  DrawerContent,
  Flex,
  Stack,
  Text,
  useColorMode,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure,
  IconButton,
  Link as ChakraLink,
  CloseButton,
} from '@chakra-ui/react';
import { BsSun, BsMoonStarsFill } from 'react-icons/bs';
import { GiHamburgerMenu } from 'react-icons/gi';
import { GrClose } from 'react-icons/gr';
import { Layout } from '@/constants';

interface NavigationProps {
  siteMetadata: {
    [index: string]: any;
  };
}

interface MobileMenuProps extends BoxProps {
  title: string;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  link: string;
}

const MenuItems: Array<MenuItem> = [
  {
    label: 'About',
    link: '/about/',
  },
  {
    label: 'Blog',
    link: '/page/',
  },
  {
    label: 'Review',
    link: '/category/review/',
  },
  {
    label: 'Projects',
    link: '/category/project/',
  },
  {
    label: 'Map',
    link: '/map/',
  },
];

const DesktopMenu: FunctionComponent = () => {
  const linkColor = useColorModeValue('gray.600', 'gray.200');
  const hoverColor = useColorModeValue('gray.800', 'white');

  return (
    <Stack direction={'row'} spacing={4}>
      {MenuItems.map((entry) => (
        <Box key={entry.label}>
          <ChakraLink
            p={2}
            to={entry.link}
            as={GatsbyLink}
            fontSize={'sm'}
            fontWeight={500}
            color={linkColor}
            _hover={{
              textDecoration: 'none',
              color: hoverColor,
            }}
          >
            {entry.label}
          </ChakraLink>
        </Box>
      ))}
    </Stack>
  );
};

const MobileMenu: FunctionComponent<MobileMenuProps> = ({ title, onClose, ...rest }) => {
  return (
    <Box
      bg={useColorModeValue('white', 'gray.900')}
      borderRight={'1px'}
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos={'fixed'}
      h={'full'}
      {...rest}
    >
      <Flex h={20} alignItems={'center'} mx={8} justifyContent={'space-between'}>
        <Text fontSize={'2xl'} fontWeight={'bold'}>
          <GatsbyLink to={'/'}>{title}</GatsbyLink>
        </Text>
        <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
      </Flex>
      {MenuItems.map((entry) => (
        <Flex
          key={entry.label}
          align={'center'}
          p={4}
          mx={4}
          borderRadius={'lg'}
          to={entry.link}
          as={GatsbyLink}
          _hover={{
            textDecoration: 'none',
          }}
        >
          <Text fontWeight={600} color={useColorModeValue('gray.600', 'gray.200')}>
            {entry.label}
          </Text>
        </Flex>
      ))}
    </Box>
  );
};

const Navigation: FunctionComponent<NavigationProps> = ({ siteMetadata: { title } }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onClose, onToggle } = useDisclosure();

  return (
    <>
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
        zIndex={'docked'}
      >
        <Flex flex={{ base: 1, md: 'auto' }} ml={{ base: -2 }} display={{ base: 'flex', md: 'none' }}>
          <IconButton
            onClick={onToggle}
            icon={isOpen ? <GrClose /> : <GiHamburgerMenu />}
            variant={'ghost'}
            aria-label={'Toggle Navigation'}
          />
        </Flex>

        <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
          <Text
            textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
            fontFamily={'heading'}
            color={useColorModeValue('gray.800', 'white')}
          >
            <GatsbyLink to={'/'}>{title}</GatsbyLink>
          </Text>

          <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
            <DesktopMenu />
          </Flex>
        </Flex>

        <Stack flex={{ base: 1, md: 0 }} justify={'flex-end'} direction={'row'} spacing={6}>
          <Button
            aria-label="Toggle Color Mode"
            onClick={toggleColorMode}
            _focus={{ boxShadow: 'none' }}
            w="fit-content"
          >
            {colorMode === 'light' ? <BsMoonStarsFill /> : <BsSun />}
          </Button>
        </Stack>
      </Flex>

      <Drawer
        autoFocus={false}
        blockScrollOnMount={true}
        closeOnEsc={true}
        closeOnOverlayClick={true}
        isOpen={isOpen}
        onClose={onClose}
        placement={'left'}
        returnFocusOnClose={false}
        size={'xs'}
      >
        <DrawerContent>
          <MobileMenu onClose={onClose} title={title} />
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default Navigation;
