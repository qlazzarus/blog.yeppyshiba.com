import React, { FunctionComponent } from 'react';
import {
  chakra,
  Code,
  Divider,
  Heading as ChakraHeading,
  ListItem,
  OrderedList,
  Table,
  Tbody,
  Td,
  Text,
  Th,  
  Thead,
  Tr,
  UnorderedList,
} from '@chakra-ui/react';
import { MDXProvider, MDXProviderComponents } from '@mdx-js/react';

/*
TODO
- thematicBreak -> Thematic break
- em -> Emphasis
- strong -> Strong
- delete -> Delete
- inlineCode -> Inline Code
- a -> Link
- img -> Image
*/

const Heading = (props: any) => {
  const sizes = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const level: number = props.level;

  return (
    <ChakraHeading
      my={4}
      as={`h${level}`}
      size={sizes[level - 1]}
      {...props}
    />
  );
};

const MdxProviderComponents: MDXProviderComponents = {
  p: (props: any) => <Text my={4} {...props} />,
  h1: (props: any) => <Heading level={1} {...props} />,
  h2: (props: any) => <Heading level={2} {...props} />,
  h3: (props: any) => <Heading level={3} {...props} />,
  h4: (props: any) => <Heading level={4} {...props} />,
  h5: (props: any) => <Heading level={5} {...props} />,
  h6: (props: any) => <Heading level={6} {...props} />,
  hr: (props: any) => <Divider {...props} />,
  pre: (props: any) => <chakra.pre {...props} maxW="100%" overflowX="auto" />,
  blockquote: (props: any) => <Code as={'blockquote'} p={2} {...props} />,
  code: (props: any) => <Code whiteSpace={"break-spaces"} d={'block'} w={'full'} p={2} {...props} />,
  ol: (props: any) => <OrderedList {...props} />,
  ul: (props: any) => <UnorderedList {...props} />,
  li: (props: any) => <ListItem {...props} />,  
  table: (props: any) => <Table {...props} />,
  tbody: (props: any) => <Tbody {...props} />,
  thead: (props: any) => <Thead {...props} />,
  tr: (props: any) => <Tr {...props} />,
  td: (props: any) => <Td {...props} />,
  th: (props: any) => <Th {...props} />,
};

type ChakraMdxProviderProps = {
  children: React.ReactNode;
};

const ChakraMdxProvider: FunctionComponent<ChakraMdxProviderProps> = ({ children }) => {
  return (
    <MDXProvider components={MdxProviderComponents}>
      {children}
    </MDXProvider>
  );
};

export default ChakraMdxProvider;
