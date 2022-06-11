import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import { Box, Flex, Heading, keyframes, Tag, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { slugify } from 'transliteration';
import { MathUtil } from '@/utils';

const defaultImages = ['/images/header/wp7317693-jeju-wallpapers.jpg'];
const allowedChars = 'a-zA-Z0-9';

const shrink = keyframes`
  from { transform: scale(1.0); }
  to { transform: scale(1.1); }
`;

interface ArticleHeaderProps {
  title: string;
  date?: string;
  image?: string;
  category?: string;
  tags?: string[];
}

const ArticleHeader: FunctionComponent<ArticleHeaderProps> = ({ title, image, category, date, tags }) => {
  const headerImage = image || MathUtil.getRandomValue(defaultImages);
  const dateObj = date && new Date(date);

  return (
    <Box 
      w={'full'} 
      h={'100vh'}
      overflow={'hidden'}
    >
      <Flex
        w={'full'}
        h={'full'}
        position={'relative'}
        justify={'center'}
        _after={{
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundImage: `url('${headerImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          zIndex: -1,
          animation: `${shrink} 30s infinite alternate`
        }}
      >
        <VStack maxW={'5xl'} w={'full'} px={'12'} justify={'center'} alignItems={'flex-start'}>
          {category && (
            <Text
              color={useColorModeValue('gray.700', 'gray.700')}
              textTransform={'uppercase'}
              textShadow={'0.125rem 0.125rem white'}
              fontWeight={800}
              fontSize={'md'}
              letterSpacing={1.1}
              as={GatsbyLink}
              to={`/category/${slugify(category, { allowedChars })}`}
            >
              {category}
            </Text>
          )}
          <Heading
            color={useColorModeValue('gray.900', 'gray.900')}
            as={'h1'}
            size={'3xl'}
            lineHeight={'125%'}
            textShadow={'0.25rem 0.25rem white'}
          >
            {title}
          </Heading>
          {dateObj && (
            <Text
              color={useColorModeValue('gray.700', 'gray.700')}
              fontSize={'xl'}
              fontStyle={'italic'}
              textShadow={'0.125rem 0.125rem white'}
            >
              {dateObj.toLocaleDateString()}
            </Text>
          )}
          {tags && (
            <Box overflow={'hidden'}>
              {tags.map((tag) => (
                <Tag
                  display={'block'}
                  float={'left'}
                  key={tag}
                  bgColor={'teal'}
                  variant={'solid'}
                  as={GatsbyLink}
                  to={`/tag/${slugify(tag, { allowedChars })}`}
                  pt={1}
                  m={1}
                >
                  {tag}
                </Tag>
              ))}
            </Box>
          )}
        </VStack>
      </Flex>
    </Box>
  );
};

export default ArticleHeader;
