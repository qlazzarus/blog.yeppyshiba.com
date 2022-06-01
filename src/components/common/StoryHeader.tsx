import React, { FunctionComponent } from 'react';
import { Box, Heading, Stack, Text } from '@chakra-ui/react';

const StoryHeader: FunctionComponent<{ title: string; }> = ({ title }) => {
  return (
    <Stack as={Box} textAlign={'center'} spacing={{ base: 8, md: 14 }} pt={{ base: 20, md: 36 }}>
      <Heading fontWeight={600} fontSize={{ base: '2xl', sm: '4xl', md: '6xl' }} lineHeight={'110%'}>
        {title} <br />
        <Text as={'span'} color={'green.400'}>
          Stories
        </Text>
      </Heading>
    </Stack>
  );
};

export default StoryHeader;