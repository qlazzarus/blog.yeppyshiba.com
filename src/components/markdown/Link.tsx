import React, { FunctionComponent }  from 'react';
import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as GatsbyLink } from 'gatsby';
import { Layout } from '@/constants';
import { ThemeEnum } from '@/enums';

type LinkProp = {
    href: string;
    children: React.ReactNode;
    className?: string
};

const Link: FunctionComponent<LinkProp> = ({ children, className, href, ...props }) => {
    const internal = /^\/(?!\/)/.test(href);
    let isExternal = !internal;
    
    if (className === 'footnote-ref' || className === 'footnote-backref') {
        isExternal = false;
    }
    
    if (internal) {
        return (
            <ChakraLink 
                to={href}
                as={GatsbyLink}
                color={ThemeEnum.LINK_COLOR} 
                {...props}>
                {children}
            </ChakraLink>
        )
    }

    return (
        <ChakraLink 
            color={ThemeEnum.LINK_COLOR} 
            href={href}
            isExternal={isExternal}
            {...props}>
            {children}
        </ChakraLink>
    )
}

export default Link;
