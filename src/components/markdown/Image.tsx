import React, { FunctionComponent } from 'react';
import { Box, Image as ChakraImage } from '@chakra-ui/react';

interface ImageProps {
  src: string;
  alt?: string;
  className?: string;
}

const videos = ['avi', 'mp4', 'mpeg', 'mpg', 'webm'];

const Image: FunctionComponent<ImageProps> = ({ src, alt, ...props }) => {
  if (props.className === 'gatsby-resp-image-image') {
    return <ChakraImage src={src} alt={alt || ''} {...props} />;
  }

  const ext = src.split('.').pop() || '';

  return (
    <figure>
      <Box maxW={1000} mx={'auto'}>
        {videos.includes(ext) ? (
          <video
            controls
            style={{
              width: '100%',
              height: 'auto',
            }}
          >
            <source src={src} type="video/mp4" />
          </video>
        ) : (
          <ChakraImage src={src} alt={alt || ''} loading={'lazy'} mx={'auto'} />
        )}
      </Box>
      {alt && <figcaption style={{ textAlign: 'center', marginBottom: '1rem' }}>{alt}</figcaption>}
    </figure>
  );
};

export default Image;