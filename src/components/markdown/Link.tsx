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

    /*
    if (className === 'footnote-ref' || className === 'footnote-backref') {
        console.log({children});
    }
    */
    
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
            isExternal
            {...props}>
            {children}
        </ChakraLink>
    )
}

export default Link;
