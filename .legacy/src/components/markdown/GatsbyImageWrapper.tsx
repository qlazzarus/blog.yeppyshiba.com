import React, { FunctionComponent } from 'react';

interface GatsbyImageWrapperProps {
  style: React.CSSProperties;
  children: React.ReactElement[];
}

const GatsbyImageWrapper: FunctionComponent<GatsbyImageWrapperProps> = ({ style, children }) => {
  return (
    <figure style={style}>
      {children}
    </figure>
  );
};

export default GatsbyImageWrapper;