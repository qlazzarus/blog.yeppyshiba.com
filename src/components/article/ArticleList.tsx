import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink, navigate } from 'gatsby';
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import {
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Heading,
  HStack,
  Image,
  Stack,
  Tag,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { kebabCase } from 'lodash';
import moment from 'moment';
import { MathUtil } from '@/utils';
import { ArticleListItemType } from '@/types';

const defaultImages = ['/images/cards/pexels-olia-danilevich-4974915.jpg'];

const ArticleImage: FunctionComponent<{ entry: ArticleListItemType }> = ({
  entry: {
    slug,
    frontmatter: { image, embeddedImagesLocal, title },
  },
}) => {
  const gatsbyImage = embeddedImagesLocal && getImage(embeddedImagesLocal.childImageSharp.gatsbyImageData);

  if (gatsbyImage) {
    return (
      <GatsbyImage
        alt={title}
        image={gatsbyImage}
        onClick={() => navigate(`/article/${slug}`)}
        objectFit={'cover'}
        objectPosition={'center'}
        style={{
          cursor: 'pointer',
          width: '100%',
          height: '100%',
        }}
      />
    );
  }

  const articleImage = image || MathUtil.getRandomValue(defaultImages);

  return (
    <Image
      alt={title}
      src={articleImage}
      objectFit={'cover'}
      objectPosition={'center'}
      width={'full'}
      height={'full'}
      onClick={() => navigate(`/article/${slug}`)}
      cursor={'pointer'}
      loading={'lazy'}
    />
  );
};

const ArticleEntry: FunctionComponent<{ entry: ArticleListItemType }> = ({ entry }) => {
  const { slug, frontmatter: { category, date, summary, title, tags } } = entry;

  return (
    <Box
      py={4}
      w={'full'}
      transition={'linear 0.5s'}
      _hover={{
        transform: 'scale(1.025);',
      }}
    >
      <Flex
        bgColor={useColorModeValue('white', 'gray.900')}
        borderRadius={'md'}
        boxShadow={'2xl'}
        flexDir={{ base: 'column', md: 'row' }}
        overflow={'auto'}
        w={'full'}
      >
        <Box maxH={{ base: 'xs' }} maxW={{ md: 'xs' }} overflow={'hidden'}>
          <ArticleImage entry={entry} />
        </Box>
        <Stack p={4} w={'full'}>
          <Heading as="h3" size="md" color={useColorModeValue('gray.700', 'white')}>
            <GatsbyLink to={`/article/${slug}`}>{title}</GatsbyLink>
          </Heading>
          {category && (
            <Text
              color={'green.500'}
              textTransform={'uppercase'}
              fontWeight={800}
              fontSize={'sm'}
              letterSpacing={1.1}
              as={'span'}
            >
              <GatsbyLink to={`/category/${kebabCase(category)}`}>{category}</GatsbyLink>
            </Text>
          )}
          {date && (
            <Text fontSize={'sm'} fontWeight={'bold'} title={date}>
              {moment(date).fromNow()}
            </Text>
          )}
          <Divider />
          <Text flexGrow={1} fontSize={'sm'}>
            {summary}
          </Text>
          <Box overflow={'hidden'}>
            {tags &&
              Array.isArray(tags) &&
              tags.map((tag) => (
                <Tag
                  display={'block'}
                  float={'left'}
                  key={tag}
                  bgColor={'teal'}
                  variant={'solid'}
                  as={GatsbyLink}
                  to={`/tag/${kebabCase(tag)}`}
                  pt={1}
                  m={1}
                >
                  {tag}
                </Tag>
              ))}
          </Box>
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
    </Box>
  );
};

const ArticleList: FunctionComponent<{
  entries: ArticleListItemType[];
}> = ({ entries }) => {
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
