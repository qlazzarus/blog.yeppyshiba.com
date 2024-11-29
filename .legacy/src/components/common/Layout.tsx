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
  disableFooter?: boolean;
};

const defaultImages = ['/images/header/wp7317693-jeju-wallpapers.jpg'];

const Layout: FunctionComponent<LayoutProps> = ({ title, image, description, category, date, keywords, children, disableFooter }) => {
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
  const headerTitle = title && `${title} | ${siteMetadata.title}` || siteMetadata.title;

  return (
    <>
      <Helmet>
        <title>{headerTitle}</title>
        <html lang={"ko"} />
        <meta charSet={'utf-8'} />
        <meta name={"google-site-verification"} content={"ohPHiE_9eeqdqrBocR0kiZSIVjMYr-mdJdZd42aJ6qY"} />
        <meta name={"naver-site-verification"} content={"883ab3268ddfbf355cc7279ac767ace442bc0bf5"} />
        <meta name={'description'} content={description ?? siteMetadata.description} />
        <meta name={'author'} content={siteMetadata.title} />
        {keywords && <meta name={'keywords'} content={keywords.join(', ')} />}
        {date && <meta name={'date'} content={date} />}
        <meta property={"og:type"} content={'blog'} />
        <meta property={"og:title"} content={headerTitle} />
        <meta property={"og:image"} content={headerImage} />
        <meta property={"og:description"} content={description ?? siteMetadata.description} />
        <meta property={"og:site_name"} content={siteMetadata.title} />
        <meta property={"og:locale"} content={'ko_KR'} />
        <meta name={"twitter:card"} content="summary" />
        <meta name={"twitter:title"} content={headerTitle} />
        <meta name={"twitter:description"} content={description ?? siteMetadata.description} />
        <meta name={"twitter:image"} content={headerImage} />
        <link rel={'icon'} type={'image/png'} href={'/akita-inu.png'} />
      </Helmet>
      <Navigation siteMetadata={siteMetadata} />
      <Container as={'main'} maxWidth={'100%'} minHeight={'100vh'} m={'0'} px={'0'} pt={LayoutConstants.navigationHeight}>
        {children}        
      </Container>
      {!disableFooter && <Footer siteMetadata={siteMetadata} />}
    </>
  );
};

export default Layout;
