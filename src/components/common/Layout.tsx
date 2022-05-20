import React, { FunctionComponent, ReactNode } from 'react';
import { Helmet } from 'react-helmet';
import { useStaticQuery, graphql } from 'gatsby';
import { Container } from '@chakra-ui/react';
import { Layout as LayoutConstants } from '@/constants';
import { MathUtil } from '@/utils';
import Footer from './Footer';
import Navigation from './Navigation';

type LayoutProps = {
  title?: string;
  image?: string;
  description?: string;
  category?: string;
  date?: string;
  keywords?: string[];
  children?: ReactNode | ReactNode[];
};

const defaultImages = ['/images/header/wp7317693-jeju-wallpapers.jpg'];

const Layout: FunctionComponent<LayoutProps> = ({ title, image, description, category, date, keywords, children }) => {
  const {
    site: { siteMetadata },
  } = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          title
          description
          siteUrl
        }
      }
    }
  `);

  const headerImage = image || MathUtil.getRandomValue(defaultImages);

  return (
    <>
      <Helmet>
        <meta charSet={'utf-8'} />
        <title>{title ?? siteMetadata.title}</title>
        <link rel={'icon'} type={'image/png'} href={'/akita-inu.png'} />
        <meta name={'description'} content={description ?? siteMetadata.description} />
        <meta name={'author'} content={siteMetadata.title} />
        {keywords && <meta name={'keywords'} content={keywords.join(', ')} />}
        {date && <meta name={'date'} content={date} />}
        <meta property="og:type" content={'blog'} />
        <meta property="og:title" content={title ?? siteMetadata.title} />
        <meta property="og:image" content={headerImage} />
        <meta property="og:description" content={description ?? siteMetadata.description} />
        <meta property="og:site_name" content={siteMetadata.title} />
        <meta property="og:locale" content={'ko_KR'} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title ?? siteMetadata.title} />
        <meta name="twitter:description" content={description ?? siteMetadata.description} />
        <meta name="twitter:image" content={headerImage} />
      </Helmet>
      <Navigation siteMetadata={siteMetadata} />
      <Container as={'main'} maxWidth={'100%'} m={'0'} px={'0'} pt={LayoutConstants.navigationHeight}>
        {children}
      </Container>
      <Footer siteMetadata={siteMetadata} />
    </>
  );
};

export default Layout;
