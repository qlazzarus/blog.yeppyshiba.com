import React from 'react';
import type { GatsbyBrowser } from 'gatsby';
import { ModalProvider } from './src/context/ModalContext';
import './static/css/figcaption.css';

export const wrapRootElement: GatsbyBrowser['wrapRootElement'] = ({ element }) => {
    return <ModalProvider>{element}</ModalProvider>;
};