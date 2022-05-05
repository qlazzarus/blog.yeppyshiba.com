import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import { Flex, Heading, HStack, Tag, Text, VStack, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
import { kebabCase } from 'lodash';
import { MathUtil } from '@/utils';

const defaultImages = ['/images/header/wp7317693-jeju-wallpapers.jpg'];

interface HeaderProps {
  title: string;
  date?: string;
  image?: string;
  summary?: string;
  category?: string;
  tags?: string[];
}

const Header: FunctionComponent<HeaderProps> = ({ title, image, summary, category, date, tags }) => {
  const headerImage = image || MathUtil.getRandomValue(defaultImages);
  const headerHeight = useBreakpointValue({ base: '200px', md: '300px' });
  const dateObj = date && new Date(date);

  return (
    <Flex
      w={'full'}
      minH={headerHeight}
      backgroundImage={`url('${headerImage}')`}
      backgroundSize={'cover'}
      backgroundPosition={'center center'}
    >
      <VStack w={'full'} justify={'center'}>
        <Heading 
          color={useColorModeValue('gray.900', 'gray.900')}
          as={"h1"}
          size={"2xl"}
          >
          {title}
        </Heading>
        {summary && (
          <Heading
            color={useColorModeValue('gray.700', 'gray.700')}
            as={"h2"}
            fontSize={'xl'}>
            {summary}
          </Heading>
        )}
        {category && (
          <Text
            color={useColorModeValue('gray.700', 'gray.700')}
            textTransform={'uppercase'}
            fontWeight={800}
            fontSize={'sm'}
            letterSpacing={1.1}
            as={GatsbyLink}
            to={`/category/${kebabCase(category)}`}>
            {category}
          </Text>
        )}
        {dateObj && (
          <Text 
            color={useColorModeValue('gray.700', 'gray.700')}>
            {dateObj.toLocaleDateString()}
          </Text>
        )}
        {tags && (
          <HStack 
            spacing={2}>
            {tags.map(tag => (
              <Tag 
                size={'md'} 
                variant={"solid"}
                key={tag}
                as={GatsbyLink}
                to={`/tag/${kebabCase(tag)}`}>
                {tag}
              </Tag>
            ))}
        </HStack>
        )}
      </VStack>
    </Flex>
  );
};

export default Header;
