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
import React, { createElement } from 'react';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';

type GetCoreProps = {
  children?: React.ReactNode;
  'data-sourcepos'?: any;
};

function getCoreProps(props: GetCoreProps): any {
  return props['data-sourcepos']
    ? { 'data-sourcepos': props['data-sourcepos'] }
    : {};
}

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

const processor = unified().use(rehypeReact, {
  createElement,
  components: {
    p: (props: any) => <Text my={4} {...props} />,
    em: (props: any) => <Text as={'em'} {...props} />,
    blockquote: (props: any) => <Code as={'blockquote'} p={2} {...props} />,
    code: (props: any) => {
      const { inline } = props;
      console.log(props);

      //if (inline) {
        return <Code p={2} {...props} />;
      //}

      return (
        <Code 
          whiteSpace={"break-spaces"}
          d={'block'}
          w={'full'}
          p={2}
          {...props}
        />
      );
    },
    h1: (props: any) => <Heading {...props} level={1} />,
    h2: (props: any) => <Heading {...props} level={2} />,
    h3: (props: any) => <Heading {...props} level={3} />,
    h4: (props: any) => <Heading {...props} level={4} />,
    h5: (props: any) => <Heading {...props} level={5} />,
    h6: (props: any) => <Heading {...props} level={6} />,
    pre: (props: any) => <chakra.pre {...props} maxW="100%" overflowX="auto" />,
    ol: (props: any) => <OrderedList {...props} />,
    ul: (props: any) => <UnorderedList {...props} />,
    li: (props: any) => <ListItem {...props} />,
    hr: (props: any) => <Divider {...props} />,
    table: (props: any) => <Table {...props} />,
    tbody: (props: any) => <Tbody {...props} />,
    thead: (props: any) => <Thead {...props} />,
    tr: (props: any) => <Tr {...props} />,
    td: (props: any) => <Td {...props} />,
  },
});

export const RenderAst = (ast: any): JSX.Element => {
  return processor.stringify(ast) as unknown as JSX.Element;
};

export default function RenderHtml({ htmlAst }: { htmlAst: any }): JSX.Element {
  return RenderAst(htmlAst);
}
