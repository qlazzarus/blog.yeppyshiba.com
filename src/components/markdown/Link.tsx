import React, { FunctionComponent }  from 'react';
import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as GatsbyLink } from 'gatsby';

type LinkProp = {
    href: string;
    children: React.ReactNode;
};

const Link: FunctionComponent<LinkProp> = ({ children, href, ...props }) => {
    const internal = /^\/(?!\/)/.test(href);
    const color = 'teal.500';
    
    if (internal) {
        return (
            <ChakraLink 
                to={href}
                as={GatsbyLink}
                color={color} 
                {...props}>
                {children}
            </ChakraLink>
        )
    }

    return (
        <ChakraLink 
            color={color} 
            href={href}
            isExternal
            {...props}>
            {children}
        </ChakraLink>
    )
}

export default Link;
