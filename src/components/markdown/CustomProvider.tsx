import React, { FunctionComponent } from 'react';
import {
  chakra,
  Code,
  Divider,
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
import CodeBlock from './CodeBlock';
import FootnoteWrapper from './FootnoteWrapper';
import Heading from './Heading';
import Image from './Image';
import Link from './Link';

const MdxProviderComponents: MDXProviderComponents = {
  p: (props: any) => (props) => {
    props.children.each((child: any, index: number) => {
      if (child.props.className === "gatsby-resp-image-wrapper") {
        console.log('MDXProvider - ', child, index);
      }
    });
    /*
    node: Partial<ReactHTMLElement<HTMLParagraphElement>["props"]>
    

    
  let className = ''

  if(
    node.children
    &&
    (
      ((node.children as any)[0] && (node.children as any)[0].props && (node.children as any)[0].props.className === 'gatsby-resp-image-wrapper')
      ||
      ((node.children as any).props && (node.children as any).props.className === 'gatsby-resp-image-wrapper')
    )
  ){
    className = "full-width"
  }

  return <p {...node} className={className} />    
    */
    
    return <Text my={4} {...props} />
  },
  h1: (props: any) => <Heading level={1} {...props} />,
  h2: (props: any) => <Heading level={2} {...props} />,
  h3: (props: any) => <Heading level={3} {...props} />,
  h4: (props: any) => <Heading level={4} {...props} />,
  h5: (props: any) => <Heading level={5} {...props} />,
  h6: (props: any) => <Heading level={6} {...props} />,
  hr: (props: any) => <Divider {...props} />,
  pre: (props: any) => <chakra.pre {...props} maxW={'100%'} overflowX="auto" />,
  blockquote: (props: any) => <Code as={'blockquote'} p={2} {...props} />,
  code: CodeBlock,
  a: Link,
  ol: (props: any) => <OrderedList {...props} />,
  ul: (props: any) => <UnorderedList {...props} />,
  li: (props: any) => <ListItem {...props} />,
  table: (props: any) => <Table {...props} />,
  tbody: (props: any) => <Tbody {...props} />,
  thead: (props: any) => <Thead {...props} />,
  tr: (props: any) => <Tr {...props} />,
  td: (props: any) => <Td {...props} />,
  th: (props: any) => <Th {...props} />,
  em: (props: any) => <Text as={'em'} {...props} />,
  strong: (props: any) => <Text as={'strong'} {...props} />,
  delete: (props: any) => <Text as={'del'} {...props} />,
  inlineCode: (props: any) => <Text as={'kbd'} {...props} />,
  thematicBreak: (props: any) => <Divider orientation={'vertical'} {...props} />,
  img: Image,
  wrapper: ({ children }) => {
    if (!children) {
      return <></>;
    }

    const updatedChildren = children.map((child: any, index: number) => {
      if (child.props.className === "footnotes") {
        return <FootnoteWrapper key={index} {...child.props} />;
      }

      return child;
    });

    return <>{updatedChildren}</>;
  }
};

type CustomProviderProps = {
  children: React.ReactNode;
};

const CustomProvider: FunctionComponent<CustomProviderProps> = ({ children }) => {
  return <MDXProvider components={MdxProviderComponents}>{children}</MDXProvider>;
};

export default CustomProvider;
