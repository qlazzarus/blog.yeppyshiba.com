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

const MdxProviderComponents: MDXProviderComponents = {
  p: (props: any) => <Text my={4} {...props} />,
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
