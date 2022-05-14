import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import {
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Heading,
  HStack,
  Image,
  SpaceProps,
  Stack,
  Tag,
  Text,
  useColorModeValue,
  VStack
} from '@chakra-ui/react';
import { kebabCase } from 'lodash';
import { MathUtil } from '@/utils';
import { ArticleListItemType } from '@/types';

const defaultImages = [
  '/images/cards/pexels-olia-danilevich-4974915.jpg',
  '/images/header/wp7317693-jeju-wallpapers.jpg',
];

interface ArticleListProps {
  entries: ArticleListItemType[];
}

interface ArticleEntryProps {
  entry: ArticleListItemType;
}

interface TagProps {
  tags: Array<string>;
  marginTop?: SpaceProps['marginTop'];
}

interface AuthorProps {
  category?: string;
  date: Date;
}

const Tags: FunctionComponent<TagProps> = ({ tags, marginTop }) => {
  return (
    <HStack spacing={2} marginTop={marginTop}>
      {tags.map((tag) => {
        return (
          <Tag size={'md'} variant="solid" key={tag}>
            {tag}
          </Tag>
        );
      })}
    </HStack>
  );
};

const ArticleEntry: FunctionComponent<ArticleEntryProps> = ({
  entry: {
    slug,
    frontmatter: { category, date, summary, image, title, tags },
  },
}) => {
  const articleImage = image || MathUtil.getRandomValue(defaultImages);
  const dateObj = new Date(date);

  return (
    <Flex
      bgColor={useColorModeValue('white', 'gray.900')}
      borderRadius={'md'}
      boxShadow={'2xl'}
      flexDir={{ base: 'column', md: 'row' }}
      maxW={{ base: 'sm', md: 'full' }}
      overflow={'auto'}
      w={'full'}
    >
      <Image
        alt={title}
        maxH={'xs'}
        maxW={{ md: 'sm' }}
        objectFit={'cover'}
        objectPosition={'center'}
        src={articleImage}
        w={'full'}
      />
      <Stack p={4} w={'full'}>
        <Heading as="h3" size="md" color={useColorModeValue('gray.700', 'white')}>
          {title}
        </Heading>
        {category && (
          <Text
            color={'green.500'}
            textTransform={'uppercase'}
            fontWeight={800}
            fontSize={'sm'}
            letterSpacing={1.1}
            as={GatsbyLink}
            to={`/category/${kebabCase(category)}`}
          >
            {category}
          </Text>
        )}
        <Text fontSize={'sm'} fontWeight={'bold'}>
          {dateObj.toLocaleDateString()}
        </Text>
        <Divider />
        <Text flexGrow={1} fontSize={'sm'}>
          {summary}
        </Text>
        <HStack justify={'flex-end'} py={4}>
          {tags.map((tag) => (
            <Tag size={'md'} variant="solid" key={tag} as={GatsbyLink} to={`/tag/${kebabCase(tag)}`}>
              {tag}
            </Tag>
          ))}
        </HStack>
        <HStack justify={'flex-end'}>
          <Button
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
            to={`/article/${slug}`}
          >
            Read more
          </Button>
        </HStack>
      </Stack>
    </Flex>
  );
};

const ArticleList: FunctionComponent<ArticleListProps> = ({ entries }) => {
  return (
    <Container as={VStack} maxW={'6xl'} px={[4, 8]} py={12} spacing={[8, 12]}>
      <VStack spacing={[2, 4]} w={'full'}>
        {entries.map((entry) => (
          <ArticleEntry entry={entry} key={entry.id} />
        ))}
      </VStack>
    </Container>
  );
};

export default ArticleList;
