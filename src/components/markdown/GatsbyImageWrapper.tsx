import React, { FunctionComponent } from 'react';

interface GatsbyImageWrapperProps {
  style: any;
  children: React.ReactElement[];
}

const GatsbyImageWrapper: FunctionComponent<GatsbyImageWrapperProps> = (props) => {
  console.log(props);

  return (
    <figure style={props.style}>
      {props.children}
    </figure>
  );
};

export default GatsbyImageWrapper;