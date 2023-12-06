import React, { FunctionComponent } from 'react';
import { Box, Container, Heading, HStack, Tag, Text } from '@chakra-ui/react';
import { Link as GatsbyLink } from 'gatsby';
import { StaticImage } from 'gatsby-plugin-image';
import { Header, Layout } from '@/components/common';
import { StringUtil } from '@/utils';

const shibaImage = './../../static/images/posts/202205/2f7771ce0890332c248a4b48be2e2f05.jpeg';
const yeppyImage = './../../static/images/posts/202205/KakaoTalk_Photo_2022-05-23-18-13-27.jpeg';
const tags = ['jeju', 'php', 'typescript', 'web game', 'phaser', 'roblox'];

const AboutPage: FunctionComponent = () => {
  const title = 'Yeppyshiba is...';

  return (
    <Layout title={title}>
      <Header title={title} />
      <Container maxW={'7xl'} p={'12'} textAlign={'center'}>
        <Box my={8}>
          <Heading as={'h2'}>지금 관심사인 것들!</Heading>
          <Box mx={'auto'} my={8} maxW={'xs'} overflow={'hidden'}>
            {tags &&
              Array.isArray(tags) &&
              tags.map((tag) => (
                <Tag
                  display={'block'}
                  float={'left'}
                  key={tag}
                  bgColor={'teal'}
                  variant={'solid'}
                  as={GatsbyLink}
                  to={`/tag/${StringUtil.slugify(tag)}`}
                  pt={1}
                  m={1}
                >
                  {tag}
                </Tag>
              ))}
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default AboutPage;
