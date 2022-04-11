import React, { FunctionComponent }  from 'react';
import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as GatsbyLink } from 'gatsby';

type LinkProp = {
    href: string;
    children: React.ReactNode;
};

const Link: FunctionComponent<LinkProp> = ({ children, href, ...props }) => {
    const internal = /^\/(?!\/)/.test(href);
    
    if (internal) {
        return (
            <ChakraLink 
                to={href}
                as={GatsbyLink}
                color={'brand.300'} 
                {...props}>
                {children}
            </ChakraLink>
        )
    }

    return (
        <ChakraLink 
            color={'brand.300'} 
            href={href}
            {...props}>
            {children}
        </ChakraLink>
    )
}

export default Link;