import React, { FunctionComponent, ReactNode } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'gatsby';
import Navigation from './Navigation';

type LayoutProps = {
    title: string,
    children?: ReactNode | ReactNode[]
};

const Layout: FunctionComponent<LayoutProps> = ({ title, children }) => {
    return (
        <>
            <Navigation />
            {children}
        </>
    );
}

export default Layout;