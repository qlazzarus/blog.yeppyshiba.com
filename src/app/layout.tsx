import React, { Children } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: '',
    description: ''
}

const RootLayout = ({
    children,
}: Readonly<{
    children: React.ReactNode
}>) => {
    return (
        <html>
            <body>
                {children}
            </body>
        </html>
    )
}

export default RootLayout