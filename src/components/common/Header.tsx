import React, { FunctionComponent } from 'react';
import { Flex, Heading, VStack, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
import { MathUtil } from '@/utils';

const defaultImages = ['/images/header/wp7317693-jeju-wallpapers.jpg'];

interface HeaderProps {
  title: string;
  image?: string;
}

const Header: FunctionComponent<HeaderProps> = ({ title, image }) => {
  const headerImage = image || MathUtil.getRandomValue(defaultImages);
  const headerHeight = useBreakpointValue({ base: '200px', md: '300px' });
  // https://www.gatsbyjs.com/docs/working-with-images-in-markdown/

  return (
    <Flex
      w={'full'}
      h={headerHeight}
      backgroundImage={`url('${headerImage}')`}
      backgroundSize={'cover'}
      backgroundPosition={'center center'}
    >
      <VStack w={'full'} justify={'center'}>
        <Heading as="h1" size="2xl" color={useColorModeValue('gray.900', 'gray.900')}>
          {title}
        </Heading>
      </VStack>
    </Flex>
  );
};

export default Header;
