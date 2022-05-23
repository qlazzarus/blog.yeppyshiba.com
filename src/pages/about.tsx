import React, { FunctionComponent } from 'react';
import { Header, Layout } from '@/components/common';
import { Box, Container, Heading, HStack, Tag, Text } from '@chakra-ui/react';
import { Link as GatsbyLink } from 'gatsby';
import { StaticImage } from 'gatsby-plugin-image';
import { kebabCase } from 'lodash';

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
          <Heading as={'h2'}>우리는!</Heading>
          <HStack mx={'auto'} my={8} maxW={'xs'}>
            <Box width={'50%'} borderRadius={'full'} overflow={'hidden'} boxShadow={'2xl'}>
              <StaticImage src={shibaImage} alt={''} layout={'fullWidth'} />
            </Box>
            <Box width={'50%'} borderRadius={'full'} overflow={'hidden'} boxShadow={'2xl'}>
              <StaticImage src={yeppyImage} alt={''} layout={'fullWidth'} />
            </Box>
          </HStack>
          <Text>
            제주에서 사는 개발자입니다.
            <br />
            현재는 여자친구(예비신부) 님과 행복하게 제주에서 생활하고
            <br />
            또한 공동으로 블로그를 운영하고 있어요. 공부 그리고 생활 관심사들을 같이 올리겠습니다.
          </Text>
        </Box>
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
                  to={`/tag/${kebabCase(tag)}`}
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
