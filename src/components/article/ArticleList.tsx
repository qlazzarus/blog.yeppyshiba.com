import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import { Box, Container, Heading, HStack, Link, SpaceProps, Tag, Text, useColorModeValue } from '@chakra-ui/react';
import { ArticleListItemType } from '@/types';

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

const Author: FunctionComponent<AuthorProps> = ({ category, date }) => {
  const name = 'Shiba';

  return (
    <HStack marginTop="2" spacing="2" display="flex" alignItems="center" justifyContent='flex-end'>
      {category && (
        <>
          <Text>{category}</Text>
          <Text>|</Text>
        </>
      )}
      <Text>{date.toLocaleDateString()}</Text>
    </HStack>    
  );
}

const ArticleEntry: FunctionComponent<ArticleEntryProps> = ({ entry }) => {
  const {
    node: {
      slug,
      frontmatter
    },
  } = entry;

  const { category, date, summary, title, tags } = frontmatter;

  return (
    <Box
      marginTop={{ base: '1', sm: '5' }}
      display="flex"
      flexDirection={{ base: 'column', sm: 'row' }}
      justifyContent="space-between"
    >
      <Box 
        display="flex" 
        flex="1" 
        flexDirection="column" 
        justifyContent="center" 
        marginTop={{ base: '3', sm: '0' }}
      >
        <Heading marginTop="1">
          <Link as={GatsbyLink} to={`/article/${slug}`} textDecoration="none" _hover={{ textDecoration: 'none' }}>
            {title}
          </Link>
        </Heading>
        <Text
          as="p"
          marginTop="2"
          color={useColorModeValue('gray.700', 'gray.200')}
          fontSize="lg">
          {summary}
        </Text>
        <Tags tags={tags} />        
        <Author date={new Date(date)} category={category} />
      </Box>
    </Box>
  );
};

const ArticleList: FunctionComponent<ArticleListProps> = ({ entries }) => {
  return (
    <Container maxW={'7xl'} p="12">
      {entries.map((entry) => (
        <ArticleEntry entry={entry} key={entry.node.id} />
      ))}
    </Container>
  );
};

export default ArticleList;
