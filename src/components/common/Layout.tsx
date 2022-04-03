import React, { FunctionComponent, ReactNode } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'gatsby';

type LayoutProps = {
    title: string,
    children?: ReactNode | ReactNode[]
};

const Layout: FunctionComponent<LayoutProps> = ({ title, children }) => {
    return (
        <>
            {children}
        </>
    );
}

export default Layout;