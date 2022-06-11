import React, { FunctionComponent } from 'react';
import { Heading as ChakraHeading } from '@chakra-ui/react';
import { slugify } from 'transliteration';

const allowedChars = 'a-zA-Z0-9';

interface HeadingProps {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    children: string;
}

const Heading: FunctionComponent<HeadingProps> = ({ level, children }) => {
    const sizes = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const id = slugify(children, { allowedChars });
  
    return <ChakraHeading my={4} as={`h${level}`} size={sizes[level - 1]} id={id}>{children}</ChakraHeading>;
};

export default Heading;
