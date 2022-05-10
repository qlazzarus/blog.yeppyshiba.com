import React, { FunctionComponent }  from 'react';
import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as GatsbyLink } from 'gatsby';
import { ThemeEnum } from '@/enums';
import { useDisclosure } from '@chakra-ui/react';
//import { useModal } from '@/hooks';

type LinkProp = {
    href: string;
    children: React.ReactNode;
    className?: string
};

const Link: FunctionComponent<LinkProp> = ({ children, className, href, ...props }) => {
    const internal = /^\/(?!\/)/.test(href);
    let isExternal = !internal;

    if (className === 'footnote-backref') {
        return <></>;
    }
    
    if (className === 'footnote-ref') {
        const id = href.replace('#', '');
        //const { onOpen } = ;
        const onOpen = () => {};
        //const context = useModal(id);
        
        return (
            <ChakraLink 
                onClick={onOpen}
                color={ThemeEnum.LINK_COLOR} 
                {...props}>
                {children}
            </ChakraLink>
        );
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
        );
    }

    return (
        <ChakraLink 
            color={ThemeEnum.LINK_COLOR} 
            href={href}
            isExternal={isExternal}
            {...props}>
            {children}
        </ChakraLink>
    );
}

export default Link;
