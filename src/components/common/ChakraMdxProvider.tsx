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
  Thead,
  Tr,
  UnorderedList,
} from '@chakra-ui/react';
import { MDXProvider, MDXProviderComponents } from '@mdx-js/react';

const Heading = (props: any) => {
  const { children } = props;
  const sizes = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const level: number = props.level;

  return (
    <ChakraHeading
      my={4}
      as={`h${level}`}
      size={sizes[level - 1]}
      {...getCoreProps(props)}
    >
      {children}
    </ChakraHeading>
  );
};

const MdxProviderComponents: MDXProviderComponents = {
  p: (props: any) => <Text my={4} {...props} />,
  h1: (props: any) => <Heading {...props} level={1} />,
  h2: (props: any) => <Heading {...props} level={2} />,
  h3: (props: any) => <Heading {...props} level={3} />,
  h4: (props: any) => <Heading {...props} level={4} />,
  h5: (props: any) => <Heading {...props} level={5} />,
  h6: (props: any) => <Heading {...props} level={6} />,  
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
