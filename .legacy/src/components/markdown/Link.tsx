import React, { FunctionComponent } from 'react';
import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as GatsbyLink } from 'gatsby';
import { ThemeEnum } from '@/enums';
import { useModalDispatch } from '@/hooks';

type LinkProp = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

const Link: FunctionComponent<LinkProp> = ({ children, className, href, ...props }) => {
  let isExternal = /^([a-zA-Z]{2,20}):\/\/.+/.test(href);
  let isInternal = !isExternal;

  if (className === 'footnote-backref') {
    return <></>;
  }

  if (className === 'footnote-ref') {
    const id = href.replace('#', '');
    const dispatch = useModalDispatch();

    const onOpen = () => {
      dispatch({
        type: 'OPEN',
        id,
      });
    };

    return (
      <ChakraLink onClick={onOpen} color={ThemeEnum.LINK_COLOR} {...props}>
        {children}
      </ChakraLink>
    );
  }
  
  if (href.startsWith('#')) {
    isInternal = false;
    isExternal = false;
  }

  if (isInternal) {
    return (
      <ChakraLink to={href} as={GatsbyLink} color={ThemeEnum.LINK_COLOR} {...props}>
        {children}
      </ChakraLink>
    );
  }

  return (
    <ChakraLink color={ThemeEnum.LINK_COLOR} href={href} isExternal={isExternal} {...props}>
      {children}
    </ChakraLink>
  );
};

export default Link;
