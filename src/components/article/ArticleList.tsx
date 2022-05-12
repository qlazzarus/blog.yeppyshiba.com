import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import { Box, Button, Container, Heading, HStack, Image, Link, SpaceProps, Stack, Tag, Text, useColorModeValue } from '@chakra-ui/react';
import { kebabCase } from 'lodash';
import { MathUtil } from '@/utils';
import { ArticleListItemType } from '@/types';

const defaultImages = [
  '/images/cards/pexels-olia-danilevich-4974915.jpg',
  '/images/header/wp7317693-jeju-wallpapers.jpg'
];

interface ArticleListProps {
  entries: ArticleListItemType[];
}

interface ArticleEntryProps {
  entry: ArticleListItemType;
}

interface TagProps {
  tags: Array<string>;
  marginTop?: SpaceProps['marginTop']
}

interface AuthorProps {
  category?: string;
  date: Date;
}

const Tags: FunctionComponent<TagProps> = ({ tags, marginTop }) => {
 return (
  <HStack 
    spacing={2}
    marginTop={marginTop}
  >
    {tags.map(tag => {
      return (
        <Tag size={'md'} variant="solid" key={tag}>
          {tag}
        </Tag>
      );
    })}
  </HStack>
 );  
}

const ArticleEntry: FunctionComponent<ArticleEntryProps> = ({ entry: { slug, frontmatter: { category, date, summary, image, title, tags } } }) => {
  const articleImage = image || MathUtil.getRandomValue(defaultImages);
  const dateObj = new Date(date);

  return (
    <Box
      maxW={'445px'}
      w={'full'}
      bg={useColorModeValue('white', 'gray.900')}
      boxShadow={'2xl'}
      rounded={'md'}
      p={6}
      overflow={'hidden'}
    >
      <Box
        bg={'gray.100'}
        mt={-6}
        mx={-6}
        mb={6}
        pos={'relative'}>
        <Image 
          src={articleImage} 
          alt={title} 
        />
      </Box>
      <Stack>
        {category && (
          <Text
            color={'green.500'}
            textTransform={'uppercase'}
            fontWeight={800}
            fontSize={'sm'}
            letterSpacing={1.1}
            as={GatsbyLink}
            to={`/category/${kebabCase(category)}`}>
            {category}
          </Text>
        )}
        <Heading
          color={useColorModeValue('gray.700', 'white')}
          fontSize={'2xl'}
          fontFamily={'body'}>
          {title}
        </Heading>
        <Text color={'gray.500'}>
          {summary}
        </Text>
      </Stack>
      <Stack 
        mt={6}
        direction={'row'}
        align={'center'}>
        <Stack 
          width={'100%'}
          direction={'row'}
          spacing={0}
          fontSize={'sm'}
          align={'center'}
          justifyContent={'space-between'}>
          <Text color={'gray.500'}>
            {dateObj.toLocaleDateString()}
          </Text>
          <Stack 
            direction={'row'}
            spacing={2}>
            {tags.map(tag => (
              <Tag 
                size={'md'} 
                variant="solid" 
                key={tag}
                as={GatsbyLink}
                to={`/tag/${kebabCase(tag)}`}>
                {tag}
              </Tag>
            ))}
          </Stack>
        </Stack>
      </Stack>
      <Button
        mt={10}
        w={'full'}
        bg={'green.400'}
        color={'white'}
        rounded={'xl'}
        boxShadow={'0 5px 20px 0px rgb(72 187 120 / 43%)'}
        _hover={{
          bg: 'green.500',
        }}
        _focus={{
          bg: 'green.500',
        }}
        as={GatsbyLink}
        to={`/article/${slug}`}>
        Read more
      </Button>
    </Box>
  );
};

const ArticleList: FunctionComponent<ArticleListProps> = ({ entries }) => {
  return (
    <Container 
      maxW={'7xl'} 
      p={"12"}>
      {entries.map((entry) => (
        <ArticleEntry entry={entry} key={entry.id} />
      ))}
    </Container>
  );
};

export default ArticleList;
