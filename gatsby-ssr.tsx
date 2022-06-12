import React from 'react';

export const onRenderBody = ({ setHeadComponents }, pluginOptions) => {
  setHeadComponents([
    <script
      key={'kakao-script'}
      src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.GATSBY_KAKAO_API}&libraries=services,clusterer`}
    />,
  ]);
};