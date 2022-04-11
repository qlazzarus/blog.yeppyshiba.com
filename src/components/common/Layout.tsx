import React, { FunctionComponent, ReactNode } from 'react';
import { Helmet } from 'react-helmet';
import { useStaticQuery, graphql } from 'gatsby';
import { Container } from '@chakra-ui/react';
import { Layout as LayoutConstants } from '@/constants';
import Footer from './Footer';
import Navigation from './Navigation';

type LayoutProps = {
  title?: string;
  children?: ReactNode | ReactNode[];
};

const Layout: FunctionComponent<LayoutProps> = ({ title, children }) => {
  const {
    site: { siteMetadata },
  } = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          title
        }
      }
    }
  `);

  return (
    <>
      <Helmet title={title ?? siteMetadata.title} />
      <Navigation siteMetadata={siteMetadata} />
      <Container as={'main'} maxWidth={'100%'} m={'0'} px={'0'} pt={LayoutConstants.navigationHeight}>
        {children}
      </Container>
      <Footer siteMetadata={siteMetadata} />
    </>
  );
};

export default Layout;
