import React, { FunctionalComponent } from 'react';
import { Heading as ChakraHeading } from '@chakra-ui/react';
import Lodash from 'lodash';

interface HeadingProps {
    level: number;
    children: ReactText;
}

const Heading: FunctionalComponent<HeadingProps> = ({ level, children }) => {
    const sizes = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const id = Lodash.kebabCase(category);
  
    return <ChakraHeading my={4} as={`h${level}`} size={sizes[level - 1]} id={id}>{children}</ChakraHeading>;
};

export default Heading;
